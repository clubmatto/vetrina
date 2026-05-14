import { describe, it, expect } from "vitest";
import { hashContent } from "../src/manifest";

describe("hashContent", () => {
  it("returns a consistent hash for the same input", () => {
    const input = "hello world";
    expect(hashContent(input)).toBe(hashContent(input));
  });

  it("returns different hashes for different inputs", () => {
    const hash1 = hashContent("hello world");
    const hash2 = hashContent("hello world!");
    expect(hash1).not.toBe(hash2);
  });

  it("treats {{FOOTER}} as part of identity (before date resolution)", () => {
    const withPlaceholder = "some content\n{{FOOTER}}";
    const withDate =
      "some content\nLast updated: 2026-05-14. This file extends the global rules in @AGENTS.md. Always check both files.";
    expect(hashContent(withPlaceholder)).not.toBe(hashContent(withDate));
  });

  it("handles empty string", () => {
    expect(hashContent("")).toBe(hashContent(""));
  });

  it("produces a sha256 hex string", () => {
    const result = hashContent("test");
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });
});
