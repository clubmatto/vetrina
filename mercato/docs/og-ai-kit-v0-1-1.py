#!/usr/bin/env python3
"""Social card for the ai-kit v0.1.1 release post.

Built from the base in this directory (see STYLE.md). The terminal lines are
the real output of `ai-kit sync` against a TypeScript-only project, run with
the 0.1.1 build.
"""
import re
import subprocess
from pathlib import Path

# ---- the three things you edit -------------------------------------------
SLUG = "ai-kit-v0-1-1-card"
TITLE = "ai-kit v0.1.1"
SUBTITLE = "A rules refresh: flat Go packages, sharper writing profiles."
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
GREEN = "#a6e3a1"    # terminal check marks, as in the recorded demos
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


def line(x: float, y: float, prefix: str, text: str, color: str, prefix_color: str) -> str:
    return (
        f'<text x="{x}" y="{y}" font-family="{MONO}" font-size="22" fill="{prefix_color}">{prefix}</text>'
        f'\n    <text x="{x + 48}" y="{y}" font-family="{MONO}" font-size="22" fill="{color}">{text}</text>'
    )


# ---- content: the real sync output, writing rules only ---------------------

BODY = f"""
  {terminal(64, 192, 1072, 364, "ai-kit sync — writing-project")}
  <text x="104" y="272" font-family="{MONO}" font-size="22" fill="{MUTED}">&gt; ai-kit sync</text>
  <text x="104" y="312" font-family="{MONO}" font-size="20" fill="{DIM}">Syncing AI rules, skills, and commands to your project...</text>
  {line(104, 356, "✓ +", ".agents/rules/writing.md", INK, GREEN)}
  {line(104, 392, "✓ +", ".agents/rules/writing-editorial.md", INK, GREEN)}
  {line(104, 428, "✓ +", ".agents/rules/writing-marketing.md", INK, GREEN)}
  {line(104, 464, "✓ +", ".agents/rules/writing-technical.md", INK, GREEN)}
  <text x="104" y="512" font-family="{MONO}" font-size="22" fill="{GREEN}">✓</text>
  <text x="140" y="512" font-family="{MONO}" font-size="22" fill="{INK}">Done!</text>
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
