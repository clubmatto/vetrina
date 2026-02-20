import { describe, it, expect, beforeEach } from "vitest";
import { sync } from "../src/commands/sync.js";
import { createTempDir, readFile, fileExists } from "./utils.js";
import { testLog, findLogs, getLastLog } from "./output.js";

describe("sync command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    testLog.clear();
  });

  it("initializes when not already initialized", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    expect(fileExists(tempDir, ".agents/.ai-kit")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules")).toBe(true);
    expect(fileExists(tempDir, "opencode.json")).toBe(true);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("skips root files when skipOpencode is true", async () => {
    await sync(tempDir, "0.0.1", { skipOpencode: true }, testLog);

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("writes correct manifest on init", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.rootFiles).toContain("opencode.json");
  });

  it("does not re-initialize if already at latest version", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    await sync(tempDir, "0.0.1", {}, testLog);

    const lastLog = getLastLog();
    expect(lastLog).toEqual(["success", "Already at latest version (0.0.1)"]);
  });

  it("updates when version differs", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    await sync(tempDir, "0.0.2", {}, testLog);

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.2");
  });

  it("respects skipOpencode option on update", async () => {
    await sync(tempDir, "0.0.1", { skipOpencode: true }, testLog);

    await sync(tempDir, "0.0.2", { skipOpencode: true }, testLog);

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.rootFiles).toEqual([]);
  });

  it("includes commands in opencode.json", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const opencodeJson = JSON.parse(readFile(tempDir, "opencode.json")!);
    expect(opencodeJson).toHaveProperty("command");
    expect(opencodeJson.command).toHaveProperty("commit");
    expect(opencodeJson.command.commit.description).toBe(
      "Commit the work done in this session with a structured commit message.",
    );
  });

  it("processes template variables in content files", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const ruleFiles = readFile(tempDir, ".agents/rules/typescript.md");
    expect(ruleFiles).toContain("Last updated:");
    expect(ruleFiles).not.toContain("{{FOOTER}}");
    expect(ruleFiles).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("processes template variables in AGENTS.md", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).not.toContain("{{AGENTS_FOOTER}}");
    expect(agentsMd).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("logs output correctly", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const logs = testLog.get();
    expect(logs[logs.length - 1][0]).toBe("final");
    expect(logs[logs.length - 1][1]).toBe("ai-kit initialized");
  });

  it("logs all synced files", async () => {
    await sync(tempDir, "0.0.1", {}, testLog);

    const successLogs = findLogs("success");
    expect(successLogs.length).toBeGreaterThan(0);
    expect(successLogs.some(([, msg]) => msg.includes("rules/"))).toBe(true);
    expect(successLogs.some(([, msg]) => msg === "opencode.json")).toBe(true);
    expect(successLogs.some(([, msg]) => msg === "AGENTS.md")).toBe(true);
  });
});
