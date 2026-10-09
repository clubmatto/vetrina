#!/usr/bin/env python3
"""Club Matto OG image base template.

Copy this file (keep it next to STYLE.md), then edit exactly three things:

    SLUG     output filename (also the og:image name on the site)
    TITLE    the post title, becomes the headline
    SUBTITLE one hook line from the post
    BODY     the post-specific middle: chips, bars, terminal, code...

and run it:

    python3 og_template.py

It writes <slug>.svg plus rendered <slug>.png (1200x630) and <slug>@2x.png
(2400x1260) into ../../.og-drafts/ using rsvg-convert (brew install librsvg).

Ship the @2x: copy it to website/src/assets/writing/<slug>.png and wire the
post frontmatter:

    image: /assets/writing/<slug>.png
    image_width: 2400
    image_height: 1260

Everything below the constants is the brand: do not retune it per post.
Helpers included: chip() for product/tag tiles and terminal() for a
macOS-style terminal window. More ideas live in STYLE.md's example table.
"""
import re
import subprocess
from pathlib import Path

# ---- the three things you edit -------------------------------------------
SLUG = "example"
TITLE = "The post title"
SUBTITLE = "The one hook line, straight from the post."
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / ".og-drafts"
LOGO_SVG = (ROOT / "website/src/assets/header-logo.svg").read_text()

# ---- brand constants (do not edit) ----------------------------------------
ACCENTS = ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]
INK = "#eceff4"      # headline, primary text
BODY_COL = "#c7cede"  # secondary text
MUTED = "#9aa6ba"     # captions, meta
DIM = "#6f7b8d"       # faintest text
MONO = "Menlo, monospace"
SANS = "Helvetica Neue, Arial, sans-serif"
# ---------------------------------------------------------------------------

paths = "\n      ".join(re.findall(r"<path[^>]*/>", LOGO_SVG))

DEFS = """  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff006e"/>
      <stop offset="25%" stop-color="#fb5607"/>
      <stop offset="50%" stop-color="#ffbe0b"/>
      <stop offset="75%" stop-color="#8338ec"/>
      <stop offset="100%" stop-color="#3a86ff"/>
    </linearGradient>
    <radialGradient id="bgWash" cx="0.5" cy="0.32" r="1">
      <stop offset="0" stop-color="#353c4b"/>
      <stop offset="1" stop-color="#2e3440"/>
    </radialGradient>
  </defs>"""

def svg(body: str) -> str:
    return f"""<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
{DEFS}

  <rect width="1200" height="630" fill="url(#bgWash)"/>
{body}
</svg>
"""

HEADLINE = f"""  <!-- headline -->
  <text x="62" y="96" font-family="{SANS}" font-weight="700" font-size="58" fill="{INK}">{{TITLE}}</text>
  <text x="64" y="138" font-family="{SANS}" font-size="24" fill="#aab4c4">{{SUBTITLE}}</text>"""

FOOTER = f"""  <!-- footer: small logo, then the url -->
  <g transform="translate(64 581) scale(0.0273)">
    <g clip-path="url(#clip0_1_2)">
      {paths}
    </g>
    <defs><clipPath id="clip0_1_2"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="104" y="600" font-family="{MONO}" font-size="18" fill="{MUTED}">matto.club</text>"""

# ---- small helpers (optional; delete if unused) ----------------------------

def chip(x: float, y: float, i: int, w: int = 46, h: int = 34) -> str:
    """A small product/tag tile in accent color i, with etched lines."""
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{ACCENTS[i % 5]}"/>'
        f'\n    <rect x="{x + 10}" y="{y + 12}" width="{w - 20}" height="4" rx="2" fill="#2e3440" fill-opacity="0.55"/>'
        f'\n    <rect x="{x + 10}" y="{y + 20}" width="{int(w * 0.4)}" height="4" rx="2" fill="#2e3440" fill-opacity="0.35"/>'
    )

def terminal(x: float, y: float, w: float, h: float, title: str) -> str:
    """A macOS-style terminal window shell. Draw content below y + 44."""
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.14"/>'
        f'\n    <path d="M{x} {y + 12} a12 12 0 0 1 12 -12 h{w - 24:.0f} a12 12 0 0 1 12 12 v20 h-{w:.0f} z" fill="#454c5c"/>'
        f'\n    <circle cx="{x + 26}" cy="{y + 16}" r="5" fill="#ff5f56"/>'
        f'\n    <circle cx="{x + 44}" cy="{y + 16}" r="5" fill="#ffbd2e"/>'
        f'\n    <circle cx="{x + 62}" cy="{y + 16}" r="5" fill="#27c93f"/>'
        f'\n    <text x="{x + 88}" y="{y + 21}" font-family="{MONO}" font-size="14" fill="{MUTED}">{title}</text>'
    )

# ---- content: replace with the post-specific middle ------------------------

BODY = f"""
  {terminal(64, 192, 1072, 364, "example: replace this body")}
  <text x="104" y="300" font-family="{MONO}" font-size="20" fill="{INK}">the five components, the findings, the code &#8212; whatever the post shows</text>
  <g>
    {chip(104, 340, 0)}
    {chip(170, 340, 1)}
    {chip(236, 340, 2)}
    {chip(302, 340, 3)}
    {chip(368, 340, 4)}
  </g>
"""

card = svg(
    HEADLINE.replace("{TITLE}", TITLE).replace("{SUBTITLE}", SUBTITLE)
    + f"""
{BODY}
"""
    + "\n" + FOOTER,
)

OUT.mkdir(exist_ok=True)
(OUT / f"{SLUG}.svg").write_text(card)
for w, h, suffix in ((1200, 630, ""), (2400, 1260, "@2x")):
    subprocess.run(
        ["rsvg-convert", "-w", str(w), "-h", str(h), str(OUT / f"{SLUG}.svg"),
         "-o", str(OUT / f"{SLUG}{suffix}.png")],
        check=True,
    )
print(f"wrote {OUT / (SLUG + '.png')} and {OUT / (SLUG + '@2x.png')}")
print("ship the @2x as website/src/assets/writing/<slug>.png and wire the frontmatter:")
print("  image: /assets/writing/<slug>.png\n  image_width: 2400\n  image_height: 1260")
