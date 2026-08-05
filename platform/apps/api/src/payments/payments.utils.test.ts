import assert from "node:assert/strict";
import test from "node:test";
import {
  appendPaymentToken,
  MAGIC_PLAN,
  PaymentValidationError,
  paymentStatusFromAlfa,
  validatePaymentPayload
} from "./payments.utils";

test("payment amount is fixed server-side at 75 BYN", () => {
  assert.equal(MAGIC_PLAN.amountMinor, 7_500);
  assert.equal(MAGIC_PLAN.currencyNumber, "933");
});

test("payment payload requires email, privacy consent and UUID idempotency", () => {
  const input = validatePaymentPayload({
    idempotencyKey: "018f47a2-93bc-4f41-9ad0-4bfd52c21e34",
    name: "Анна",
    email: "ANNA@example.com",
    privacyAccepted: true
  });
  assert.equal(input.email, "anna@example.com");
  assert.throws(
    () => validatePaymentPayload({ idempotencyKey: "bad", name: "Анна", email: "anna@example.com", privacyAccepted: true }),
    PaymentValidationError
  );
});

test("only Alfa status 2 becomes paid", () => {
  assert.equal(paymentStatusFromAlfa(0), "PENDING");
  assert.equal(paymentStatusFromAlfa(2), "PAID");
  assert.equal(paymentStatusFromAlfa(3), "CANCELLED");
  assert.equal(paymentStatusFromAlfa(4), "REFUNDED");
  assert.equal(paymentStatusFromAlfa(6), "DECLINED");
});

test("payment token is appended to HTTPS return URL", () => {
  const url = appendPaymentToken("https://magic-english-plan.by/payment/success", "token-1", "production");
  assert.equal(url, "https://magic-english-plan.by/payment/success?payment=token-1");
  assert.throws(() => appendPaymentToken("http://example.com/payment", "token-1", "production"));
});
