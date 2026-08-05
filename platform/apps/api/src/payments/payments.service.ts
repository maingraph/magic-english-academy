import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException
} from "@nestjs/common";
import { PaymentStatus, Prisma } from "@prisma/client";
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { AlfaClient, AlfaConfigurationError, AlfaRequestError } from "./alfa.client";
import {
  appendPaymentToken,
  MAGIC_PLAN,
  PaymentValidationError,
  paymentStatusFromAlfa,
  publicPaymentMessage,
  type CreatePaymentPayload,
  validatePaymentPayload
} from "./payments.utils";

const publicSelect = {
  publicToken: true,
  orderNumber: true,
  status: true,
  amountMinor: true,
  currency: true,
  customerEmail: true,
  formUrl: true,
  paidAt: true,
  fulfilledAt: true,
  createdAt: true
} satisfies Prisma.PaymentOrderSelect;

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(AlfaClient) private readonly alfa: AlfaClient
  ) {}

  async create(payload: CreatePaymentPayload) {
    let input;
    try {
      input = validatePaymentPayload(payload);
    } catch (error) {
      if (error instanceof PaymentValidationError) throw new BadRequestException(error.message);
      throw error;
    }

    const existing = await this.prisma.paymentOrder.findUnique({
      where: { idempotencyKey: input.idempotencyKey },
      select: publicSelect
    });
    if (existing) return this.createResponse(existing);

    const publicToken = randomUUID();
    const orderNumber = `ME-${Date.now().toString(36)}-${randomBytes(4).toString("hex")}`;
    let order;
    try {
      order = await this.prisma.paymentOrder.create({
        data: {
          publicToken,
          idempotencyKey: input.idempotencyKey,
          orderNumber,
          productCode: MAGIC_PLAN.code,
          productName: MAGIC_PLAN.name,
          amountMinor: MAGIC_PLAN.amountMinor,
          currency: MAGIC_PLAN.currency,
          customerName: input.name,
          customerEmail: input.email,
          customerPhone: input.phone,
          customerSocial: input.social,
          consentAt: new Date()
        }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const concurrent = await this.prisma.paymentOrder.findUnique({
          where: { idempotencyKey: input.idempotencyKey },
          select: publicSelect
        });
        if (concurrent) return this.createResponse(concurrent);
      }
      throw error;
    }

    try {
      const registration = await this.alfa.registerOrder({
        orderNumber: order.orderNumber,
        customerEmail: order.customerEmail,
        returnUrl: appendPaymentToken(
          process.env.ALFA_RETURN_URL ?? "https://magic-english-plan.by/payment/success",
          order.publicToken
        ),
        failUrl: appendPaymentToken(
          process.env.ALFA_FAIL_URL ?? "https://magic-english-plan.by/payment/failed",
          order.publicToken
        )
      });
      const registered = await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          providerOrderId: registration.orderId,
          formUrl: registration.formUrl,
          status: "PENDING"
        },
        select: publicSelect
      });
      return this.createResponse(registered);
    } catch (error) {
      const configurationError = error instanceof AlfaConfigurationError;
      await this.prisma.paymentOrder.update({
        where: { id: order.id },
        data: {
          status: "ERROR",
          providerErrorCode: configurationError ? "CONFIGURATION" : "REGISTRATION_FAILED",
          providerErrorMessage: error instanceof Error ? error.message.slice(0, 500) : "Unknown provider error"
        }
      });
      if (configurationError) throw new ServiceUnavailableException("Онлайн-оплата временно не настроена");
      throw new BadGatewayException("Банк временно не зарегистрировал платёж");
    }
  }

  async status(publicToken: string) {
    let order = await this.prisma.paymentOrder.findUnique({ where: { publicToken } });
    if (!order) throw new NotFoundException("Платёж не найден");
    const stale = !order.lastCheckedAt || Date.now() - order.lastCheckedAt.getTime() > 5_000;
    if (order.status === "PENDING" && order.providerOrderId && stale) {
      order = await this.refresh(order.id, false);
    }
    return this.publicStatus(order);
  }

  async list(status?: string, email?: string) {
    const normalizedStatus = status?.trim().toUpperCase();
    if (normalizedStatus && !Object.values(PaymentStatus).includes(normalizedStatus as PaymentStatus)) {
      throw new BadRequestException("Неизвестный статус платежа");
    }
    return {
      orders: await this.prisma.paymentOrder.findMany({
        where: {
          ...(normalizedStatus ? { status: normalizedStatus as PaymentStatus } : {}),
          ...(email?.trim() ? { customerEmail: { contains: email.trim(), mode: "insensitive" } } : {})
        },
        orderBy: { createdAt: "desc" },
        take: 200
      })
    };
  }

  async adminRefresh(id: string) {
    const order = await this.refresh(id, true);
    return this.publicStatus(order);
  }

  async setFulfilled(id: string, fulfilled: boolean) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Платёж не найден");
    if (fulfilled && order.status !== "PAID") {
      throw new ConflictException("Сначала подтвердите оплату через Альфа-Банк");
    }
    return this.prisma.paymentOrder.update({
      where: { id },
      data: { fulfilledAt: fulfilled ? new Date() : null }
    });
  }

  async reconcile(authorization?: string) {
    const secret = process.env.CRON_SECRET;
    if (!secret || secret.length < 16 || authorization !== `Bearer ${secret}`) {
      throw new UnauthorizedException("Invalid cron authorization");
    }
    const orders = await this.prisma.paymentOrder.findMany({
      where: {
        status: "PENDING",
        providerOrderId: { not: null },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        OR: [
          { lastCheckedAt: null },
          { lastCheckedAt: { lt: new Date(Date.now() - 2 * 60 * 1000) } }
        ]
      },
      orderBy: { createdAt: "asc" },
      take: 20,
      select: { id: true }
    });
    let refreshed = 0;
    for (const order of orders) {
      try {
        await this.refresh(order.id, false);
        refreshed += 1;
      } catch {
        // Leave pending orders retryable; admin queue exposes unresolved payments.
      }
    }
    return { scanned: orders.length, refreshed };
  }

  private async refresh(id: string, strict: boolean) {
    const order = await this.prisma.paymentOrder.findUnique({ where: { id } });
    if (!order) throw new NotFoundException("Платёж не найден");
    if (!order.providerOrderId) {
      if (strict) throw new ConflictException("Платёж не зарегистрирован в Альфа-Банке");
      return order;
    }
    try {
      const provider = await this.alfa.getOrderStatus(order.providerOrderId);
      const nextStatus = paymentStatusFromAlfa(provider.orderStatus);
      return await this.prisma.paymentOrder.update({
        where: { id },
        data: {
          status: nextStatus,
          providerStatus: provider.orderStatus,
          providerErrorCode: provider.errorCode,
          providerErrorMessage: provider.errorMessage,
          lastCheckedAt: new Date(),
          ...(nextStatus === "PAID" && !order.paidAt ? { paidAt: new Date() } : {})
        }
      });
    } catch (error) {
      if (strict || error instanceof AlfaConfigurationError) {
        if (error instanceof AlfaConfigurationError) throw new ServiceUnavailableException("Онлайн-оплата не настроена");
        if (error instanceof AlfaRequestError) throw new BadGatewayException("Не удалось проверить платёж в банке");
        throw error;
      }
      return this.prisma.paymentOrder.update({
        where: { id },
        data: { lastCheckedAt: new Date() }
      });
    }
  }

  private createResponse(order: Prisma.PaymentOrderGetPayload<{ select: typeof publicSelect }>) {
    if (!order.formUrl) {
      if (order.status === "ERROR") throw new ConflictException("Предыдущая попытка регистрации платежа завершилась ошибкой");
      throw new ConflictException("Платёж ещё регистрируется");
    }
    return {
      payment: this.publicStatus(order),
      formUrl: order.formUrl
    };
  }

  private publicStatus(order: {
    publicToken: string;
    orderNumber: string;
    status: PaymentStatus;
    amountMinor: number;
    currency: string;
    customerEmail: string;
    paidAt: Date | null;
    fulfilledAt: Date | null;
    createdAt: Date;
  }) {
    return {
      token: order.publicToken,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      amountMinor: order.amountMinor,
      currency: order.currency,
      email: order.customerEmail,
      paidAt: order.paidAt,
      fulfilled: Boolean(order.fulfilledAt),
      createdAt: order.createdAt,
      message: publicPaymentMessage(order.status, Boolean(order.fulfilledAt))
    };
  }
}
