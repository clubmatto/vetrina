import { test, expect } from "@playwright/test";

import { skipReveal } from "./helpers";

test("shows the MLX note only on Apple Silicon", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=Apple%20M3%20Max&ram=36&vram=24");

  const note = page.locator(".mlx-note");
  await expect(note).toBeVisible();
  await expect(note).toContainText("LM Studio also runs MLX models");
  await expect(note).toContainText("lms get --mlx");
  await expect(note).toContainText("GGUF");

  await page.getByRole("button", { name: "Ollama" }).click();

  await expect(note).toContainText("Ollama also runs MLX models");
  await expect(note).toContainText("-mlx");
});

test("hides the MLX note on other hardware", async ({ page }) => {
  await skipReveal(page);
  await page.goto("/?gpu=RTX%204090&ram=64&vram=24");

  await expect(page.locator(".mlx-note")).toBeHidden();
});
