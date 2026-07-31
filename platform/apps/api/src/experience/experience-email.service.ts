import { BadRequestException, Inject, Injectable, ServiceUnavailableException } from "@nestjs/common";
import type { NotificationDeliveryStatus, Prisma } from "@prisma/client";
import { Resend } from "resend";
import { PrismaService } from "../prisma/prisma.service";

type WebhookHeaders = {
  id?: string;
  timestamp?: string;
  signature?: string;
};

const eventStatus: Record<string, NotificationDeliveryStatus> = {
  "email.sent": "SENT",
  "email.delivered": "DELIVERED",
  "email.opened": "OPENED",
  "email.clicked": "CLICKED",
  "email.delivery_delayed": "DELAYED",
  "email.bounced": "BOUNCED",
  "email.failed": "FAILED",
  "email.complained": "COMPLAINED",
  "email.suppressed": "SUPPRESSED"
};

@Injectable()
export class ExperienceEmailService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async sendDelivery(deliveryId: string) {
    const delivery = await this.prisma.emailDelivery.findUniqueOrThrow({
      where: { id: deliveryId }
    });
    if (["SENT", "DELIVERED", "OPENED", "CLICKED"].includes(delivery.status)) {
      return delivery;
    }

    const apiKey = process.env.RESEND_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      throw new ServiceUnavailableException("Resend is not configured");
    }

    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send(
      {
        from,
        to: delivery.recipient,
        subject: delivery.subject,
        html: `<div style="font-family:Montserrat,Arial,sans-serif;line-height:1.6;color:#17140f"><h2>${this.escape(delivery.subject)}</h2><p>${this.escape(delivery.body)}</p></div>`
      },
      { idempotencyKey: delivery.idempotencyKey }
    );

    if (error || !data?.id) {
      await this.prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: "FAILED", lastEventAt: new Date() }
      });
      throw new ServiceUnavailableException(error?.message ?? "Email provider returned no id");
    }

    return this.prisma.emailDelivery.update({
      where: { id: delivery.id },
      data: { providerId: data.id, status: "SENT", lastEventAt: new Date() }
    });
  }

  async processWebhook(rawBody: Buffer | undefined, headers: WebhookHeaders) {
    if (!rawBody || !headers.id || !headers.timestamp || !headers.signature) {
      throw new BadRequestException("Missing signed webhook payload");
    }
    const secret = process.env.RESEND_WEBHOOK_SECRET;
    const apiKey = process.env.RESEND_API_KEY;
    if (!secret || !apiKey) throw new ServiceUnavailableException("Resend webhook is not configured");

    const resend = new Resend(apiKey);
    let event: unknown;
    try {
      event = resend.webhooks.verify({
        payload: rawBody.toString("utf8"),
        headers: {
          id: headers.id,
          timestamp: headers.timestamp,
          signature: headers.signature
        },
        webhookSecret: secret
      });
    } catch {
      throw new BadRequestException("Invalid webhook signature");
    }

    const payload = event as { type?: string; created_at?: string; data?: { email_id?: string } };
    const providerId = payload.data?.email_id;
    if (!providerId || !payload.type) return { accepted: true, ignored: true };
    const delivery = await this.prisma.emailDelivery.findUnique({ where: { providerId } });
    if (!delivery) return { accepted: true, ignored: true };

    await this.prisma.$transaction(async (tx) => {
      const existing = await tx.emailEvent.findUnique({ where: { webhookId: headers.id! } });
      if (existing) return;
      await tx.emailEvent.create({
        data: {
          deliveryId: delivery.id,
          webhookId: headers.id!,
          type: payload.type!,
          payload: event as Prisma.InputJsonValue,
          occurredAt: payload.created_at ? new Date(payload.created_at) : new Date()
        }
      });
      const status = eventStatus[payload.type!];
      if (status) {
        await tx.emailDelivery.update({
          where: { id: delivery.id },
          data: { status, lastEventAt: new Date() }
        });
      }
    });

    return { accepted: true };
  }

  private escape(value: string) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }
}
