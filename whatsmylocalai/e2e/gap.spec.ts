import { test, expect } from "@playwright/test";

import { countFromLabel, openMachine } from "./helpers";

test("lists the closest gaps first and matches the tab count", async ({
  page,
}) => {
  await openMachine(page, 8, 8);

  const beyondTab = page.getByRole("tab", { name: /^Out of reach/ });
  const total = countFromLabel(await beyondTab.innerText());
  await beyondTab.click();

  await expect(page.locator("#panel-beyond")).toBeVisible();
  await expect(page.locator(".beyond-row")).toHaveCount(Math.min(total, 6));

  const gaps = (await page.locator(".beyond-row-gap").allInnerTexts()).map(
    (text) => parseFloat(text.replace(/[^\d.]/g, "")),
  );

  expect(gaps.length).toBeGreaterThan(0);
  expect(gaps.every((gap) => gap > 0)).toBeTruthy();
  expect(gaps).toEqual([...gaps].sort((a, b) => a - b));
});

test("arrow keys move between the options tabs", async ({ page }) => {
  await openMachine(page, 8, 8);

  const beyondTab = page.getByRole("tab", { name: /^Out of reach/ });
  await beyondTab.click();
  await beyondTab.press("ArrowLeft");

  await expect(page.getByRole("tab", { name: /^Fits/ })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator("#panel-fits")).toBeVisible();
  await expect(page.locator("#panel-beyond")).toBeHidden();
});
