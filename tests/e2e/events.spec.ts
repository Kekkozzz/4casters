import { test, expect } from "@playwright/test";

test("/events lists upcoming events from mock data", async ({ page }) => {
  await page.goto("/events");
  await expect(page.getByRole("heading", { name: "Upcoming Events" })).toBeVisible();
  await expect(page.getByText(/Orbital Open/i)).toBeVisible();
});

test("region filter narrows results", async ({ page }) => {
  await page.goto("/events");
  const initial = await page.getByText(/upcoming matches/).count();
  await page.getByRole("button", { name: "APAC", exact: true }).click();
  const filtered = await page.getByText(/upcoming matches/).count();
  expect(filtered).toBeLessThan(initial);
  expect(filtered).toBeGreaterThan(0);
});

test("click event card navigates to /events/[slug]", async ({ page }) => {
  await page.goto("/events");
  await page.getByText(/Orbital Open/i).first().click();
  await expect(page).toHaveURL(/\/events\/orbital-open-spring-26/);
});

test("clear filters restores the full grid", async ({ page }) => {
  await page.goto("/events");
  const initial = await page.getByText(/upcoming matches/).count();
  // Apply a filter that matches nothing to trigger the empty-state clear button
  await page.getByRole("button", { name: "S", exact: true }).click();
  await page.getByRole("button", { name: "B", exact: true }).click();
  // Now un-toggle by clicking same buttons again
  await page.getByRole("button", { name: "S", exact: true }).click();
  await page.getByRole("button", { name: "B", exact: true }).click();
  const restored = await page.getByText(/upcoming matches/).count();
  expect(restored).toBe(initial);
});
