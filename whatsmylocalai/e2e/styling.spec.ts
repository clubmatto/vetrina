import { test, expect } from "@playwright/test";

import { openModels, skipReveal } from "./helpers";

test("controls and surfaces use the newsletter radius", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/");

  await expect(page.locator(".email-trigger")).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(page.locator(".next-card").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(page.locator(".spec-switch")).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".runner-toggle")).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(page.locator(".runner-toggle button").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
});

test("model controls and cards use the newsletter radius", async ({ page }) => {
  await openModels(page, 16, 11);

  await expect(page.locator(".filter-chip").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
  await expect(page.locator(".model-card").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
});

test("cost panels and switchers use the newsletter radius", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/cost/?ram=16&vram=11");

  await expect(page.locator(".cost-panel")).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".cost-seg")).toHaveCSS("border-radius", "8px");
  await expect(page.locator(".cost-seg button").first()).toHaveCSS(
    "border-radius",
    "8px",
  );
});
