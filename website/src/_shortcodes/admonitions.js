import StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

// Admonitions use the container syntax Docusaurus and VitePress share:
//
//   :::note[TL;DR]
//   the finding, in a sentence or three.
//   :::
//
//   :::warning[Optional title]
//   body content, with paragraphs, lists and code all allowed.
//   :::
//
// The type is required and an unknown one is a build error, so a typo fails
// loudly instead of rendering as literal text. The body is re-parsed as
// markdown in a second pass, which is what makes a list, a fenced code block or
// a nested admonition behave the same inside the container as outside it.
const ADMONITION_TYPES = new Set(["note", "tip", "warning"]);

const TITLES = {
  note: "Note",
  tip: "Tip",
  warning: "Warning",
};

const OPEN = /^:::\s*([a-zA-Z]+)\s*(?:\[(.*)\])?\s*$/;
const CLOSE = /^:::\s*$/;
const PLACEHOLDER = /^<!--admonition:(\d+)-->$/;

// The containers collected for the parse in progress. The two rules below are
// a scan pass and a render pass over the same document, so the collection
// cannot live in this closure.
const PARSE = Symbol("admonition.parse");

// True while a nested parse is running, which is how the nested parse knows not
// to apply these rules to a body that has already been converted.
let busy = false;

export function admonitions(md) {
  // Pass one: pull every container out of the source and leave one marker line
  // in its place. Running after "block" is what makes the replacement
  // authoritative — the block pass has already tokenized the original source,
  // and this swaps its output for the tokenization of the rewritten source.
  md.core.ruler.after("block", "admonition_scan", (state) => {
    if (busy || !state.src.includes(":::")) {
      return false;
    }

    const lines = state.src.split("\n");
    const found = [];
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const open = OPEN.exec(lines[i]);

      if (open === null) {
        out.push(lines[i]);
        i += 1;
        continue;
      }

      const opened = i + 1;
      const type = open[1].toLowerCase();
      if (!ADMONITION_TYPES.has(type)) {
        throw new Error(
          `[admonition] unknown type "${open[1]}" on line ${opened}: expected ${[
            ...ADMONITION_TYPES,
          ].join(", ")}`,
        );
      }

      const label = (open[2] ?? "").trim() || TITLES[type];
      const body = [];
      let depth = 0;
      let closed = false;

      i += 1;

      while (i < lines.length) {
        if (CLOSE.test(lines[i])) {
          if (depth === 0) {
            closed = true;
            i += 1;
            break;
          }
          depth -= 1;
        } else if (OPEN.test(lines[i])) {
          depth += 1;
        }

        body.push(lines[i]);
        i += 1;
      }

      if (!closed) {
        throw new Error(
          `[admonition] the ${type} admonition opened on line ${opened} is missing its closing ":::"`,
        );
      }

      // The body is rendered to html here, while the container is being read.
      // The result is injected as raw html in pass two, which keeps it out of
      // the token stream the outer renderer walks and so cannot be rendered
      // twice.
      found.push({
        open: `<div class="admonition admonition--${type}" data-admonition="${type}" aria-label="${escapeHtml(
          label,
        )}"><p class="admonition-title">${escapeHtml(label)}</p>`,
        content: renderBody(state, body.join("\n")),
      });

      out.push(`<!--admonition:${found.length - 1}-->`);
    }

    if (found.length === 0) {
      return false;
    }

    // The whole container collapses to its marker line, so the replacement
    // source has exactly as many lines as the original and line numbers stay
    // meaningful.
    state.src = out.join("\n");
    state.env[PARSE] = found;

    // Re-tokenize the rewritten source with a state of its own. The core state
    // is shared with this rule, so tokenizing into it would append to whatever
    // the block pass already produced.
    const block = new StateBlock(state.src, state.md, state.env, []);
    block.md.block.tokenize(block, 0, out.length, true);
    state.tokens = block.tokens;

    return true;
  });

  // Pass two: swap each marker paragraph for the container. Registered up
  // front because markdown-it collects its core rules before it starts running
  // them, so a rule added mid-parse would never fire.
  md.core.ruler.after("admonition_scan", "admonition_render", (state) => {
    const found = state.env[PARSE];

    if (found === undefined || found.length === 0) {
      return false;
    }

    for (let i = 0; i < state.tokens.length; i += 1) {
      const token = state.tokens[i];

      // With markdown-it's `html` option on — which is how the site is
      // configured — the marker line is an html_block. With it off it is a
      // paragraph, so the marker arrives as the paragraph's inline token.
      // Both shapes occur in the wild, so handle each where it stands.
      const isHtmlBlock = token.type === "html_block";
      const isInline = token.type === "inline";
      const match =
        isHtmlBlock || isInline ? PLACEHOLDER.exec(token.content.trim()) : null;

      if (match === null) {
        continue;
      }

      const { open, content } = found[Number(match[1])];
      const html = new state.Token("html_block", "", 0);
      html.content = `${open}${content}</div>\n`;

      if (isHtmlBlock) {
        state.tokens.splice(i, 1, html);
        continue;
      }

      // The inline token sits in the middle of the triple produced by
      // paragraph_open/inline/paragraph_close.
      state.tokens.splice(i - 1, 3, html);
      i -= 1;
    }

    delete state.env[PARSE];

    return true;
  });
}

// Rendering the body through the full pipeline is what makes a nested
// container work: the nested document is scanned like any other, so an
// admonition inside an admonition comes out as an admonition inside an
// admonition.
function renderBody(state, markdown) {
  return state.md.render(markdown, state.env);
}

function escapeHtml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
