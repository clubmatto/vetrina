// Heading ids make posts deep-linkable and give the TOC rail something to
// scroll to. Slugs follow GitHub's convention: lowercase, punctuation removed,
// whitespace turned into dashes, with duplicates suffixed per page.
export function headingIds(md) {
  const renderHeadingOpen = md.renderer.rules.heading_open;

  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const token = tokens[idx];

    if (token.tag === "h2" && !token.attrGet("id")) {
      const base = slugify(headingText(tokens, idx)) || "section";
      const seen = (env.headingSlugs ??= new Set());

      let slug = base;
      for (let n = 2; seen.has(slug); n += 1) {
        slug = `${base}-${n}`;
      }
      seen.add(slug);
      token.attrSet("id", slug);
    }

    return renderHeadingOpen
      ? renderHeadingOpen(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
  };
}

function headingText(tokens, idx) {
  const inline = tokens[idx + 1];
  if (!inline) {
    return "";
  }

  const text = (inline.children ?? [])
    .filter((child) => child.type === "text" || child.type === "code_inline")
    .map((child) => child.content)
    .join("");

  return text || inline.content;
}

function slugify(text) {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .replace(/\s+/g, "-");
}
