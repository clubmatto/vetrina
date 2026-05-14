import { describe, it, expect } from "vitest";
import { mkdirSync, writeFileSync, mkdtempSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { scanTree } from "../src/detection/scanner";
import {
  detectLanguages,
  getRuleFilesForLanguages,
  getAllRuleFiles,
  isLanguageSpecificRule,
} from "../src/detection/detect";

function createTestDir(): string {
  return mkdtempSync(join(tmpdir(), "ai-kit-detection-test-"));
}

function createFiles(dir: string, files: string[]): void {
  for (const file of files) {
    const fullPath = join(dir, file);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, "");
  }
}

describe("scanner", () => {
  describe("scanTree", () => {
    it("returns empty for empty directory", () => {
      const dir = createTestDir();
      const result = scanTree(dir);
      expect(result.allFiles).toEqual([]);
      expect(result.rootFiles).toEqual([]);
    });

    it("finds files at root", () => {
      const dir = createTestDir();
      createFiles(dir, ["package.json", "index.ts"]);
      const result = scanTree(dir);
      expect(result.rootFiles).toContain("package.json");
      expect(result.rootFiles).toContain("index.ts");
    });

    it("finds files in nested directories", () => {
      const dir = createTestDir();
      createFiles(dir, ["src/utils/helper.ts"]);
      const result = scanTree(dir, 3);
      expect(result.allFiles).toContain("src/utils/helper.ts");
    });

    it("respects max depth", () => {
      const dir = createTestDir();
      createFiles(dir, ["src/deep/nested/path/file.ts"]);
      const result = scanTree(dir, 2);
      expect(result.allFiles).not.toContain("src/deep/nested/path/file.ts");
    });

    it("excludes node_modules directory", () => {
      const dir = createTestDir();
      createFiles(dir, ["node_modules/some-pkg/index.ts", "src/index.ts"]);
      const result = scanTree(dir);
      expect(result.allFiles).toContain("src/index.ts");
      expect(result.allFiles).not.toContain("node_modules/some-pkg/index.ts");
    });

    it("excludes .git directory", () => {
      const dir = createTestDir();
      createFiles(dir, [".git/config", "package.json"]);
      const result = scanTree(dir);
      expect(result.rootFiles).toContain("package.json");
      expect(result.allFiles).not.toContain(".git/config");
    });

    it("excludes dist and build directories", () => {
      const dir = createTestDir();
      createFiles(dir, ["dist/output.js", "build/output.js", "src/index.ts"]);
      const result = scanTree(dir);
      expect(result.allFiles).toContain("src/index.ts");
      expect(result.allFiles).not.toContain("dist/output.js");
      expect(result.allFiles).not.toContain("build/output.js");
    });

    it("separates root files from nested files", () => {
      const dir = createTestDir();
      createFiles(dir, [
        "package.json",
        "go.mod",
        "src/main.go",
        "src/utils/helper.ts",
      ]);
      const result = scanTree(dir);
      expect(result.rootFiles).toEqual(
        expect.arrayContaining(["package.json", "go.mod"]),
      );
      expect(result.rootFiles).not.toContain("src/main.go");
      expect(result.allFiles).toContain("src/main.go");
      expect(result.allFiles).toContain("src/utils/helper.ts");
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
    writeFileSync(join(dir, "index.ts"), 'console.log("test");');
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
    expect(result.primaryLanguage).toBe("typescript");
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

describe("detectLanguages — improved monorepo detection", () => {
  it("detects Go from go.mod in subdirectory", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, "services", "api"), { recursive: true });
    writeFileSync(join(dir, "services", "api", "go.mod"), "module test");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("go");
  });

  it("detects both TypeScript and Go when go.mod is in subdirectory", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    mkdirSync(join(dir, "services", "api"), { recursive: true });
    writeFileSync(join(dir, "services", "api", "go.mod"), "module test");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
    expect(result.languages).toContain("go");
    expect(result.isMonorepo).toBe(true);
  });

  it("detects Kotlin from .kt files in nested subdirectory", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, "src", "main", "kotlin"), { recursive: true });
    writeFileSync(
      join(dir, "src", "main", "kotlin", "App.kt"),
      "fun main() {}",
    );
    const result = detectLanguages(dir);
    expect(result.languages).toContain("kotlin");
  });

  it("detects both TypeScript config and Go source in subdirectories", () => {
    const dir = createTestDir();
    writeFileSync(join(dir, "package.json"), '{"name": "test"}');
    mkdirSync(join(dir, "cmd", "server"), { recursive: true });
    writeFileSync(join(dir, "cmd", "server", "main.go"), "package main");
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
    expect(result.languages).toContain("go");
  });

  it("detects TypeScript from package.json in monorepo sub-package", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, "packages", "web"), { recursive: true });
    writeFileSync(
      join(dir, "packages", "web", "package.json"),
      '{"name": "web"}',
    );
    const result = detectLanguages(dir);
    expect(result.languages).toContain("typescript");
  });

  it("does not detect files in ignored directories", () => {
    const dir = createTestDir();
    mkdirSync(join(dir, "dist"), { recursive: true });
    writeFileSync(join(dir, "dist", "bundle.go"), "package main");
    const result = detectLanguages(dir);
    expect(result.languages).not.toContain("go");
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
    expect(result.primaryLanguage).toBe("typescript");
  });
});
