#!/usr/bin/env python3
"""The DeepSeek vs frontier cost card + the rates receipt, per STYLE.md."""
import re
import subprocess
from pathlib import Path

SLUG = "deepseek-vs-frontier"
SUBTITLE = "the same tokens, priced at frontier rates"

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
OUT = ROOT / "assets/posts"
LOGO_SVG = (ROOT / "website/src/assets/header-logo.svg").read_text()

ACCENTS = ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]
OK_GREEN = "#a6e3a1"
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

def headline(l1, l2="", sub=None):
    out = f"""  <!-- headline -->
  <text x="62" y="96" font-family="{SANS}" font-weight="700" font-size="58" fill="{INK}">{l1}</text>"""
    if l2:
        out += f'\n  <text x="62" y="164" font-family="{SANS}" font-weight="700" font-size="52" fill="{INK}">{l2}</text>'
    if sub:
        out += f'\n  <text x="64" y="200" font-family="{SANS}" font-size="24" fill="#aab4c4">{sub}</text>'
    return out

FOOTER = f"""  <!-- footer: small logo, then the url -->
  <g transform="translate(64 581) scale(0.0273)">
    <g clip-path="url(#clip0_1_2)">
      {paths}
    </g>
    <defs><clipPath id="clip0_1_2"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="104" y="600" font-family="{MONO}" font-size="18" fill="{MUTED}">matto.club</text>"""

def terminal(x, y, w, h, title):
    return (
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.14"/>'
        f'\n    <path d="M{x} {y + 12} a12 12 0 0 1 12 -12 h{w - 24:.0f} a12 12 0 0 1 12 12 v20 h-{w:.0f} z" fill="#454c5c"/>'
        f'\n    <circle cx="{x + 26}" cy="{y + 16}" r="5" fill="#ff5f56"/>'
        f'\n    <circle cx="{x + 44}" cy="{y + 16}" r="5" fill="#ffbd2e"/>'
        f'\n    <circle cx="{x + 62}" cy="{y + 16}" r="5" fill="#27c93f"/>'
        f'\n    <text x="{x + 88}" y="{y + 21}" font-family="{MONO}" font-size="14" fill="{MUTED}">{title}</text>'
    )

# ---- card: the real bill in green, frontier rows in accents ----------------
ROWS = [
    ("GPT-6.1 Sol", "$878", "21x", ACCENTS[4]),
    ("Claude Fable 5.1", "$2,844", "68x", ACCENTS[3]),
    ("GPT-6 Astra", "$7,486", "180x", ACCENTS[0]),
]
rows = ""
y = 296
for name, price, mult, color in ROWS:
    rows += f'''  <text x="680" y="{y}" font-family="{MONO}" font-size="30" fill="{INK}">{name}</text>
  <text x="1136" y="{y}" font-family="{MONO}" font-weight="bold" font-size="34" fill="{color}" text-anchor="end">{price}</text>
  <text x="1136" y="{y + 36}" font-family="{MONO}" font-size="20" fill="{DIM}" text-anchor="end">{mult}</text>
'''
    y += 88

card_body = f"""
  <text x="680" y="230" font-family="{MONO}" font-size="24" fill="{MUTED}">Estimated prices*</text>
  <text x="64" y="290" font-family="{MONO}" font-weight="bold" font-size="88" fill="{OK_GREEN}">$41.58</text>
  <text x="64" y="336" font-family="{MONO}" font-size="20" fill="{BODY_COL}">deepseek-flash, real bill</text>
  <text x="64" y="366" font-family="{MONO}" font-size="20" fill="{DIM}">6.2B tokens, 99% cache hits, 30 days</text>
  <line x1="620" y1="240" x2="620" y2="500" stroke="#4f5e66" stroke-width="2"/>
{rows}
  <text x="64" y="536" font-family="{MONO}" font-size="18" fill="{DIM}">*based on estimates calculated via OpenRouter. We do not run these models ourselves. See next slide</text>
"""

card = svg(headline("DeepSeek vs Frontier Models") + f"\n{card_body}\n" + "\n" + FOOTER)

# ---- receipt: terminal with the real query ---------------------------------
rlines = [
    ("$ curl -s https://openrouter.ai/api/v1/models | jq '.data[].pricing'", INK),
    ("claude-fable-5.1  $10 in / $50 out / $0.25 cached", BODY_COL),
    ("gpt-6-astra       $10 in / $50 out / $1.00 cached", BODY_COL),
    ("gpt-6.1-sol        $2 in / $10 out / $0.10 cached", BODY_COL),
    ("# our real split: 6.19B cached + 41M in + 17.7M out", DIM),
    ("gpt-6.1-sol         $   878    21x", INK),
    ("claude-fable-5.1    $ 2,844    68x", INK),
    ("gpt-6-astra         $ 7,486   180x", INK),
    ("deepseek-flash      $    42     1x", OK_GREEN),
]
body = terminal(64, 210, 1072, 340, "clubmatto@matto.club: ~")
ly = 282
for text, color in rlines:
    esc = text.replace("&", "&amp;").replace("<", "&lt;")
    body += f'\n  <text x="104" y="{ly}" font-family="{MONO}" font-size="22" fill="{color}">{esc}</text>'
    ly += 30

receipt = svg(headline("How we estimated prices") + f"\n{body}\n" + "\n" + FOOTER)

OUT.mkdir(exist_ok=True)
SCRATCH = ROOT / ".og-drafts"
SCRATCH.mkdir(exist_ok=True)
for slug, svg_text in ((SLUG, card), (f"{SLUG}-rates", receipt)):
    (SCRATCH / f"{slug}.svg").write_text(svg_text)
    for w, h, suffix, out_dir in ((1200, 630, "", SCRATCH), (2400, 1260, "@2x", OUT)):
        subprocess.run(
            ["rsvg-convert", "-w", str(w), "-h", str(h), str(SCRATCH / f"{slug}.svg"),
             "-o", str(out_dir / f"{slug}{suffix}.png")],
            check=True,
        )
    print(f"wrote {out_dir / (slug + '@2x.png')}")
