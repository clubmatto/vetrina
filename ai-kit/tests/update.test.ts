import { describe, it, expect, beforeEach, vi } from "vitest";
import { init } from "../src/commands/init.js";
import { update } from "../src/commands/update.js";
import { createTempDir, readFile, fileExists } from "./utils.js";

describe("update command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("updates when version differs", async () => {
    await init(tempDir, "0.0.1", {});

    await update(tempDir, "0.0.2", {});

    const manifest = JSON.parse(readFile(tempDir, ".ai/.ai-kit")!);
    expect(manifest.version).toBe("0.0.2");
  });

  it("does not update if already at latest version", async () => {
    await init(tempDir, "0.0.1", {});
    const consoleLog = vi.spyOn(console, "log");

    await update(tempDir, "0.0.1", {});

    expect(consoleLog).toHaveBeenCalledWith(
      "Already at latest version (0.0.1)",
    );
  });

  it("prompts to init if not initialized", async () => {
    const consoleLog = vi.spyOn(console, "log");

    await update(tempDir, "0.0.1", {});

    expect(consoleLog).toHaveBeenCalledWith(
      'Not initialized. Run "ai-kit init" first.',
    );
  });

  it("respects skipOpencode option", async () => {
    await init(tempDir, "0.0.1", { skipOpencode: true });

    await update(tempDir, "0.0.2", { skipOpencode: true });

    const manifest = JSON.parse(readFile(tempDir, ".ai/.ai-kit")!);
    expect(manifest.rootFiles).toEqual([]);
  });
});
