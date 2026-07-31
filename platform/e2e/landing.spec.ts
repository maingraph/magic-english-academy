import { expect, test } from "@playwright/test";

test("platform root sends anonymous visitors to login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole("heading", { name: "Вход в аккаунт" })).toBeVisible();
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

test("student can open persisted learning tools", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Ученик", exact: true }).click();
  await expect(page.getByLabel("Логин")).toHaveValue("student@magic.local");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: /Добрый день/ })).toBeVisible();

  await page.goto("/training");
  await expect(page.getByRole("heading", { name: "Тренировки" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Выбери перевод/ })).toBeVisible();

  await page.goto("/calendar");
  await expect(page.getByRole("heading", { name: "Календарь" })).toBeVisible();

  await page.goto("/library");
  await expect(page.getByRole("heading", { name: "Библиотека" })).toBeVisible();

  await page.goto("/courses/a0/lessons/a0-001");
  await expect(page.getByRole("heading", { name: "Алфавит", level: 1 })).toBeVisible();
  await expect(page.getByRole("button", { name: "Закладка" })).toBeVisible();
});

test("admin feature areas are protected and available", async ({ page }) => {
  await page.goto("/login");
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Админ", exact: true }).click();
  await expect(page.getByLabel("Логин")).toHaveValue("admin@magic.local");
  await page.getByRole("button", { name: "Войти", exact: true }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/admin/analytics");
  await expect(page.getByRole("heading", { name: "АНАЛИТИКА" })).toBeVisible();
  await page.goto("/admin/notifications");
  await expect(page.getByRole("heading", { name: "РАССЫЛКИ" })).toBeVisible();
});
