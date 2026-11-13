import { test, expect } from "@playwright/test";

import { openMachine } from "./helpers";

test("switching the runner changes the command and survives a reload", async ({
  page,
}) => {
  await openMachine(page, 16, 8);

  const command = page.locator(".best-pick-card .run-cmd code");
  await expect(command).toContainText("lms get https://huggingface.co/");

  await page.getByRole("button", { name: "Ollama" }).click();
  await expect(command).toContainText("ollama run ");

  await page.reload();
  await expect(page.locator(".best-pick-card .run-cmd code")).toContainText(
    "ollama run ",
  );
});

test("copies the command shown on the card", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openMachine(page, 16, 8);

  const card = page.locator(".best-pick-card");
  const command = await card.locator(".run-cmd code").innerText();

  await card.locator(".run-cmd").click();
  await expect(card.locator(".run-cmd-hint")).toHaveText("copied!");

  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe(command);
});
