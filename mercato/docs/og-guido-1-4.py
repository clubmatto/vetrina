#!/usr/bin/env python3
"""The Guido 1.4 card: the real dashboard, the release, the brand frame.

The generated image was rejected for a good reason: a model cannot draw a
dashboard that is not ours. This card uses the product itself — the same
screenshot the site ships — inside the brand frame from STYLE.md.

Run: python3 mercato/docs/og-guido-1-4.py
Writes .og-drafts/guido-1-4-card.svg, .png (1200x630) and @2x (2400x1260).
"""
import base64
import re
import subprocess
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
SHOT = ROOT / "website/src/assets/products/guido/screen-dashboard.png"
LOGO_SVG = (ROOT / "website/src/assets/header-logo.svg").read_text()
OUT = ROOT / ".og-drafts"
SLUG = "guido-1-4-card"

ACCENTS = ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]
INK = "#eceff4"
BODY = "#c7cede"
MUTED = "#9aa6ba"
MONO = "Menlo, monospace"
SANS = "Helvetica Neue, Arial, sans-serif"

paths = "\n      ".join(re.findall(r"<path[^>]*/>", LOGO_SVG))
shot = "data:image/png;base64," + base64.b64encode(SHOT.read_bytes()).decode()

DEFS = f"""  <defs>
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
    <clipPath id="shotClip"><rect x="600" y="157" width="560" height="315" rx="16"/></clipPath>
  </defs>"""

CONTENT = f"""
  <!-- the product, not a drawing of it -->
  <image x="600" y="157" width="560" height="315"
         href="{shot}" clip-path="url(#shotClip)" preserveAspectRatio="xMidYMid slice"/>
  <rect x="600" y="157" width="560" height="315" rx="16" fill="none" stroke="{INK}" stroke-opacity="0.12"/>

  <!-- release -->
  <rect x="62" y="196" width="64" height="3" fill="url(#logoGradient)"/>
  <text x="62" y="272" font-family="{SANS}" font-weight="700" font-size="58" fill="{INK}">Guido 1.4</text>
  <text x="64" y="312" font-family="{SANS}" font-size="26" fill="{BODY}">Assetto Corsa EVO is here</text>
  <text x="64" y="352" font-family="{SANS}" font-size="20" fill="{MUTED}">One app, on your phone and on your PC.</text>
  <text x="64" y="392" font-family="{MONO}" font-size="17" fill="#6f7b8d">speed · gear · revs · tyres · fuel · laps</text>

  <!-- footer: small logo, then the url -->
  <g transform="translate(64 581) scale(0.0273)">
    <g clip-path="url(#clip0_1_2)">
      {paths}
    </g>
    <defs><clipPath id="clip0_1_2"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="104" y="600" font-family="{MONO}" font-size="18" fill="{MUTED}">matto.club</text>
"""

card = f"""<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
{DEFS}

  <rect width="1200" height="630" fill="url(#bgWash)"/>
{CONTENT}
</svg>
"""

OUT.mkdir(exist_ok=True)
(OUT / f"{SLUG}.svg").write_text(card)
for w, h, suffix in ((1200, 630, ""), (2400, 1260, "@2x")):
    subprocess.run(
        ["rsvg-convert", "-w", str(w), "-h", str(h), str(OUT / f"{SLUG}.svg"), "-o", str(OUT / f"{SLUG}{suffix}.png")],
        check=True,
    )
    print(OUT / f"{SLUG}{suffix}.png")
