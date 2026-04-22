import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "child_process";
import { join } from "path";
import { fileExists, createTempDir, readFile } from "../utils";
import { mkdirSync, writeFileSync } from "fs";

const projectRoot = join(__dirname, "..", "..");

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

function runCli(args: string, cwd: string): void {
  execSync(`node ${join(projectRoot, "dist", "src", "index.js")} ${args}`, {
    cwd,
  });
}

describe("CLI language detection options", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  it("--all-rules installs all language rules", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
    });

    runCli("sync --skip-opencode --all-rules", tempDir);

    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(true);
  });

  it("--languages installs specified languages only", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
    });

    runCli("sync --skip-opencode --languages=go,kotlin", tempDir);

    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/kotlin.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(false);
  });

  it("--monorepo forces monorepo AGENTS.md template", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "index.ts": 'console.log("test");',
    });

    runCli("sync --skip-opencode --monorepo", tempDir);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("monorepo");
  });

  it("--single-repo forces single-repo AGENTS.md template", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "index.ts": 'console.log("test");',
    });

    runCli("sync --skip-opencode --single-repo", tempDir);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("typescript");
    expect(agentsMd).toContain("typescript.md");
    expect(agentsMd).not.toContain("monorepo");
  });

  it("auto-detects TypeScript and uses single-repo template", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
      "index.ts": 'console.log("test");',
    });

    runCli("sync --skip-opencode", tempDir);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("typescript");
    expect(agentsMd).not.toContain("monorepo");
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(false);
  });

  it("auto-detects multi-language and uses monorepo template", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
      "go.mod": "module test",
    });

    runCli("sync --skip-opencode", tempDir);

    const agentsMd = readFile(tempDir, "AGENTS.md");
    expect(agentsMd).toContain("monorepo");
  });

  it("plan-mode and unsure rules are always installed", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test-ts"}',
    });

    runCli("sync --skip-opencode", tempDir);

    expect(fileExists(tempDir, ".agents/rules/plan-mode.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/unsure.md")).toBe(true);
  });

  it("combines --languages with --skip-opencode", () => {
    createProject(tempDir, {
      "package.json": '{"name": "test"}',
    });

    runCli("sync --skip-opencode --languages=go", tempDir);

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, ".agents/rules/go.md")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules/typescript.md")).toBe(false);
  });
});
