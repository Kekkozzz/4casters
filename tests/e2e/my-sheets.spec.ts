import { test, expect } from "@playwright/test";

test("/sheets lists generated sheets", async ({ page }) => {
  await page.goto("/sheets");
  await expect(page.getByRole("heading", { name: "My Sheets" })).toBeVisible();
  // mock has 8 sheets
  await expect(page.getByText(/Halcyon vs Verdant/)).toBeVisible();
  await expect(page.getByText(/8 sheets/)).toBeVisible();
});

test("clicking a row opens the sheet", async ({ page }) => {
  await page.goto("/sheets");
  await page.getByText(/Halcyon vs Verdant/).first().click();
  await expect(page).toHaveURL(/\/matches\/m-01/);
});

test("sort by 'generated' toggles direction", async ({ page }) => {
  await page.goto("/sheets");
  // default is desc; clicking once flips to asc
  await page.getByRole("button", { name: /^Generated/ }).click();
  await expect(page.getByText("sorted by generated asc")).toBeVisible();
});

test("sort by Match column works", async ({ page }) => {
  await page.goto("/sheets");
  await page.getByRole("button", { name: /^Match/ }).click();
  await expect(page.getByText(/sorted by match/)).toBeVisible();
});
