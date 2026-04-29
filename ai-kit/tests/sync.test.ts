import { describe, it, expect, beforeEach } from "vitest";
import { sync, SourceDirs } from "../src/cmd/sync";
import { createTempDir, readFile, fileExists } from "./utils";
import { testLog, findLogs, getLastLog } from "./output";
import { join } from "path";
import { mkdirSync, writeFileSync } from "fs";

const fixturesDir = join(__dirname, "fixtures");
const testSourceDirs: SourceDirs = {
  rules: join(fixturesDir, "rules"),
  skills: join(fixturesDir, "skills"),
  agents: join(fixturesDir, "agents"),
  commands: join(fixturesDir, "commands"),
};

const rootDir = join(__dirname, "..");
const defaultSourceDirs: SourceDirs = {
  rules: join(rootDir, "src", "rules"),
  skills: join(rootDir, "src", "skills"),
  agents: join(rootDir, "src", "agents"),
  commands: join(rootDir, "src", "commands"),
};

function createProject(dir: string, files: Record<string, string>): void {
  for (const [relativePath, content] of Object.entries(files)) {
    const fullPath = join(dir, relativePath);
    const dirPath = join(fullPath, "..");
    if (!fileExists(dir, dirPath)) {
      mkdirSync(dirPath, { recursive: true });
    }
    writeFileSync(fullPath, content);
  }
}

describe("sync command", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    testLog.clear();
  });

  it("initializes when not already initialized", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    expect(fileExists(tempDir, ".agents/.ai-kit")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules")).toBe(true);
    expect(fileExists(tempDir, "opencode.json")).toBe(true);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("skips opencode.json when skipOpencode is true", async () => {
    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      testSourceDirs,
    );

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("writes correct manifest on init", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.1");
    expect(manifest.rootFiles).toContain("opencode.json");
  });

  it("does not re-initialize if already at latest version", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const lastLog = getLastLog();
    expect(lastLog).toEqual(["success", "Already at latest version (0.0.1)"]);
  });

  it("updates when version differs", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    await sync(tempDir, "0.0.2", {}, testLog, testSourceDirs);

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.version).toBe("0.0.2");
  });

  it("respects skipOpencode option on update", async () => {
    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      testSourceDirs,
    );

    await sync(
      tempDir,
      "0.0.2",
      { skipOpencode: true },
      testLog,
      testSourceDirs,
    );

    const manifest = JSON.parse(readFile(tempDir, ".agents/.ai-kit")!);
    expect(manifest.rootFiles).toEqual([]);
  });

  it("includes commands in opencode.json", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const opencodeJson = JSON.parse(readFile(tempDir, "opencode.json")!);
    expect(opencodeJson).toHaveProperty("command");
    expect(opencodeJson.command).toHaveProperty("commit");
    expect(opencodeJson.command.commit.description).toBe(
      "Commit the work done in this session with a structured commit message.",
    );
  });

  it("processes template variables in content files", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const ruleFiles = readFile(tempDir, ".agents/rules/typescript.md");
    expect(ruleFiles).toContain("Last updated:");
    expect(ruleFiles).not.toContain("{{FOOTER}}");
    expect(ruleFiles).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("processes template variables in AGENTS.md", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).not.toContain("{{AGENTS_FOOTER}}");
    expect(agentsMd).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("logs output correctly", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const logs = testLog.get();
    expect(logs[logs.length - 1][0]).toBe("summary");
  });

  it("logs all synced files", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const successLogs = findLogs("success");
    expect(successLogs.length).toBeGreaterThan(0);
    expect(successLogs.some(([, msg]) => msg.includes(".md"))).toBe(true);
    expect(successLogs.some(([, msg]) => msg === "opencode.json")).toBe(true);
    expect(successLogs.some(([, msg]) => msg === "AGENTS.md")).toBe(true);
  });
});

describe("sync with language detection", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
    testLog.clear();
  });

  it("installs only detected language rules for TypeScript project", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "index.ts": 'console.log("test");',
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/plan-mode.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/unsure.md")).toBe(true);
  });

  it("installs only detected language rules for Go project", async () => {
    createProject(tempDir, {
      "go.mod": "module test",
      "main.go": "package main",
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/plan-mode.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/unsure.md")).toBe(true);
  });

  it("installs all language rules with --all-rules flag", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true, allRules: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/plan-mode.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/unsure.md")).toBe(true);
  });

  it("installs specified languages with --languages flag", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true, languages: ["go", "kotlin"] },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(false);
  });

  it("uses single-repo AGENTS.md for single language project", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "index.ts": 'console.log("test");',
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).not.toContain("{{LANGUAGE}}");
    expect(agentsMd).not.toContain("{{LANGUAGE_RULE_FILE}}");
    expect(agentsMd).toContain("typescript");
    expect(agentsMd).toMatch(/uses typescript\. Follow/);
    expect(agentsMd).toContain("typescript.md");
    expect(agentsMd).not.toContain("monorepo");
  });

  it("uses monorepo AGENTS.md for multi-language project", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
      "go.mod": "module test",
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("monorepo");
  });

  it("uses monorepo AGENTS.md with --monorepo flag", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true, monorepo: true },
      testLog,
      defaultSourceDirs,
    );

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("monorepo");
  });

  it("uses single-repo AGENTS.md with --single-repo flag", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "go.mod": "module test",
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true, singleRepo: true },
      testLog,
      defaultSourceDirs,
    );

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("typescript");
    expect(agentsMd).not.toContain("monorepo");
  });

  it("falls back to all rules for empty directory", async () => {
    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(true);
  });
});
