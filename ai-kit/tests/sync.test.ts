import { describe, it, expect, beforeEach, vi } from "vitest";
import { sync } from "../src/commands/sync.js";
import { createTempDir, readFile, fileExists } from "./utils.js";

describe("sync command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    vi.spyOn(console, "log").mockImplementation(() => {});
  });

  it("initializes when not already initialized", async () => {
    await sync(tempDir, "0.0.1", {});

    expect(fileExists(tempDir, ".agents/.ai-kit")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules")).toBe(true);
    expect(fileExists(tempDir, "opencode.json")).toBe(true);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("skips root files when skipOpencode is true", async () => {
    await sync(tempDir, "0.0.1", { skipOpencode: true });

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("writes correct manifest on init", async () => {
    await sync(tempDir, "0.0.1", {});

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.rootFiles).toContain("opencode.json");
  });

  it("does not re-initialize if already at latest version", async () => {
    await sync(tempDir, "0.0.1", {});
    const consoleLog = vi.spyOn(console, "log");

    await sync(tempDir, "0.0.1", {});

    expect(consoleLog).toHaveBeenCalledWith(
      "Already at latest version (0.0.1)",
    );
  });

  it("updates when version differs", async () => {
    await sync(tempDir, "0.0.1", {});

    await sync(tempDir, "0.0.2", {});

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.2");
  });

  it("respects skipOpencode option on update", async () => {
    await sync(tempDir, "0.0.1", { skipOpencode: true });

    await sync(tempDir, "0.0.2", { skipOpencode: true });

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.rootFiles).toEqual([]);
  });

  it("includes commands in opencode.json", async () => {
    await sync(tempDir, "0.0.1", {});

    const opencodeJson = JSON.parse(readFile(tempDir, "opencode.json")!);
    expect(opencodeJson).toHaveProperty("command");
    expect(opencodeJson.command).toHaveProperty("commit");
    expect(opencodeJson.command.commit.description).toBe(
      "Commit the work done in this session with a structured commit message.",
    );
  });

  it("processes template variables in content files", async () => {
    await sync(tempDir, "0.0.1", {});

    const ruleFiles = readFile(tempDir, ".agents/rules/typescript.md");
    expect(ruleFiles).toContain("Last updated:");
    expect(ruleFiles).not.toContain("{{FOOTER}}");
    expect(ruleFiles).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("processes template variables in AGENTS.md", async () => {
    await sync(tempDir, "0.0.1", {});

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).not.toContain("{{AGENTS_FOOTER}}");
    expect(agentsMd).toMatch(/\d{4}-\d{2}-\d{2}/);
  });
});
