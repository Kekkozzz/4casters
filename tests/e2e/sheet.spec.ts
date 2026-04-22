import { test, expect } from "@playwright/test";

test("/matches/[id] renders all 5 sheet sections", async ({ page }) => {
  await page.goto("/matches/m-01");
  // Use heading role to disambiguate from body copy that may contain
  // the same words (e.g., hook #1 body mentions "head-to-head").
  await expect(
    page.getByRole("heading", { name: "Narrative Hooks" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Head-to-Head" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Player Profiles" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Quotes" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Talking Points" }),
  ).toBeVisible();
});

test("every narrative hook has a clickable source chip", async ({ page }) => {
  await page.goto("/matches/m-01");
  const chips = page.getByRole("link").filter({ hasText: /source:/ });
  const count = await chips.count();
  expect(count).toBeGreaterThanOrEqual(3);
  await expect(chips.first()).toHaveAttribute("target", "_blank");
  await expect(chips.first()).toHaveAttribute(
    "rel",
    expect.stringContaining("noopener"),
  );
});

test("missing notable items show 'no data available' italic muted", async ({
  page,
}) => {
  await page.goto("/matches/m-01");
  // Rook (team a) has a missing notable in the mock — expand first if collapsed.
  // Strikers are open by default; Rook is keeper so closed. Click to open.
  await page.getByRole("button", { expanded: false }).filter({ hasText: "Rook" }).click();
  await expect(page.getByText("no data available").first()).toBeVisible();
});

test("data freshness card lists the three sources", async ({ page }) => {
  await page.goto("/matches/m-01");
  await expect(page.getByText(/Data freshness/)).toBeVisible();
  await expect(page.getByText(/^Liquipedia$/)).toBeVisible();
  await expect(page.getByText(/^BLAST$/)).toBeVisible();
  await expect(page.getByText(/^YouTube$/)).toBeVisible();
});
