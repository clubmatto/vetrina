import { describe, it, expect } from "vitest";
import { join } from "path";
import {
  getCommandConfig,
  readContent,
  readConfigs,
  readAgents,
} from "../src/reader";
import { processTemplate } from "../src/template";

const fixturesDir = join(__dirname, "fixtures");
const commandsDir = join(fixturesDir, "commands");
const rulesDir = join(fixturesDir, "rules");
const skillsDir = join(fixturesDir, "skills");
const agentsDir = join(fixturesDir, "agents");

describe("getCommandConfig", () => {
  it("parses command files and returns config object", () => {
    const config = getCommandConfig(commandsDir);

    expect(config).toHaveProperty("test");
    expect(config.test.description).toBe(
      "A test command for testing purposes.",
    );
    expect(config.test.template).toContain("This is a test command template.");
  });

  it("includes all command files", () => {
    const config = getCommandConfig(commandsDir);

    expect(config).toHaveProperty("test");
    expect(config).toHaveProperty("another");
  });

  it("has correct structure for opencode.json command format", () => {
    const config = getCommandConfig(commandsDir);

    for (const [_, cmd] of Object.entries(config)) {
      expect(cmd).toHaveProperty("description");
      expect(cmd).toHaveProperty("template");
      expect(typeof cmd.description).toBe("string");
      expect(typeof cmd.template).toBe("string");
    }
  });

  it("returns empty object for non-existent directory", () => {
    const config = getCommandConfig("/non/existent/dir");
    expect(config).toEqual({});
  });
});

describe("readContent", () => {
  it("returns files from rules and skills directories", () => {
    const files = readContent(rulesDir, skillsDir);

    const ruleFiles = files.filter((f) => f.type === "rules");
    const skillFiles = files.filter((f) => f.type === "skills");

    expect(ruleFiles.length).toBeGreaterThan(0);
    expect(skillFiles.length).toBeGreaterThan(0);
  });

  it("includes nested files recursively", () => {
    const files = readContent(rulesDir, skillsDir);

    const nestedRule = files.find(
      (f) => f.name === "nested/nested-rule.md" && f.type === "rules",
    );
    expect(nestedRule).toBeDefined();
    expect(nestedRule?.content).toContain("Nested Rule");
  });

  it("returns correct file structure", () => {
    const files = readContent(rulesDir, skillsDir);

    for (const file of files) {
      expect(file).toHaveProperty("type");
      expect(file).toHaveProperty("name");
      expect(file).toHaveProperty("content");
      expect(["rules", "skills"]).toContain(file.type);
      expect(file.name.endsWith(".md")).toBe(true);
    }
  });

  it("includes skill directory name in file path", () => {
    const files = readContent(rulesDir, skillsDir);

    const skillFile = files.find(
      (f) => f.type === "skills" && f.name === "test-skill/SKILL.md",
    );
    expect(skillFile).toBeDefined();
    expect(skillFile?.content).toContain("Test Skill");
  });

  it("includes additional files in skill directories", () => {
    const files = readContent(rulesDir, skillsDir);

    const detailsFile = files.find(
      (f) => f.type === "skills" && f.name === "test-skill/skill-details.md",
    );
    expect(detailsFile).toBeDefined();
    expect(detailsFile?.content).toContain("Skill Details");
  });

  it("includes nested references in skill directories", () => {
    const files = readContent(rulesDir, skillsDir);

    const refFile = files.find(
      (f) => f.type === "skills" && f.name === "test-skill/nested-refs/doc.md",
    );
    expect(refFile).toBeDefined();
  });
});

describe("readConfigs", () => {
  it("returns JSON files from agents directory", () => {
    const files = readConfigs(agentsDir);

    expect(files.length).toBe(2);
    expect(files.map((f) => f.name).sort()).toEqual([
      "another.json",
      "opencode.json",
    ]);
  });

  it("returns file content as string", () => {
    const files = readConfigs(agentsDir);

    const opencodeFile = files.find((f) => f.name === "opencode.json");
    expect(opencodeFile?.content).toContain("test-agent");
  });

  it("returns empty array for non-existent directory", () => {
    const files = readConfigs("/non/existent/dir");
    expect(files).toEqual([]);
  });
});

describe("readAgents", () => {
  it("returns AGENTS.md file content", () => {
    const file = readAgents(agentsDir);

    expect(file).not.toBeNull();
    expect(file?.name).toBe("AGENTS.md");
    expect(file?.content).toContain("AGENTS.md");
  });

  it("returns null when monorepo.md does not exist", () => {
    const file = readAgents(rulesDir);
    expect(file).toBeNull();
  });

  it("replaces {{LANGUAGE}} and {{LANGUAGE_RULE_FILE}} for single-repo", () => {
    const file = readAgents(agentsDir, false, "typescript");

    expect(file).not.toBeNull();
    expect(file?.content).not.toContain("{{LANGUAGE}}");
    expect(file?.content).not.toContain("{{LANGUAGE_RULE_FILE}}");
    expect(file?.content).toContain("typescript");
    expect(file?.content).toMatch(/uses typescript\. Follow/);
    expect(file?.content).toContain("typescript.md");
  });

  it("does not replace language placeholders for monorepo", () => {
    const file = readAgents(agentsDir, true, "typescript");

    expect(file).not.toBeNull();
    expect(file?.content).not.toContain("{{LANGUAGE}}");
  });

  it("handles missing primaryLanguage gracefully for single-repo", () => {
    const file = readAgents(agentsDir, false);

    expect(file).not.toBeNull();
    expect(file?.content).toContain("{{LANGUAGE}}");
  });
});

describe("processTemplate", () => {
  it("replaces {{FOOTER}} with full footer text and ISO date", () => {
    const result = processTemplate("{{FOOTER}}");
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(
      `Last updated: ${today}. This file extends the global rules in @AGENTS.md. Always check both files.`,
    );
  });

  it("replaces {{AGENTS_FOOTER}} with agents footer text and ISO date", () => {
    const result = processTemplate("{{AGENTS_FOOTER}}");
    const today = new Date().toISOString().split("T")[0];
    expect(result).toBe(
      `This file was last updated: ${today}. Always check the \`.agents/rules/\` directory for the most current language-specific guidelines.`,
    );
  });

  it("replaces multiple placeholders in same content", () => {
    const result = processTemplate("{{FOOTER}} and {{AGENTS_FOOTER}}");
    const today = new Date().toISOString().split("T")[0];
    expect(result).toContain(`Last updated: ${today}`);
    expect(result).toContain(`This file was last updated: ${today}`);
  });

  it("leaves non-matching content unchanged", () => {
    const input = "Some {{OTHER}} content {{NOTREAL}}";
    const result = processTemplate(input);
    expect(result).toBe(input);
  });

  it("handles empty string", () => {
    const result = processTemplate("");
    expect(result).toBe("");
  });

  it("handles content without placeholders", () => {
    const result = processTemplate("No placeholders here");
    expect(result).toBe("No placeholders here");
  });
});
