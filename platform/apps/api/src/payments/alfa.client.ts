import { Injectable } from "@nestjs/common";
import { MAGIC_PLAN } from "./payments.utils";

const DEFAULT_API_URL = "https://ecom.alfabank.by/payment/rest";

type AlfaJson = Record<string, unknown>;

export class AlfaConfigurationError extends Error {}
export class AlfaRequestError extends Error {}

export type AlfaRegistration = {
  orderId: string;
  formUrl: string;
};

export type AlfaOrderStatus = {
  orderStatus: number;
  errorCode: string | null;
  errorMessage: string | null;
};

function stringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function errorFromResponse(response: AlfaJson) {
  const code = stringValue(response.errorCode);
  const message = stringValue(response.errorMessage) || "Alfa-Bank returned an error";
  return code && code !== "0" ? new AlfaRequestError(`${code}: ${message}`) : null;
}

@Injectable()
export class AlfaClient {
  private apiUrl() {
    const url = new URL(process.env.ALFA_API_URL ?? DEFAULT_API_URL);
    if (url.protocol !== "https:") throw new AlfaConfigurationError("ALFA_API_URL must use HTTPS");
    return url.toString().replace(/\/$/, "");
  }

  private credentials(): Record<string, string> {
    const token = process.env.ALFA_TOKEN?.trim();
    if (token) return { token };
    const userName = process.env.ALFA_USERNAME?.trim();
    const password = process.env.ALFA_PASSWORD?.trim();
    if (!userName || !password) {
      throw new AlfaConfigurationError("ALFA_USERNAME and ALFA_PASSWORD are required");
    }
    return { userName, password };
  }

  private async post(path: string, values: Record<string, string>) {
    const body = new URLSearchParams({ ...this.credentials(), ...values });
    let response: Response;
    try {
      response = await fetch(`${this.apiUrl()}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded;charset=UTF-8" },
        body,
        redirect: "error",
        signal: AbortSignal.timeout(15_000)
      });
    } catch {
      throw new AlfaRequestError("Alfa-Bank request failed");
    }
    if (!response.ok) throw new AlfaRequestError(`Alfa-Bank HTTP ${response.status}`);
    try {
      return (await response.json()) as AlfaJson;
    } catch {
      throw new AlfaRequestError("Alfa-Bank returned invalid JSON");
    }
  }

  async registerOrder(input: {
    orderNumber: string;
    returnUrl: string;
    failUrl: string;
    customerEmail: string;
  }): Promise<AlfaRegistration> {
    const response = await this.post("register.do", {
      orderNumber: input.orderNumber,
      amount: String(MAGIC_PLAN.amountMinor),
      currency: MAGIC_PLAN.currencyNumber,
      returnUrl: input.returnUrl,
      failUrl: input.failUrl,
      description: MAGIC_PLAN.name,
      language: "ru",
      clientId: input.customerEmail
    });
    const providerError = errorFromResponse(response);
    if (providerError) throw providerError;
    const orderId = stringValue(response.orderId);
    const formUrl = stringValue(response.formUrl);
    if (!orderId || !formUrl) throw new AlfaRequestError("Alfa-Bank registration response is incomplete");

    const paymentUrl = new URL(formUrl);
    const apiHost = new URL(this.apiUrl()).hostname;
    if (paymentUrl.protocol !== "https:" || paymentUrl.hostname !== apiHost) {
      throw new AlfaRequestError("Alfa-Bank returned an unexpected payment URL");
    }
    return { orderId, formUrl: paymentUrl.toString() };
  }

  async getOrderStatus(orderId: string): Promise<AlfaOrderStatus> {
    const response = await this.post("getOrderStatusExtended.do", { orderId });
    const providerError = errorFromResponse(response);
    if (providerError) throw providerError;
    const orderStatus = Number(response.orderStatus);
    if (!Number.isInteger(orderStatus)) throw new AlfaRequestError("Alfa-Bank status response is incomplete");
    return {
      orderStatus,
      errorCode: stringValue(response.errorCode) || null,
      errorMessage: stringValue(response.errorMessage) || null
    };
  }
}
