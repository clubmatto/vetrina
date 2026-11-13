import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

test("shows an estimated speed band for a known GPU", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  const chip = page.locator(".best-pick-card .chip-speed");
  await expect(chip).toBeVisible();
  await expect(chip).toHaveText(/^~\d+-\d+ tok\/s$/);
  await expect(chip).toHaveAttribute("title", /Estimated decode speed/);
});

test("shows a band on Apple silicon from the chip bins", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M5%20Max&ram=128&vram=96");

  await expect(page.locator(".best-pick-card .chip-speed")).toBeVisible();
});

test("shows no band for models that do not fit", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=8&vram=8");

  await page.getByRole("tab", { name: /^Out of reach/ }).click();
  await expect(page.locator(".beyond-row").first()).toBeVisible();
  await expect(page.locator("#panel-beyond .chip-speed")).toHaveCount(0);
});
