import { test, expect } from "@playwright/test";

import { openModels, skipReveal } from "./helpers";

test("header navigation moves between pages and marks the current one", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M1&ram=16&vram=11");

  await expect(page.locator(".machine-bar")).toHaveCount(0);
  await expect(page.locator(".spec-rail")).toHaveCount(0);

  await page
    .locator(".nav-links")
    .getByRole("link", { name: "Models" })
    .click();
  await expect(page).toHaveURL(/\/models\/$/);
  await expect(
    page.locator(".nav-links").getByRole("link", { name: "Models" }),
  ).toHaveAttribute("aria-current", "page");
  await expect(page.locator(".spec-rail")).toBeVisible();
  await expect(page.locator(".spec-rail")).toContainText("Best fit");

  await page.locator(".nav-links").getByRole("link", { name: "Cost" }).click();
  await expect(page).toHaveURL(/\/cost\/$/);
  await expect(
    page.locator(".nav-links").getByRole("link", { name: "Cost" }),
  ).toHaveAttribute("aria-current", "page");
});

test("the header groups menu on the left and actions on the right", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/");

  const wordmark = await page.locator(".wordmark").boundingBox();
  const links = await page.locator(".nav-links").boundingBox();
  const actions = await page.locator(".nav-right").boundingBox();

  expect(wordmark).not.toBeNull();
  expect(links).not.toBeNull();
  expect(actions).not.toBeNull();
  expect(links!.x).toBeGreaterThan(wordmark!.x);
  expect(actions!.x).toBeGreaterThan(links!.x + links!.width);
  await expect(page.locator(".nav-menu-toggle")).toBeHidden();
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
  await expect(page.locator(".spec-rail")).toBeVisible();
});

test("the desktop rail fills the right side and the footer spans the page", async ({
  page,
}) => {
  await openModels(page, 16, 11);

  const viewport = page.viewportSize();
  const rail = await page.locator(".spec-rail").boundingBox();
  const footer = await page.locator(".footer").boundingBox();

  expect(viewport).not.toBeNull();
  expect(rail).not.toBeNull();
  expect(footer).not.toBeNull();
  expect(Math.round(rail!.x + rail!.width)).toBe(viewport!.width);
  expect(Math.round(footer!.width)).toBe(viewport!.width);
  expect(Math.round(footer!.y + footer!.height)).toBe(viewport!.height);
  expect(Math.round(rail!.y + rail!.height)).toBeLessThan(
    Math.round(footer!.y),
  );
});

test("the rail sticks while a long page scrolls", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/how-it-works/?gpu=Apple%20M1&ram=16&vram=11");
  await expect(page.locator(".how-section")).toBeVisible();

  const viewport = page.viewportSize();
  const rail = page.locator(".spec-rail");
  expect(viewport).not.toBeNull();
  await expect(rail).toHaveCSS("position", "sticky");

  await page.evaluate(() => window.scrollTo(0, 120));
  await expect
    .poll(async () => Math.round((await rail.boundingBox())!.y))
    .toBe(44);
});

test("the mobile rail expands to the machine form", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openModels(page, 16, 11);

  const toggle = page.locator(".spec-rail-toggle");
  await expect(toggle).toBeVisible();
  await expect(page.locator(".spec-rail-body")).toBeHidden();

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".spec-rail-body")).toBeVisible();
  await expect(page.locator("#rail-gpu")).toBeVisible();
});

test("rail edits carry to the next page", async ({ page }) => {
  await openModels(page, 16, 11);

  await expect(page.locator(".spec-rail-machine")).toContainText("11 GB VRAM");
  await page
    .locator(".spec-rail")
    .getByRole("button", { name: "increase VRAM" })
    .click();
  await expect(page.locator(".spec-rail-machine")).toContainText("12 GB VRAM");
  await expect(page.locator("#rail-vram-label + .rail-stepper")).toContainText(
    "12 GB",
  );

  await page.locator(".nav-links").getByRole("link", { name: "Cost" }).click();
  await expect(page).toHaveURL(/\/cost\/$/);
  await expect(page.locator(".spec-rail-machine")).toContainText("12 GB VRAM");
});

test("the rail carries the platform settings", async ({ page }) => {
  await openModels(page, 16, 11);

  await page.locator(".rail-more summary").click();
  await expect(page.locator("#rail-os")).toBeVisible();
  await page.locator("#rail-os").selectOption("linux");

  await page.locator(".nav-links").getByRole("link", { name: "Cost" }).click();
  await expect(page).toHaveURL(/\/cost\/$/);
  await page.locator(".rail-more summary").click();
  await expect(page.locator("#rail-os")).toHaveValue("linux");
});

test("the rail links back to the result", async ({ page }) => {
  await openModels(page, 16, 11);

  await page.getByRole("link", { name: "See your result" }).click();
  await expect(page).toHaveURL(/\/#best-pick-row$/);
  await expect(page.locator(".best-pick-card h3")).toBeVisible();
});
