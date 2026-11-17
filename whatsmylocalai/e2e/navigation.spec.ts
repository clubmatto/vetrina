import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

test("header navigation moves between pages and marks the current one", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  await expect(page.locator(".machine-bar")).toHaveCount(0);

  await page
    .locator(".nav-links")
    .getByRole("link", { name: "Models" })
    .click();
  await expect(page).toHaveURL(/\/models\/$/);
  await expect(
    page.locator(".nav-links").getByRole("link", { name: "Models" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".machine-bar")).toBeVisible();
  await expect(page.locator(".machine-bar")).toContainText("Best fit");

  await page.locator(".nav-links").getByRole("link", { name: "Cost" }).click();
  await expect(page).toHaveURL(/\/cost\/$/);
  await expect(
    page.locator(".nav-links").getByRole("link", { name: "Cost" }),
  ).toHaveAttribute("aria-current", "page");
});

test("the mobile menu opens and navigates", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  await page.getByRole("button", { name: "Menu" }).click();
  await expect(
    page.locator(".nav-links").getByRole("link", { name: "Cost" }),
  ).toBeVisible();

  await page.locator(".nav-links").getByRole("link", { name: "Cost" }).click();
  await expect(page).toHaveURL(/\/cost\/$/);
  await expect(page.locator(".machine-bar")).toBeVisible();
});

test("the machine bar goes back to the result", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/models/?gpu=Apple%20M1&ram=16&vram=11");

  await expect(page.locator(".machine-bar")).toBeVisible();
  await page.getByRole("link", { name: "See your model" }).click();

  await expect(page).toHaveURL(/\/#best-pick-row$/);
  await expect(page.locator(".best-pick-card h3")).toBeVisible();
});
