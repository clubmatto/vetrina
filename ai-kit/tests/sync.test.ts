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
    expect(manifest.files).toBeDefined();
    expect(manifest.files["opencode.json"]).toBeDefined();
    expect(manifest.files["opencode.json"].sourceHash).toBeTruthy();
  });

  it("skips unchanged files on repeated sync", async () => {
    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);
    testLog.clear();

    await sync(tempDir, "0.0.1", {}, testLog, testSourceDirs);

    const lastLog = getLastLog();
    expect(lastLog![0]).toBe("summary");
    const counts = JSON.parse(lastLog![1]);
    expect(counts.skipped).toBeGreaterThan(0);
    expect(counts.added).toBe(0);
    expect(counts.updated).toBe(0);
  });

  it("updates files when source content changes", async () => {
    const customRulesDir = join(tempDir, "custom-rules");
    mkdirSync(customRulesDir, { recursive: true });
    writeFileSync(join(customRulesDir, "test-rule.md"), "# Version 1");

    const customSourceDirs: SourceDirs = {
      ...testSourceDirs,
      rules: customRulesDir,
    };

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      customSourceDirs,
    );

    expect(readFile(tempDir, ".agents/rules/test-rule.md")).toContain(
      "Version 1",
    );

    testLog.clear();
    writeFileSync(join(customRulesDir, "test-rule.md"), "# Version 2");

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      customSourceDirs,
    );

    expect(readFile(tempDir, ".agents/rules/test-rule.md")).toContain(
      "Version 2",
    );

    const updates = testLog
      .get()
      .filter(([type]) => type === "success")
      .filter(([, msg]) => msg.startsWith("~"));
    expect(updates.length).toBe(1);
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
    createProject(tempDir, { "package.json": "{}" });
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
    expect(successLogs.some(([, msg]) => msg.includes("opencode.json"))).toBe(
      true,
    );
    expect(successLogs.some(([, msg]) => msg === "+ AGENTS.md")).toBe(true);
  });

  it("removes orphaned rules when language is no longer detected", async () => {
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
  });

  it("preserves user-added MCP servers on re-sync", async () => {
    const agentsDir = join(tempDir, "agents");
    mkdirSync(agentsDir, { recursive: true });
    writeFileSync(
      join(agentsDir, "opencode.json"),
      JSON.stringify({ mcp: { aiServer: {} } }, null, 2) + "\n",
    );
    writeFileSync(join(agentsDir, "monorepo.md"), "# Agents\n");

    const sourceDirs: SourceDirs = {
      ...testSourceDirs,
      agents: agentsDir,
    };

    await sync(tempDir, "0.0.1", {}, testLog, sourceDirs);
    expect(readFile(tempDir, "opencode.json")).toContain("aiServer");

    const existing = JSON.parse(readFile(tempDir, "opencode.json")!);
    existing.mcp.userServer = { type: "local", command: ["echo", "test"] };
    writeFileSync(
      join(tempDir, "opencode.json"),
      JSON.stringify(existing, null, 2) + "\n",
    );

    writeFileSync(
      join(agentsDir, "opencode.json"),
      JSON.stringify({ mcp: { aiServer: { version: 2 } } }, null, 2) + "\n",
    );

    testLog.clear();
    await sync(tempDir, "0.0.2", {}, testLog, sourceDirs);

    const updated = JSON.parse(readFile(tempDir, "opencode.json")!);
    expect(updated.mcp.userServer).toBeDefined();
    expect(updated.mcp.userServer.command).toEqual(["echo", "test"]);
    expect(updated.mcp.aiServer.version).toBe(2);
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
    expect(agentsMd).toMatch(/uses typescript\. Begin/);
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

  it("installs only generic rules for empty directory", async () => {
    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/plan-mode.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/unsure.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(false);
  });

  it("detects languages from config files in subdirectories", async () => {
    createProject(tempDir, {
      "services/api/go.mod": "module test",
      "services/api/main.go": "package main",
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
  });

  it("detects multiple languages from source files in nested directories", async () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
      "cmd/server/main.go": "package main",
    });

    await sync(
      tempDir,
      "0.0.1",
      { skipOpencode: true },
      testLog,
      defaultSourceDirs,
    );

    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("monorepo");
  });
});
