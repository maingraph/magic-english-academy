import { expect, test } from "@playwright/test";

test("production landing exposes one coherent option without prototype controls", async ({
  page
}) => {
  await page.goto("/offer/index.html");

  await expect(page.locator(".hero-positioned")).toBeVisible();
  await expect(page.locator(".hero-wide")).toBeHidden();
  await expect(page.locator(".why-compare")).toBeVisible();
  await expect(page.locator(".why-editorial")).toBeHidden();
  await expect(page.locator(".text-switcher").first()).toBeHidden();
  await expect(page.getByText("вариант 01 - позиционирование")).toBeHidden();

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("preview query selects alternate hero, headline and problem block", async ({ page }) => {
  await page.goto(
    "/offer/index.html?preview=1&hero=wide&headline=2&why=route"
  );

  await expect(page.locator(".hero-wide")).toBeVisible();
  await expect(page.locator(".hero-positioned")).toBeHidden();
  await expect(page.locator(".why-route")).toBeVisible();
  await expect(page.locator(".why-compare")).toBeHidden();
  await expect(page.locator(".hero-wide .text-switcher")).toBeVisible();
  await expect(page.locator(".hero-wide [data-count]")).toHaveText("2 / 5");
});

test("manifest is installable and scoped to the platform", async ({ request }) => {
  const response = await request.get("/manifest.webmanifest");
  expect(response.ok()).toBeTruthy();
  const manifest = (await response.json()) as {
    name: string;
    start_url: string;
    scope: string;
    display: string;
  };

  expect(manifest.name).toBe("Magic English Academy");
  expect(manifest.start_url).toBe("/dashboard");
  expect(manifest.scope).toBe("/");
  expect(manifest.display).toBe("standalone");
});
