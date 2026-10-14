#!/usr/bin/env python3
"""OG image for "Divide and conquer: why hashing beats row by row comparison".

Built from og_template.py. Only SLUG, TITLE, SUBTITLE and BODY differ, and the
stats row replaces the chip row with the post's own numbers.
"""
import re
import subprocess
from pathlib import Path

SLUG = "divide-and-conquer-hashing-beats-row-by-row"
TITLE = "Hashing beats row by row"
SUBTITLE = "Comparing two tables costs segments, not rows."
# ---------------------------------------------------------------------------

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / ".og-drafts"
LOGO_SVG = (ROOT / "website/src/assets/header-logo.svg").read_text()

ACCENTS = ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]
INK = "#eceff4"
BODY_COL = "#c7cede"
MUTED = "#9aa6ba"
DIM = "#6f7b8d"
MONO = "Menlo, monospace"
SANS = "Helvetica Neue, Arial, sans-serif"

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
  <text x="62" y="96" font-family="{SANS}" font-weight="700" font-size="58" fill="{INK}">{TITLE}</text>
  <text x="64" y="138" font-family="{SANS}" font-size="24" fill="#aab4c4">{SUBTITLE}</text>"""

FOOTER = f"""  <!-- footer: small logo, then the url -->
  <g transform="translate(64 581) scale(0.0273)">
    <g clip-path="url(#clip0_1_2)">
      {paths}
    </g>
    <defs><clipPath id="clip0_1_2"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="104" y="600" font-family="{MONO}" font-size="18" fill="{MUTED}">matto.club</text>"""


def terminal(x: float, y: float, w: float, h: float, title: str) -> str:
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.14"/>'
        f'\n    <path d="M{x} {y + 12} a12 12 0 0 1 12 -12 h{w - 24:.0f} a12 12 0 0 1 12 12 v20 h-{w:.0f} z" fill="#454c5c"/>'
        f'\n    <circle cx="{x + 26}" cy="{y + 16}" r="5" fill="#ff5f56"/>'
        f'\n    <circle cx="{x + 44}" cy="{y + 16}" r="5" fill="#ffbd2e"/>'
        f'\n    <circle cx="{x + 62}" cy="{y + 16}" r="5" fill="#27c93f"/>'
        f'\n    <text x="{x + 88}" y="{y + 21}" font-family="{MONO}" font-size="14" fill="{MUTED}">{title}</text>'
    )


def stat(x: float, y: float, i: int, label: str) -> str:
    return (
        f'<rect x="{x}" y="{y - 13}" width="10" height="10" rx="2" fill="{ACCENTS[i % 5]}"/>'
        f'\n    <text x="{x + 20}" y="{y - 4}" font-family="{MONO}" font-size="17" fill="{BODY_COL}">{label}</text>'
    )


BODY = f"""
  {terminal(64, 186, 1072, 250, "db-diff: the tables match")}
  <text x="104" y="286" font-family="{MONO}" font-size="19" fill="{MUTED}">$ db-diff --source "$SRC" --target "$DST" --table orders</text>
  <text x="104" y="324" font-family="{MONO}" font-size="21" fill="{INK}">no differences in orders</text>
  <text x="104" y="368" font-family="{MONO}" font-size="16" fill="{DIM}">chunk hash = row1 XOR row2 XOR ... XOR rowN</text>
  <text x="104" y="398" font-family="{MONO}" font-size="16" fill="{DIM}">XOR is order independent, so a merge cannot move it</text>
  <g>
    {stat(104, 492, 0, "10000 rows per segment")}
    {stat(520, 492, 1, "2 queries per segment")}
    {stat(880, 492, 4, "0 rows over the wire")}
  </g>
"""

card = svg(HEADLINE + f"\n{BODY}\n" + "\n" + FOOTER)

OUT.mkdir(exist_ok=True)
(OUT / f"{SLUG}.svg").write_text(card)
for w, h, suffix in ((1200, 630, ""), (2400, 1260, "@2x")):
    subprocess.run(
        ["rsvg-convert", "-w", str(w), "-h", str(h), str(OUT / f"{SLUG}.svg"),
         "-o", str(OUT / f"{SLUG}{suffix}.png")],
        check=True,
    )
print(f"wrote {OUT / (SLUG + '.png')} and {OUT / (SLUG + '@2x.png')}")
