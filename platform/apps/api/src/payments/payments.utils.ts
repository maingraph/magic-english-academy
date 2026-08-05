import type { PaymentStatus } from "@prisma/client";

export const MAGIC_PLAN = {
  code: "magic-english-plan",
  name: "Magic English Plan",
  amountMinor: 7_500,
  currency: "BYN",
  currencyNumber: "933"
} as const;

export type CreatePaymentPayload = {
  idempotencyKey?: unknown;
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  social?: unknown;
  privacyAccepted?: unknown;
};

export type ValidatedPaymentPayload = {
  idempotencyKey: string;
  name: string;
  email: string;
  phone: string | null;
  social: string | null;
};

export class PaymentValidationError extends Error {}

function requiredString(value: unknown, field: string, max: number) {
  if (typeof value !== "string") throw new PaymentValidationError(`${field} обязателен`);
  const result = value.trim();
  if (!result || result.length > max) throw new PaymentValidationError(`${field} заполнен неверно`);
  return result;
}

function optionalString(value: unknown, field: string, max: number) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") throw new PaymentValidationError(`${field} заполнен неверно`);
  const result = value.trim();
  if (result.length > max) throw new PaymentValidationError(`${field} заполнен неверно`);
  return result || null;
}

export function validatePaymentPayload(payload: CreatePaymentPayload): ValidatedPaymentPayload {
  const idempotencyKey = requiredString(payload.idempotencyKey, "idempotencyKey", 64);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idempotencyKey)) {
    throw new PaymentValidationError("idempotencyKey заполнен неверно");
  }

  const name = requiredString(payload.name, "Имя", 120);
  const email = requiredString(payload.email, "Email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new PaymentValidationError("Email заполнен неверно");
  }
  if (payload.privacyAccepted !== true) {
    throw new PaymentValidationError("Нужно принять политику обработки данных");
  }

  return {
    idempotencyKey,
    name,
    email,
    phone: optionalString(payload.phone, "Телефон", 40),
    social: optionalString(payload.social, "Мессенджер", 200)
  };
}

export function paymentStatusFromAlfa(orderStatus: number): PaymentStatus {
  if (orderStatus === 2) return "PAID";
  if (orderStatus === 3) return "CANCELLED";
  if (orderStatus === 4) return "REFUNDED";
  if (orderStatus === 6) return "DECLINED";
  return "PENDING";
}

export function publicPaymentMessage(status: PaymentStatus, fulfilled: boolean) {
  if (fulfilled) return "Оплата подтверждена, доступ выдан.";
  if (status === "PAID") return "Оплата подтверждена. Данные для входа придут на email.";
  if (status === "DECLINED") return "Банк отклонил оплату. Попробуйте другую карту или обратитесь в поддержку.";
  if (status === "CANCELLED") return "Оплата отменена.";
  if (status === "REFUNDED") return "Платёж возвращён.";
  if (status === "ERROR") return "Не удалось зарегистрировать платёж. Обратитесь в поддержку.";
  return "Ждём подтверждение оплаты от банка.";
}

export function appendPaymentToken(rawUrl: string, token: string, nodeEnv = process.env.NODE_ENV) {
  const url = new URL(rawUrl);
  const localDevelopment = nodeEnv !== "production" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localDevelopment) {
    throw new Error("Payment return URL must use HTTPS");
  }
  url.searchParams.set("payment", token);
  return url.toString();
}
