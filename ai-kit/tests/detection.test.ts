import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { hasAnyConfigFile, hasAnySourceFile } from "../src/detection/scanner";
import {
  detectLanguages,
  getRuleFilesForLanguages,
  getAllRuleFiles,
  isLanguageSpecificRule,
} from "../src/detection/detect";

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "ai-kit-detection-test-"));
}

describe("scanner", () => {
  describe("hasAnyConfigFile", () => {
    it("returns true when config file exists at root", () => {
      const dir = createTestDir();
      writeFileSync(join(dir, "package.json"), "{}");
      expect(hasAnyConfigFile(dir, ["package.json"])).toBe(true);
    });

    it("returns false when config file does not exist", () => {
      const dir = createTestDir();
      expect(hasAnyConfigFile(dir, ["package.json"])).toBe(false);
    });

    it("returns true when any of multiple config files exist", () => {
      const dir = createTestDir();
      writeFileSync(join(dir, "go.mod"), "module test");
      expect(
        hasAnyConfigFile(dir, ["package.json", "go.mod", "Cargo.toml"]),
      ).toBe(true);
    });
  });

  describe("hasAnySourceFile", () => {
    it("returns true when source file with matching extension exists", () => {
      const dir = createTestDir();
      writeFileSync(join(dir, "index.ts"), "console.log('test');");
      expect(hasAnySourceFile(dir, [".ts", ".js"], 2)).toBe(true);
    });

    it("returns false when no matching source files exist", () => {
      const dir = createTestDir();
      writeFileSync(join(dir, "README.md"), "# Project");
      expect(hasAnySourceFile(dir, [".ts", ".js"], 2)).toBe(false);
    });

    it("finds source files in nested directories within depth limit", () => {
      const dir = createTestDir();
      mkdirSync(join(dir, "src", "utils"), { recursive: true });
      writeFileSync(
        join(dir, "src", "utils", "helper.ts"),
        "export const x = 1;",
      );
      expect(hasAnySourceFile(dir, [".ts"], 2)).toBe(true);
    });

    it("does not find source files beyond depth limit", () => {
      const dir = createTestDir();
      mkdirSync(join(dir, "src", "deep", "nested", "path"), {
        recursive: true,
      });
      writeFileSync(
        join(dir, "src", "deep", "nested", "path", "file.ts"),
        "export const x = 1;",
      );
      expect(hasAnySourceFile(dir, [".ts"], 2)).toBe(false);
    });

    it("ignores node_modules and other ignored directories", () => {
      const dir = createTestDir();
      mkdirSync(join(dir, "node_modules", "some-package"), {
        recursive: true,
      });
      writeFileSync(
        join(dir, "node_modules", "some-package", "index.ts"),
        "export const x = 1;",
      );
      expect(hasAnySourceFile(dir, [".ts"], 2)).toBe(false);
    });
  });
});

describe("detectLanguages", () => {
  it("returns empty result for empty directory", () => {
    const dir = createTestDir();
    const result = detectLanguages(dir);
    expect(result.languages).toEqual([]);
    expect(result.isMonorepo).toBe(false);
    expect(result.primaryLanguage).toBeUndefined();
  });

  it("detects TypeScript via package.json", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
    expect(result.isMonorepo).toBe(false);
    expect(result.primaryLanguage).toBe("typescript");
  });

  it("detects TypeScript via .ts files when no config", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "index.ts"), "console.log('test');");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
    expect(result.isMonorepo).toBe(false);
  });

  it("detects Go via go.mod", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "go.mod"), "module test");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("go");
    expect(result.isMonorepo).toBe(false);
    expect(result.primaryLanguage).toBe("go");
  });

  it("detects Go via .go files when no config", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "main.go"), "package main");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("go");
  });

  it("detects Kotlin via build.gradle", () => {
    const dir = createTestDir();
    writeFileSync(
      join(dir, "build.gradle"),
      "plugins { id 'org.jetbrains.kotlin.jvm' }",
    );
    const result = detectLanguages(dir);
    expect(result.languages).toContain("kotlin");
  });

  it("detects Kotlin via build.gradle.kts", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "build.gradle.kts"), 'plugins { kotlin("jvm") }');
    const result = detectLanguages(dir);
    expect(result.languages).toContain("kotlin");
  });

  it("detects Kotlin via pom.xml", () => {
    const dir = createTestDir();
    writeFileSync(
      join(dir, "pom.xml"),
      '<?xml version="1.0"?><project><modelVersion>4.0.0</modelVersion></project>',
    );
    const result = detectLanguages(dir);
    expect(result.languages).toContain("kotlin");
  });

  it("detects multiple languages as monorepo", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    writeFileSync(join(dir, "go.mod"), "module test");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
    expect(result.languages).toContain("go");
    expect(result.isMonorepo).toBe(true);
    expect(result.primaryLanguage).toBe("typescript"); // First detected
  });

  it("detects Go even with package.json present", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    writeFileSync(join(dir, "go.mod"), "module test");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("go");
    expect(result.languages).toContain("typescript");
  });
});

describe("getRuleFilesForLanguages", () => {
  it("returns rule file for single language", () => {
    const ruleFiles = getRuleFilesForLanguages(["typescript"]);
    expect(ruleFiles).toEqual(["typescript.md"]);
  });

  it("returns rule files for multiple languages", () => {
    const ruleFiles = getRuleFilesForLanguages(["typescript", "go", "kotlin"]);
    expect(ruleFiles).toContain("typescript.md");
    expect(ruleFiles).toContain("go.md");
    expect(ruleFiles).toContain("kotlin.md");
  });

  it("returns empty array for unknown language", () => {
    const ruleFiles = getRuleFilesForLanguages(["unknown-language"]);
    expect(ruleFiles).toEqual([]);
  });

  it("handles empty language array", () => {
    const ruleFiles = getRuleFilesForLanguages([]);
    expect(ruleFiles).toEqual([]);
  });
});

describe("getAllRuleFiles", () => {
  it("returns all language rule files", () => {
    const ruleFiles = getAllRuleFiles();
    expect(ruleFiles).toContain("typescript.md");
    expect(ruleFiles).toContain("go.md");
    expect(ruleFiles).toContain("kotlin.md");
  });
});

describe("isLanguageSpecificRule", () => {
  it("returns true for language-specific rules", () => {
    expect(isLanguageSpecificRule("typescript.md")).toBe(true);
    expect(isLanguageSpecificRule("go.md")).toBe(true);
    expect(isLanguageSpecificRule("kotlin.md")).toBe(true);
  });

  it("returns false for generic rules", () => {
    expect(isLanguageSpecificRule("plan-mode.md")).toBe(false);
    expect(isLanguageSpecificRule("unsure.md")).toBe(false);
    expect(isLanguageSpecificRule("nested-rule.md")).toBe(false);
  });
});

describe("edge cases", () => {
  it("detects Kotlin via .kt files without config", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "Main.kt"), "fun main() {}");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("kotlin");
  });

  it("detects TypeScript via .tsx files without config", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "Component.tsx"), "export const x = 1;");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
  });

  it("ignores files in node_modules", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, "node_modules", "some-package"), { recursive: true });
    writeFileSync(
      join(dir, "node_modules", "some-package", "index.ts"),
      "export const x = 1;",
    );
    writeFileSync(join(dir, "package.json"), "{}");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
  });

  it("ignores .git directory", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, ".git", "objects"), { recursive: true });
    writeFileSync(join(dir, ".git", "config"), "git config content");
    writeFileSync(join(dir, "package.json"), "{}");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
  });

  it("primaryLanguage is first detected language", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "go.mod"), "module test");
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    const result = detectLanguages(dir);
    expect(result.primaryLanguage).toBe("typescript"); // TypeScript detected first
  });
});
