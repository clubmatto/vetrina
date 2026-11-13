import { test, expect } from "@playwright/test";

import { openMachine } from "./helpers";

test("the share link replays the same result", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openMachine(page, 16, 8);

  const name = await page.locator(".best-pick-card h3").innerText();

  await page.getByRole("button", { name: "share your result" }).click();
  await expect(page.locator(".share-btn")).toHaveClass(/copied/);

  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(url).toContain("ram=16");
  expect(url).toContain("vram=8");

  await page.goto(url);
  await expect(page.locator(".best-pick-card h3")).toHaveText(name);
});
