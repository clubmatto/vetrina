import { describe, it, expect, beforeEach } from "vitest";
import { execSync } from "child_process";
import { join } from "path";
import { fileExists, createTempDir, readFile } from "../utils.js";

const projectRoot = join(__dirname, "..", "..");

describe("CLI integration", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = createTempDir();
  });

  it("runs as CLI and syncs files", () => {
    execSync(`node ${join(projectRoot, "dist", "src", "index.js")} sync`, {
      cwd: tempDir,
    });

    expect(fileExists(tempDir, ".agents/.ai-kit")).toBe(true);
    expect(fileExists(tempDir, ".agents/rules")).toBe(true);
    expect(fileExists(tempDir, "opencode.json")).toBe(true);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });

  it("creates rules with templated content", () => {
    execSync(`node ${join(projectRoot, "dist", "src", "index.js")} sync`, {
      cwd: tempDir,
    });

    const ruleContent = readFile(tempDir, ".agents/rules/typescript.md");
    expect(ruleContent).toContain("Last updated:");
    expect(ruleContent).not.toContain("{{FOOTER}}");
    expect(ruleContent).toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it("injects commands into opencode.json", () => {
    execSync(`node ${join(projectRoot, "dist", "src", "index.js")} sync`, {
      cwd: tempDir,
    });

    const opencodeJson = JSON.parse(readFile(tempDir, "opencode.json")!);
    expect(opencodeJson).toHaveProperty("command");
  });

  it("skips root files when --skip-opencode is passed", () => {
    execSync(
      `node ${join(projectRoot, "dist", "src", "index.js")} sync --skip-opencode`,
      { cwd: tempDir },
    );

    expect(fileExists(tempDir, "opencode.json")).toBe(false);
    expect(fileExists(tempDir, "AGENTS.md")).toBe(true);
  });
});
