import { test, expect } from "@playwright/test";

test("/login renders the headline and teaser", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Prep like Derek");
  await expect(page.getByRole("button", { name: "Send magic link" })).toBeVisible();
  await expect(page.getByText("A sheet looks like this")).toBeVisible();
});

test("magic link flow toggles to confirmation state", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Work email").fill("caster@studio.gg");
  await page.getByRole("button", { name: "Send magic link" }).click();
  await expect(page.getByText("Magic link sent")).toBeVisible();
  await expect(page.getByText("caster@studio.gg")).toBeVisible();
});

test("root / redirects to /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});
