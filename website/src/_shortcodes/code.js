import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { basename, dirname, extname, resolve, sep } from "path";
import Prism from "prismjs";
import "prismjs/components/prism-diff.js";
import "prismjs/plugins/diff-highlight/prism-diff-highlight.js";
import { createTwoFilesPatch } from "diff";

// Paths are relative to the Eleventy input directory (src/), so any file in
// the site can be embedded from any post:
//
//   {% codefile "writing/pinocchio/v1/main.go" %}
//   {% codefile "writing/pinocchio/v1/main.go" "message" "main" %}
//   {% codefile "snippets/agent.py" lang=python %}
//   {% diff "writing/pinocchio/v1/main.go" "writing/pinocchio/v2/main.go" %}
//   {% diff "a.go" "b.go" "main" %}
//
// The language is inferred from the extension (lang=… overrides it). Named
// slices come from `snip: <name>` / `endsnip: <name>` line comments, which the
// scanner matches anywhere in a line so they work in every language. Marker
// lines never reach the rendered output.
const SRC_DIR = dirname(dirname(fileURLToPath(import.meta.url)));

const EXTENSIONS = {
  bash: "bash",
  c: "c",
  cc: "cpp",
  cjs: "javascript",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  dart: "dart",
  ex: "elixir",
  exs: "elixir",
  go: "go",
  h: "c",
  hpp: "cpp",
  htm: "markup",
  html: "markup",
  ini: "ini",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  kt: "kotlin",
  kts: "kotlin",
  lua: "lua",
  md: "markdown",
  mjs: "javascript",
  php: "php",
  pl: "perl",
  proto: "protobuf",
  py: "python",
  r: "r",
  rb: "ruby",
  rs: "rust",
  scala: "scala",
  scss: "scss",
  sh: "bash",
  sql: "sql",
  swift: "swift",
  tf: "hcl",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  xml: "markup",
  yaml: "yaml",
  yml: "yaml",
  zig: "zig",
  zsh: "bash",
};

const FILENAMES = {
  "cmakelists.txt": "cmake",
  dockerfile: "docker",
  makefile: "makefile",
};

// Grammars that must be registered before another one can be.
const LANGUAGE_DEPS = {
  cpp: ["c"],
  jsx: ["markup", "javascript"],
  less: ["css"],
  markdown: ["markup"],
  php: ["markup-templating"],
  scss: ["css"],
  tsx: ["jsx", "typescript"],
  typescript: ["javascript"],
};

const loading = new Map();

function languageFor(filePath) {
  const name = basename(filePath).toLowerCase();
  if (FILENAMES[name]) {
    return FILENAMES[name];
  }
  return EXTENSIONS[extname(name).slice(1)] ?? null;
}

// ensureLanguage loads the Prism grammar for `language`, resolving its
// dependencies first. Returns false when Prism has no such grammar.
function ensureLanguage(language) {
  if (loading.has(language)) {
    return loading.get(language);
  }

  const pending = (async () => {
    for (const dep of LANGUAGE_DEPS[language] ?? []) {
      await ensureLanguage(dep);
    }
    try {
      await import(`prismjs/components/prism-${language}.js`);
    } catch {
      return false;
    }
    return Boolean(Prism.languages[language]);
  })();

  loading.set(language, pending);
  return pending;
}

const REGION_START = /(?<![\w-])snip:\s*([A-Za-z0-9_.-]+)/;
const REGION_END = /(?<![\w-])endsnip:\s*([A-Za-z0-9_.-]+)/;

function isMarker(line) {
  return REGION_START.test(line) || REGION_END.test(line);
}

// stripMarkers removes marker lines and collapses the blank line that padded
// them, so an annotated file reads exactly like the unannotated one.
function stripMarkers(code) {
  const out = [];
  for (const line of code.split("\n")) {
    if (isMarker(line)) {
      continue;
    }
    if (line.trim() === "" && out[out.length - 1]?.trim() === "") {
      continue;
    }
    out.push(line);
  }
  return out.join("\n");
}

function trimBlanks(lines) {
  let start = 0;
  let end = lines.length;
  while (start < end && lines[start].trim() === "") start++;
  while (end > start && lines[end - 1].trim() === "") end--;
  return lines.slice(start, end);
}

// extractRegion returns the lines between `snip: name` and `endsnip: name`,
// or null when the region is missing or unterminated.
function extractRegion(code, name) {
  const region = [];
  let inside = false;
  let found = false;

  for (const line of code.split("\n")) {
    const end = line.match(REGION_END);
    if (end && end[1] === name) {
      if (!inside) {
        return null;
      }
      inside = false;
      found = true;
      continue;
    }

    const start = line.match(REGION_START);
    if (start && start[1] === name) {
      if (inside) {
        return null;
      }
      inside = true;
      found = true;
      continue;
    }

    if (inside) {
      region.push(line);
    }
  }

  if (!found || inside) {
    return null;
  }
  return trimBlanks(region).join("\n");
}

// select returns the named regions in the order asked for, or null when any
// of them is missing.
function select(code, regions) {
  const parts = regions.map((region) => extractRegion(code, region));
  if (parts.some((part) => part === null)) {
    return null;
  }
  return parts.join("\n\n") + "\n";
}

function load(filePath) {
  const full = resolve(SRC_DIR, filePath);
  if (!full.startsWith(SRC_DIR + sep)) {
    return { error: `path is outside src/: ${filePath}` };
  }
  try {
    return { code: readFileSync(full, "utf-8") };
  } catch (err) {
    return { error: `cannot read ${filePath}: ${err.message}` };
  }
}

// parseArgs splits shortcode arguments into region names and key=value
// options (Liquid has no named arguments).
function parseArgs(args) {
  const regions = [];
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (typeof arg !== "string" || arg === "") {
      continue;
    }

    const pair = arg.match(/^([A-Za-z]\w*)=(.+)$/);
    if (pair) {
      options[pair[1]] = pair[2];
      continue;
    }

    const dangling = arg.match(/^([A-Za-z]\w*)=$/);
    if (dangling && i + 1 < args.length) {
      options[dangling[1]] = args[++i];
      continue;
    }

    regions.push(arg);
  }

  const lines = !["0", "false", "no", "off"].includes(
    String(options.lines ?? "").toLowerCase(),
  );

  return { regions, language: options.lang, lines };
}

function render(code, language, numbered) {
  const html = Prism.highlight(code, Prism.languages[language], language);
  const body = numbered
    ? splitLines(html)
        .map((line) => `<span class="code-line">${line}</span>`)
        .join("")
    : html;
  const classes = numbered
    ? `language-${language} has-line-numbers`
    : `language-${language}`;

  return `<pre class="${classes}"><code class="${classes}">${body}</code></pre>`;
}

// splitLines splits highlighted HTML into one entry per source line, closing
// and reopening the spans Prism lets cross a line break.
function splitLines(html) {
  const lines = [];
  const open = [];
  let current = "";
  let i = 0;

  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) {
        current += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      current += tag;
      if (tag.startsWith("</")) {
        open.pop();
      } else if (!tag.endsWith("/>")) {
        open.push(tag);
      }
      i = end + 1;
      continue;
    }

    if (html[i] === "\n") {
      lines.push(current + "</span>".repeat(open.length));
      current = open.join("");
      i++;
      continue;
    }

    current += html[i];
    i++;
  }

  lines.push(current + "</span>".repeat(open.length));
  return lines;
}

function diffLineKind(line) {
  if (line.startsWith("@@")) {
    return "coord";
  }
  if (line.startsWith("+")) {
    return "added";
  }
  if (line.startsWith("-")) {
    return "removed";
  }
  return "context";
}

// diffLineNumbers walks a unified diff and tracks the old/new line numbers so
// every row can render a two-column gutter like GitHub's.
function diffLineNumbers(lines) {
  const numbers = [];
  let oldNumber = 0;
  let newNumber = 0;

  for (const line of lines) {
    const hunk = line.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunk) {
      oldNumber = Number(hunk[1]);
      newNumber = Number(hunk[2]);
      numbers.push(null);
      continue;
    }
    if (line.startsWith("+")) {
      numbers.push({ old: null, new: newNumber++ });
      continue;
    }
    if (line.startsWith("-")) {
      numbers.push({ old: oldNumber++, new: null });
      continue;
    }
    numbers.push({ old: oldNumber++, new: newNumber++ });
  }

  return numbers;
}

function lineGutter(number) {
  const old = number?.old ?? "";
  const next = number?.new ?? "";
  return `<span class="diff-line-number">${old}</span><span class="diff-line-number">${next}</span>`;
}

// renderDiff wraps every diff line in its own block element so the stylesheet
// can paint GitHub-style row backgrounds and a line-number gutter.
function renderDiff(diffText, language, numbered) {
  const grammar = `diff-${language}`;
  const html = Prism.highlight(diffText, Prism.languages[grammar], grammar);
  const raw = diffText.split("\n");
  const numbers = numbered ? diffLineNumbers(raw) : null;

  const rows = splitLines(html).map((line, index) => {
    const kind = diffLineKind(raw[index] ?? "");
    const gutter = numbers ? lineGutter(numbers[index]) : "";
    return `<span class="diff-line diff-line-${kind}">${gutter}${line}</span>`;
  });

  return `<pre class="language-${grammar}"><code class="language-${grammar}">${rows.join("")}</code></pre>`;
}

function failure(kind, detail) {
  console.error(`[${kind}] ${detail}`);
  return `<!-- ${kind}: ${detail} -->`;
}

export async function codefileShortcode(filePath, ...args) {
  const { regions, language: override, lines } = parseArgs(args);

  const file = load(filePath);
  if (file.error) {
    return failure("codefile", file.error);
  }

  const language = override ?? languageFor(filePath);
  if (!language) {
    return failure("codefile", `no language for ${filePath}; pass lang=<name>`);
  }

  const code =
    regions.length > 0 ? select(file.code, regions) : stripMarkers(file.code);
  if (code === null) {
    return failure(
      "codefile",
      `missing region(s) in ${filePath}: ${regions.join(", ")}`,
    );
  }

  if (!(await ensureLanguage(language))) {
    return failure("codefile", `unknown Prism language: ${language}`);
  }

  return render(code.replace(/\n$/, ""), language, lines);
}

export async function diffShortcode(oldPath, newPath, ...args) {
  const { regions, language: override, lines } = parseArgs(args);

  const oldFile = load(oldPath);
  if (oldFile.error) {
    return failure("diff", oldFile.error);
  }
  const newFile = load(newPath);
  if (newFile.error) {
    return failure("diff", newFile.error);
  }

  const oldLanguage = languageFor(oldPath);
  const newLanguage = languageFor(newPath);
  if (oldLanguage !== newLanguage) {
    return failure(
      "diff",
      `language mismatch: ${oldPath} (${oldLanguage}) vs ${newPath} (${newLanguage})`,
    );
  }

  const language = override ?? oldLanguage;
  if (!language) {
    return failure("diff", `no language for ${oldPath}; pass lang=<name>`);
  }

  const oldCode =
    regions.length > 0
      ? select(oldFile.code, regions)
      : stripMarkers(oldFile.code);
  const newCode =
    regions.length > 0
      ? select(newFile.code, regions)
      : stripMarkers(newFile.code);
  if (oldCode === null || newCode === null) {
    return failure(
      "diff",
      `missing region(s) in ${oldPath} -> ${newPath}: ${regions.join(", ")}`,
    );
  }

  if (!(await ensureLanguage(language))) {
    return failure("diff", `unknown Prism language: ${language}`);
  }
  Prism.languages[`diff-${language}`] = Prism.languages.diff;

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

  const patchLines = patch.split("\n");
  const firstHunk = patchLines.findIndex((line) => line.startsWith("@@"));
  const diffText =
    firstHunk === -1 ? "" : patchLines.slice(firstHunk).join("\n").trim();

  return renderDiff(diffText, language, lines);
}

export default function (eleventyConfig) {
  eleventyConfig.addShortcode("codefile", codefileShortcode);
  eleventyConfig.addShortcode("diff", diffShortcode);
}
