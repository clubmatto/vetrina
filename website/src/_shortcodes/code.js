import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve } from "path";
import Prism from "prismjs";
import "prismjs/components/prism-go.js";
import "prismjs/components/prism-diff.js";
import "prismjs/plugins/diff-highlight/prism-diff-highlight.js";
import { createTwoFilesPatch } from "diff";

Prism.languages["diff-go"] = Prism.languages.diff;

const PINOCCHIO_DIR = fileURLToPath(
  new URL("../writing/pinocchio/", import.meta.url),
);

function readFile(relativePath) {
  try {
    return readFileSync(resolve(PINOCCHIO_DIR, relativePath), "utf-8");
  } catch {
    return null;
  }
}

function highlight(code, language) {
  const grammar = Prism.languages[language];
  if (!grammar) {
    return code;
  }
  return Prism.highlight(code, grammar, language);
}

export function codefileShortcode(relativePath) {
  const code = readFile(relativePath);

  if (code === null) {
    console.error(`[codefile] Error reading file: ${relativePath}`);
    return `<!-- codefile not found: ${relativePath} -->`;
  }

  const html = highlight(code, "go");
  return `<pre class="language-go"><code class="language-go">${html}</code></pre>`;
}

export function diffShortcode(oldPath, newPath) {
  const oldCode = readFile(oldPath);
  const newCode = readFile(newPath);

  if (oldCode === null || newCode === null) {
    console.error(`[diff] Error reading files: ${oldPath} -> ${newPath}`);
    return `<!-- diff not found: ${oldPath} -> ${newPath} -->`;
  }

  const patch = createTwoFilesPatch(
    oldPath,
    newPath,
    oldCode,
    newCode,
    "",
    "",
    {
      context: 3,
    },
  );

  const firstHunk = patch
    .split("\n")
    .findIndex((line) => line.startsWith("@@"));
  const diffText =
    firstHunk === -1
      ? ""
      : patch.split("\n").slice(firstHunk).join("\n").trim();

  const html = highlight(diffText, "diff-go");
  return `<pre class="language-diff-go"><code class="language-diff-go">${html}</code></pre>`;
}

export default function (eleventyConfig) {
  eleventyConfig.addShortcode("codefile", codefileShortcode);
  eleventyConfig.addShortcode("diff", diffShortcode);
}
