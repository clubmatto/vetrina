import { expect, type Page } from "@playwright/test";

/**
 * The first visit plays a staged detection reveal. Mark it as seen before the
 * page loads so assertions never race the animation.
 */
export async function skipReveal(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem("wmla-probe-seen", "1");
  });
}

/** Open the page with a known machine so the recommendation is deterministic. */
export async function openMachine(
  page: Page,
  ram: number,
  vram: number,
): Promise<void> {
  await skipReveal(page);
  await page.goto(`/?ram=${ram}&vram=${vram}`);
  await expect(page.locator(".best-pick-card h3")).toBeVisible();
}

/** Tab labels read like "Fits (44)"; the count is what most assertions need. */
export function countFromLabel(label: string): number {
  return Number(label.replace(/[^0-9]/g, ""));
}
