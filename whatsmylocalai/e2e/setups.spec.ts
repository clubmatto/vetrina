import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

test("setups shows computed picks that clear the speed floor", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/setups/");

  await expect(page.locator(".setup-card")).toHaveCount(4);
  await expect(page.locator(".setups-grid")).not.toContainText(
    "MacBook Air M1",
  );
  await expect(page.locator(".page-sub")).toContainText("20 tok/s");

  const cards = page.locator(".setup-card");
  await expect(cards.nth(0)).toContainText("Mac mini M4");
  await expect(cards.nth(0)).toContainText("gpt-oss-20b");
  await expect(cards.nth(0)).toContainText("~25-35 tok/s");

  await expect(cards.nth(1)).toContainText("Qwen3-30B-A3B");
  await expect(cards.nth(1)).toContainText("~70-95 tok/s");

  await expect(cards.nth(2)).toContainText("Qwen3-30B-A3B");
  await expect(cards.nth(2)).toContainText("~60-80 tok/s");
  await expect(cards.nth(2)).toContainText("little headroom");

  await expect(cards.nth(3)).toContainText("Qwen3.5-35B-A3B");
  await expect(cards.nth(3)).toContainText("~210-285 tok/s");
});

test("setups has a vendor link and checked date on every card", async ({
  page,
}) => {
  await skipReveal(page);
  await page.goto("/setups/");

  const links = page.locator(".setup-link");
  await expect(links).toHaveCount(4);
  for (const href of await links.evaluateAll((els) =>
    els.map((el) => el.getAttribute("href")),
  )) {
    expect(href).toMatch(/^https:\/\//);
  }

  await expect(page.locator(".setup-link").first()).toHaveAttribute(
    "rel",
    "noopener",
  );
  await expect(page.locator(".setup-checked")).toHaveCount(4);
  await expect(page.locator(".setup-checked").first()).toContainText(
    "Nov 17, 2026",
  );
});
