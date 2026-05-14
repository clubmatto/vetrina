import { describe, it, expect } from "vitest";
import { join } from "path";
import { mkdtempSync, writeFileSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { Manifest, hashContent } from "../src/manifest";
import { processTemplate } from "../src/template";
import { DesiredFile, diffDesired, mergeOpencodeJson } from "../src/plan";

function makeDesired(
  path: string,
  identity: string,
  content: string,
  category: "static" | "opencode-json" | "agents-md" = "static",
): DesiredFile {
  return { path, identity, content, category };
}

describe("diffDesired", () => {
  it("adds files that do not exist on disk", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const desired = new Map<string, DesiredFile>();
    desired.set("test.md", makeDesired("test.md", "abc", "content"));

    const actions = diffDesired(desired, null, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("add");
    expect(actions[0].relPath).toBe("test.md");
    expect(actions[0].content).toBe("content");
  });

  it("skips files when normalized content matches", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "test.md"), "content");

    const manifest: Manifest = {
      version: "0.0.1",
      files: {
        "test.md": { sourceHash: "abc" },
      },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set("test.md", makeDesired("test.md", "abc", "content"));

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("skip");
  });

  it("skips files when only dates differ (cosmetic change)", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const rawSource = "some content\n{{FOOTER}}";
    const datedContent = processTemplate(rawSource);
    const staleContent = rawSource.replace(
      "{{FOOTER}}",
      "Last updated: 2025-01-01. This file extends the global rules in @AGENTS.md. Always check both files.",
    );
    const identity = hashContent(rawSource);
    writeFileSync(join(dir, "test.md"), staleContent);

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "test.md": { sourceHash: identity } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set("test.md", makeDesired("test.md", identity, datedContent));

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("skip");
  });

  it("updates files when identity changed but normalized disk matches old source", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "test.md"), "old content");

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "test.md": { sourceHash: hashContent("old content") } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      "test.md",
      makeDesired("test.md", hashContent("new content"), "new content"),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("update");
    expect(actions[0].content).toBe("new content");
  });

  it("warns when user edits a static file and source unchanged", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const source = "# Original version";
    const identity = hashContent(source);
    writeFileSync(join(dir, "test.md"), "# User edited version");

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "test.md": { sourceHash: identity } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set("test.md", makeDesired("test.md", identity, source));

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("warn");
  });

  it("warns when user edits a file with dates and source unchanged", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const rawSource = "# {{FOOTER}}";
    const identity = hashContent(rawSource);
    const diskContent =
      "# User added text\nLast updated: 2026-05-14. This file extends the global rules in @AGENTS.md. Always check both files.";
    writeFileSync(join(dir, "test.md"), diskContent);

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "test.md": { sourceHash: identity } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      "test.md",
      makeDesired("test.md", identity, processTemplate(rawSource)),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("warn");
  });

  it("merges opencode-json when content differs (source changed or not)", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "opencode.json"), '{"mcp":{"user-server":{}}}');

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "opencode.json": { sourceHash: "abc" } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      "opencode.json",
      makeDesired(
        "opencode.json",
        "def",
        '{"mcp":{"ai-server":{}}}',
        "opencode-json",
      ),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("merge");
  });

  it("backs up agents-md when user modified and source changed", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "AGENTS.md"), "# User edited content");

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "AGENTS.md": { sourceHash: "abc" } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      "AGENTS.md",
      makeDesired("AGENTS.md", "def", "# New template content", "agents-md"),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("backup");
  });

  it("overwrites static files when user modified and source changed", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    mkdirSync(join(dir, ".agents", "rules"), { recursive: true });
    writeFileSync(join(dir, ".agents", "rules", "rule.md"), "# User edit");

    const manifest: Manifest = {
      version: "0.0.1",
      files: { ".agents/rules/rule.md": { sourceHash: "abc" } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      ".agents/rules/rule.md",
      makeDesired(".agents/rules/rule.md", "def", "# New version"),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("update");
  });

  it("removes files in manifest but not in desired set", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "old-rule.md": { sourceHash: "abc" } },
    };

    const desired = new Map<string, DesiredFile>();

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("remove");
    expect(actions[0].relPath).toBe("old-rule.md");
  });

  it("handles no manifest (fresh install) as all adds", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const desired = new Map<string, DesiredFile>();
    desired.set("a.md", makeDesired("a.md", "h1", "a"));
    desired.set("b.md", makeDesired("b.md", "h2", "b"));

    const actions = diffDesired(desired, null, dir);

    expect(actions).toHaveLength(2);
    expect(actions.every((a) => a.action === "add")).toBe(true);
  });

  it("ignores files on disk that are not in desired or manifest", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "user-file.md"), "# User file");

    const desired = new Map<string, DesiredFile>();
    desired.set("our-file.md", makeDesired("our-file.md", "h1", "our"));

    const actions = diffDesired(desired, null, dir);

    const userFileAction = actions.find((a) => a.relPath === "user-file.md");
    expect(userFileAction).toBeUndefined();
  });

  it("updates files when no manifest entry exists (old format upgrade)", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    writeFileSync(join(dir, "test.md"), "existing content");

    const manifest: Manifest = { version: "0.0.1", files: {} };
    const desired = new Map<string, DesiredFile>();
    const identity = hashContent("new content");
    desired.set("test.md", makeDesired("test.md", identity, "new content"));

    const actions = diffDesired(desired, manifest, dir);

    expect(actions[0].action).toBe("update");
  });

  it("detects actual content change even with dates present", () => {
    const dir = mkdtempSync(join(tmpdir(), "plan-test-"));
    const diskRaw = "user meaningful text\n{{FOOTER}}";
    const desiredRaw = "old meaningful text\n{{FOOTER}}";
    const identity = hashContent(desiredRaw);

    writeFileSync(join(dir, "test.md"), processTemplate(diskRaw));

    const manifest: Manifest = {
      version: "0.0.1",
      files: { "test.md": { sourceHash: identity } },
    };

    const desired = new Map<string, DesiredFile>();
    desired.set(
      "test.md",
      makeDesired("test.md", identity, processTemplate(desiredRaw)),
    );

    const actions = diffDesired(desired, manifest, dir);

    expect(actions).toHaveLength(1);
    expect(actions[0].action).toBe("warn");
  });
});

describe("mergeOpencodeJson", () => {
  it("preserves user-added MCP servers", () => {
    const desired = JSON.stringify({ $schema: "schema", mcp: { ai: {} } });
    const current = JSON.stringify({
      $schema: "schema",
      mcp: { ai: {}, userServer: { type: "local", command: ["echo"] } },
    });

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.mcp.ai).toBeDefined();
    expect(result.mcp.userServer).toBeDefined();
    expect(result.mcp.userServer.command).toEqual(["echo"]);
  });

  it("preserves user-added commands", () => {
    const desired = JSON.stringify({
      $schema: "schema",
      command: { commit: { template: "c" } },
    });
    const current = JSON.stringify({
      $schema: "schema",
      command: { commit: { template: "user-c" }, deploy: { template: "d" } },
    });

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.command.commit.template).toBe("c");
    expect(result.command.deploy).toBeDefined();
  });

  it("ai-kit MCP server overwrites when both define the same key", () => {
    const desired = JSON.stringify({
      mcp: { server: { version: 2 } },
    });
    const current = JSON.stringify({
      mcp: { server: { version: 1, userField: "lost" } },
    });

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.mcp.server.version).toBe(2);
    expect(result.mcp.server.userField).toBeUndefined();
  });

  it("preserves unknown top-level keys from current", () => {
    const desired = JSON.stringify({ known: true });
    const current = JSON.stringify({ known: true, custom: "value" });

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.custom).toBe("value");
  });

  it("handles current file with empty mcp gracefully", () => {
    const desired = JSON.stringify({ mcp: { ai: {} } });
    const current = JSON.stringify({});

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.mcp.ai).toBeDefined();
  });

  it("handles current file with no commands gracefully", () => {
    const desired = JSON.stringify({ command: { c: {} } });
    const current = JSON.stringify({});

    const result = JSON.parse(mergeOpencodeJson(desired, current));

    expect(result.command.c).toBeDefined();
  });
});
