import { describe, it, expect, beforeEach, vi } from "vitest";
import { init } from "../src/commands/init.js";
import { createTempDir, cleanupDir, readFile, fileExists } from "./utils.js";

describe("init command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("creates .ai directory with content files", async () => {
    await init(tempDir, "0.0.1", {});

    expect(fileExists(tempDir, ".ai/.ai-kit")).toBe(true);
    expect(fileExists(tempDir, ".ai/commands/commit.md")).toBe(true);
    expect(fileExists(tempDir, ".ai/commands/interview.md")).toBe(true);
    expect(fileExists(tempDir, ".ai/commands/synth.md")).toBe(true);
    expect(fileExists(tempDir, ".ai/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".ai/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".ai/skills/SKILL.md")).toBe(true);
  });

  it("creates root files (opencode.json and AGENTS.md)", async () => {
    await init(tempDir, "0.0.1", {});

    expect(fileExists(tempDir, "opencode.json")).toBe(true);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("skips root files when skipOpencode is true", async () => {
    await init(tempDir, "0.0.1", { skipOpencode: true });

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("writes correct manifest", async () => {
    await init(tempDir, "0.0.1", {});

    const manifest = JSON.parse(readFile(tempDir, ".ai/.ai-kit")!);
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.rootFiles).toContain("opencode.json");
  });

  it("does not re-initialize if already initialized", async () => {
    await init(tempDir, "0.0.1", {});
    const consoleLog = vi.spyOn(console, "log");

    await init(tempDir, "0.0.1", {});

    expect(consoleLog).toHaveBeenCalledWith(
      'Already initialized. Use "ai-kit update" to sync.',
    );
  });
});
