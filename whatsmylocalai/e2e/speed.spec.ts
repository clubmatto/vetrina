import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

test("shows a prominent speed band and streams a simulation", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  await expect(page.locator(".speed-stat-value")).toHaveText(/^~\d+-\d+$/);
  await expect(page.locator(".speed-demo")).toBeVisible();
  await expect(page.locator(".speed-demo-output")).toContainText(
    "Simulation at",
  );
});

test("shows a band on Apple silicon from the chip bins", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M5%20Max&ram=128&vram=96");

  await expect(page.locator(".speed-stat-value")).toBeVisible();
});

test("streams while the band is slow enough to watch", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  const output = page.locator(".speed-demo-output");
  await expect(output).toHaveClass(/typing/);
  await expect(page.locator(".speed-demo-replay")).toHaveText("stop");

  await page.locator(".speed-demo-replay").click();
  await expect(output).toContainText("Real numbers vary");
  await expect(page.locator(".speed-demo-replay")).toHaveText("replay");
});

test("shows the full simulation at once with reduced motion", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  const output = page.locator(".speed-demo-output");
  await expect(output).toContainText("Real numbers vary");
  await expect(output).not.toHaveClass(/typing/);
});

test("stacks the terminal under the card on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  const card = await page.locator(".best-pick-card").boundingBox();
  const demo = await page.locator(".speed-demo").boundingBox();

  expect(card).not.toBeNull();
  expect(demo).not.toBeNull();
  expect(demo!.y).toBeGreaterThan(card!.y + card!.height - 4);
});

test("shows no band for models that do not fit", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=8&vram=8");

  await page.getByRole("tab", { name: /^Out of reach/ }).click();
  await expect(page.locator(".beyond-row").first()).toBeVisible();
  await expect(page.locator("#panel-beyond .chip-speed")).toHaveCount(0);
});
