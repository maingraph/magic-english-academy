import { expect, test } from "@playwright/test";

test("landing keeps production variant and external platform login", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".hero-positioned")).toBeVisible();
  await expect(page.locator(".hero-wide")).toBeHidden();
  await expect(page.locator(".why-compare")).toBeVisible();
  await expect(page.locator(".text-switcher").first()).toBeHidden();
  await expect(page.locator(".platform-login")).toHaveAttribute(
    "href",
    `${(process.env.PLATFORM_URL ?? "http://localhost:3000").replace(/\/$/, "")}/login`
  );
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("preview variants remain available", async ({ page }) => {
  await page.goto("/?preview=1&hero=wide&headline=2&why=route");
  await expect(page.locator(".hero-wide")).toBeVisible();
  await expect(page.locator(".why-route")).toBeVisible();
  await expect(page.locator(".hero-wide [data-count]")).toHaveText("2 / 5");
});

test("payment form sends contacts without client-controlled amount", async ({ page }) => {
  let submitted;
  await page.route("http://localhost:4000/api/payments/orders", async (route) => {
    submitted = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": "http://127.0.0.1:4173",
        "content-type": "application/json"
      },
      body: JSON.stringify({ formUrl: "http://127.0.0.1:4173/?checkout=bank" })
    });
  });
  await page.goto("/");
  await page.locator(".hero-positioned [data-payment]").click();
  await page.locator("#payEmail").fill("student@example.com");
  await page.locator("#payName").fill("Анна");
  await page.locator('input[name="privacy"]').check();
  await page.locator('.payment-form button[type="submit"]').click();
  await page.waitForURL("**/?checkout=bank");
  expect(submitted.email).toBe("student@example.com");
  expect(submitted.privacyAccepted).toBe(true);
  expect(submitted.idempotencyKey).toMatch(/^[0-9a-f-]{36}$/i);
  expect(submitted.amount).toBeUndefined();
  expect(submitted.amountMinor).toBeUndefined();
});

test("success page verifies paid status through API", async ({ page }) => {
  await page.route("http://localhost:4000/api/payments/orders/payment-token", async (route) => {
    await route.fulfill({
      status: 200,
      headers: {
        "access-control-allow-origin": "http://127.0.0.1:4173",
        "content-type": "application/json"
      },
      body: JSON.stringify({
        status: "paid",
        message: "Оплата подтверждена. Данные для входа придут на email.",
        orderNumber: "ME-TEST",
        amountMinor: 7500,
        currency: "BYN"
      })
    });
  });
  await page.goto("/payment/success?payment=payment-token");
  await expect(page.locator("[data-title]")).toHaveText("Оплата подтверждена");
  await expect(page.locator("[data-order]")).toHaveText("Заказ ME-TEST");
  await expect(page.locator("[data-amount]")).toHaveText("75.00 BYN");
});
