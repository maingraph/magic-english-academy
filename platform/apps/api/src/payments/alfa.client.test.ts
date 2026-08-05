import assert from "node:assert/strict";
import test from "node:test";
import { AlfaClient, AlfaRequestError } from "./alfa.client";

test("Alfa client sends fixed BYN amount and parses hosted checkout", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalUsername = process.env.ALFA_USERNAME;
  const originalPassword = process.env.ALFA_PASSWORD;
  process.env.ALFA_USERNAME = "merchant-api";
  process.env.ALFA_PASSWORD = "secret";
  let sentBody = "";
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://ecom.alfabank.by/payment/rest/register.do");
    sentBody = String(init?.body);
    return new Response(JSON.stringify({
      orderId: "bank-order-1",
      formUrl: "https://ecom.alfabank.by/payment/merchants/example/payment_en.html?mdOrder=bank-order-1"
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalUsername === undefined) delete process.env.ALFA_USERNAME;
    else process.env.ALFA_USERNAME = originalUsername;
    if (originalPassword === undefined) delete process.env.ALFA_PASSWORD;
    else process.env.ALFA_PASSWORD = originalPassword;
  });

  const result = await new AlfaClient().registerOrder({
    orderNumber: "ME-TEST-1",
    returnUrl: "https://magic-english-plan.by/payment/success?payment=token",
    failUrl: "https://magic-english-plan.by/payment/failed?payment=token",
    customerEmail: "student@example.com"
  });
  const params = new URLSearchParams(sentBody);
  assert.equal(params.get("amount"), "7500");
  assert.equal(params.get("currency"), "933");
  assert.equal(params.get("orderNumber"), "ME-TEST-1");
  assert.equal(result.orderId, "bank-order-1");
});

test("Alfa client rejects checkout URL outside provider host", async (context) => {
  const originalFetch = globalThis.fetch;
  const originalToken = process.env.ALFA_TOKEN;
  process.env.ALFA_TOKEN = "test-token";
  globalThis.fetch = async () => new Response(JSON.stringify({
    orderId: "bank-order-2",
    formUrl: "https://attacker.example/checkout"
  }), { status: 200, headers: { "content-type": "application/json" } });
  context.after(() => {
    globalThis.fetch = originalFetch;
    if (originalToken === undefined) delete process.env.ALFA_TOKEN;
    else process.env.ALFA_TOKEN = originalToken;
  });

  await assert.rejects(
    () => new AlfaClient().registerOrder({
      orderNumber: "ME-TEST-2",
      returnUrl: "https://magic-english-plan.by/payment/success?payment=token",
      failUrl: "https://magic-english-plan.by/payment/failed?payment=token",
      customerEmail: "student@example.com"
    }),
    AlfaRequestError
  );
});
