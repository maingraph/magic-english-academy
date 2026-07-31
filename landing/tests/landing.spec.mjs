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
