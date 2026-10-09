# OG image style for Club Matto posts

This is the prompt to give an agent (or designer) to produce a social media
image for a new blog post in this series. It encodes every convention we have
settled on across the images already in this directory.

## The prompt

```
Design a 1200x630 social media card for the Club Matto blog post "<TITLE>".
Hand-build it as SVG (no raster assets), render to PNG at 1200x630 plus a
2400x1260 @2x version. Follow ALL of these rules:

LAYOUT & FRAME
- Headline: post title, Helvetica Neue Bold 58px, #eceff4, baseline y=96,
  x=62.
- Subtitle: one hook line, Helvetica Neue 24px, #aab4c4, baseline y=138,
  x=64. Use the post's own best line where possible.
- Footer lockup, bottom-left: the Club Matto ring-cat logo at x=64 y=581
  (28px, filled with the 5-color gradient) + "matto.club" in Menlo 18px
  #9aa6ba at x=104, baseline y=600.
- NO kicker line above the headline. NO logos in corners. NO blinking
  cursors. NO dot-grid background texture.

BACKGROUND
- Full-card radial wash, #353c4b at center fading to #2e3440 at the edges
  (cx=0.5, cy=0.32). Never flat, never textured.

COLOR
- The 5-color accent palette, used in this order when cycling:
  #ff006e, #fb5607, #ffbe0b, #8338ec, #3a86ff.
- Body/base text #eceff4, secondary #c7cede, muted #9aa6ba, dimmest
  #6f7b8d.
- Fonts: Menlo, monospace for labels and code; Helvetica Neue for the
  headline.

CONTENT RULES
- Quote the post's real numbers, names and lines verbatim; never invent
  data to fill a chart.
- Terminal windows when code is the subject: dark #3a404d body, #454c5c
  title bar, macOS traffic dots, Menlo text, syntax colors from the same
  palette, no blinking cursor.
- Photos/illustrations are allowed only when we own or have cleared them;
  then embed as base64 with real alpha, and blend light backgrounds into
  the card (or frame them deliberately).

FINISH
- Verify at full resolution: no clipped text, no overlaps, real
  punctuation (the word "verbatim" is NOT clipped just because a
  downscaled preview says so).
- Deliver: <slug>.png (1200x630) is the og:image wired via frontmatter
  (image, image_width: 2400, image_height: 1260); <slug>@2x.png alongside.
```

## The base script

`og_template.py` (this directory) bakes the frame in as code, so the prompt
above only has to carry the *idea*. Copy it, edit four things — `SLUG`,
`TITLE`, `SUBTITLE`, and the `BODY` drawing code — then run:

    python3 og_template.py

It writes `<slug>.svg` plus rendered `<slug>.png` (1200x630) and
`<slug>@2x.png` (2400x1260) into `.og-drafts/`. Requires `rsvg-convert`
(`brew install librsvg`). Included helpers:

- `chip(x, y, i)` — a product/tag tile in accent color `i`
- `terminal(x, y, w, h, title)` — a macOS-style terminal window shell

Everything brand-specific is a constant at the top: palette, text grays,
fonts, background wash, headline positions, footer lockup (the logo is read
from `website/src/assets/header-logo.svg` automatically). Do not retune those
per post — that is what this template exists to prevent.

## Examples already in this directory

| File | For | The idea |
|---|---|---|
| `how-coding-agents-work.png` | Series intro | Terminal: `$ diff` of the series topics |
| `building-pinocchio.png` | Pinocchio | Watercolor puppet photo, callouts to its parts |
| `comparative-analysis-of-coding-agents.png` | Comparative analysis | Periodic table: ten element tiles, symbols in the palette |
| `the-system-prompt.png` | System prompt | Iceberg: tip = what you type, mass below = the prompt |
| `how-compaction-works.png` | Compaction | Three cards: free the cheap stuff, keep the tail, summarize the rest |
| `pinocchio-v4-compaction.png` | Harvest post | Terminal: the real `compact()` Go code |
| `the-system-prompt-rank.png`, `-cache.png` | (archived variants) | Chain-of-command frames; the cache bill |
| `tools.png`, `tools-spread.png`, `tools-bill.png` | Tools deep dive | Anatomy of a tool call; the 0→30 staircase; the 15,000-vs-600 token bars |
| `meet-guido.png` | (to be replaced) | current placeholder |

The per-post build scripts that generated these live in `.og-drafts/`
(untracked): `build-<post>.py`, same shape as the base template above but
with that post's body.
