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
