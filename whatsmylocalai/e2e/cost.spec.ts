import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

const money = (text: string): number => Number(text.replace(/[^\d.]/g, ""));

test("costs the best model against a cloud preset", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  await expect(page.locator("#cost")).toBeVisible();
  const values = page.locator(".cost-result-value");
  await expect(values.nth(0)).toHaveText(/^\$/);
  await expect(values.nth(1)).toHaveText(/^\$/);
  await expect(page.locator(".cost-chart figcaption")).toContainText(
    "pays back",
  );
  await expect(page.locator(".cost-line-local")).toHaveAttribute("d", /^M/);
  await expect(page.locator(".cost-dot")).toBeVisible();
});

test("owning the machine drops the hardware and hides the chart", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  const local = page.locator(".cost-result-value").first();
  const before = money(await local.innerText());

  await page.getByRole("button", { name: "I own it" }).click();

  const after = money(await local.innerText());
  expect(after).toBeLessThan(before);
  await expect(page.locator(".cost-chart")).toBeHidden();
  await expect(page.locator(".cost-verdict").first()).toContainText(
    "electricity only",
  );
});

test("switching the cloud preset changes the cloud bill", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  const cloud = page.locator(".cost-result-value").nth(1);
  const mid = money(await cloud.innerText());

  await page.getByRole("button", { name: /Budget/ }).click();

  const budget = money(await cloud.innerText());
  expect(budget).toBeLessThan(mid);
});

test("more usage raises the cloud bill faster than the local one", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  const cloud = page.locator(".cost-result-value").nth(1);
  const local = page.locator(".cost-result-value").first();
  const cloudAtTwo = money(await cloud.innerText());

  await page.locator("#cost-hours").fill("6");

  await expect
    .poll(async () => money(await cloud.innerText()))
    .toBeGreaterThan(cloudAtTwo * 2.5);
  expect(money(await local.innerText())).toBeLessThan(cloudAtTwo);
});

test("keeps the calculator inside the page on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  await expect(page.locator("#cost")).toBeVisible();
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBe(0);

  const columns = await page
    .locator(".cost-grid")
    .evaluate((el) => getComputedStyle(el).gridTemplateColumns);
  expect(columns.trim().split(/\s+/)).toHaveLength(1);
});
