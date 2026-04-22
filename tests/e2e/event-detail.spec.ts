import { test, expect } from "@playwright/test";

test("/events/[slug] shows event header + match table", async ({ page }) => {
  await page.goto("/events/orbital-open-spring-26");
  await expect(
    page.getByRole("heading", { name: /Orbital Open/ }),
  ).toBeVisible();
  await expect(page.locator("text=vs").first()).toBeVisible();
  // at least one Generate button for idle rows
  await expect(
    page.getByRole("button", { name: "Generate" }).first(),
  ).toBeVisible();
});

test("Generate button animates progress and flips to Sheet ready", async ({
  page,
}) => {
  await page.goto("/events/orbital-open-spring-26");
  const generateBtn = page.getByRole("button", { name: "Generate" }).first();
  await generateBtn.click();
  await expect(page.getByText(/Generating/).first()).toBeVisible();
  // tick: 700ms × ~15 ≈ 10.5s worst case; test budget 15s
  await expect(page.getByText("Sheet ready").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("pre-seeded ready match has a working Sheet ready link", async ({
  page,
}) => {
  await page.goto("/events/orbital-open-spring-26");
  // m-01 is seeded as "ready" in mock
  const link = page.getByRole("link", { name: /Sheet ready/ }).first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/matches\/m-01/);
});
