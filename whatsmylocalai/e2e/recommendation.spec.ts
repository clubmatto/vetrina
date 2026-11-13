import { test, expect } from "@playwright/test";

import { countFromLabel, openMachine, skipReveal } from "./helpers";

test("detects a machine and renders a recommendation", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/");

  await expect(page.locator(".best-pick-card h3")).toBeVisible();
  await expect(
    page.locator(".best-pick-card").locator(".chip", { hasText: "GB Q4" }),
  ).toBeVisible();
});

test("recommends a model that fits the vram budget", async ({ page }) => {
  await openMachine(page, 32, 24);

  const card = page.locator(".best-pick-card");
  const size = await card.locator(".chip", { hasText: "GB Q4" }).innerText();
  const gigabytes = parseFloat(size.replace(/[^\d.]/g, ""));

  expect(gigabytes).toBeLessThanOrEqual(24);
});

test("raising vram changes the pick and widens the fitting list", async ({
  page,
}) => {
  await openMachine(page, 32, 4);

  const bestName = page.locator(".best-pick-card h3");
  const fitsTab = page.getByRole("tab", { name: /^Fits/ });
  const before = await bestName.innerText();
  const beforeFits = countFromLabel(await fitsTab.innerText());

  const increase = page.getByRole("button", { name: "increase VRAM" });
  for (let step = 0; step < 8; step++) {
    await increase.click();
  }

  await expect(bestName).not.toHaveText(before);
  expect(countFromLabel(await fitsTab.innerText())).toBeGreaterThan(beforeFits);
});
