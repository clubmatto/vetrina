import { describe, it, expect } from "vitest";
import { getCommandConfig } from "../src/content.js";

describe("getCommandConfig", () => {
  it("parses command files and returns config object", () => {
    const config = getCommandConfig();

    expect(config).toHaveProperty("commit");
    expect(config.commit.description).toBe(
      "Commit the work done in this session with a structured commit message.",
    );
    expect(config.commit.template).toContain("Commit Message Format");
  });

  it("includes all command files", () => {
    const config = getCommandConfig();

    expect(config).toHaveProperty("commit");
    expect(config).toHaveProperty("interview");
    expect(config).toHaveProperty("synth");
  });

  it("has correct structure for opencode.json command format", () => {
    const config = getCommandConfig();

    for (const [name, cmd] of Object.entries(config)) {
      expect(cmd).toHaveProperty("description");
      expect(cmd).toHaveProperty("template");
      expect(typeof cmd.description).toBe("string");
      expect(typeof cmd.template).toBe("string");
    }
  });
});
