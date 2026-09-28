#!/usr/bin/env python3
"""Assemble the three comparative-analysis OG-image SVGs (v2, post restructured)."""
import base64
import math
import re
from pathlib import Path

ROOT = Path("/Users/lucapette/src/vetrina")
OUT = ROOT / ".og-drafts"
LOGO_SVG = (ROOT / "website/src/assets/header-logo.svg").read_text()

paths = "\n      ".join(re.findall(r"<path[^>]*/>", LOGO_SVG))
assert paths, "no paths extracted from header-logo.svg"

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
    return f"""<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
{DEFS}

  <rect width="1200" height="630" fill="url(#bgWash)"/>
{body}
</svg>
"""

HEADLINE = """  <!-- headline -->
  <text x="62" y="96" font-family="Helvetica Neue, Arial, sans-serif" font-weight="700" font-size="58" fill="#eceff4">{title}</text>
  <text x="64" y="138" font-family="Helvetica Neue, Arial, sans-serif" font-size="24" fill="#aab4c4">{subtitle}</text>"""

FOOTER = f"""  <!-- footer: small logo, then the url -->
  <g transform="translate(64 581) scale(0.0273)">
    <g clip-path="url(#clip0_1_2)">
      {paths}
    </g>
    <defs><clipPath id="clip0_1_2"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="104" y="600" font-family="Menlo, monospace" font-size="18" fill="#9aa6ba">matto.club</text>"""

ACCENTS = ["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]

# ---------------------------------------------------------------- concept A
TREE = [
    ("#ff006e", "&#9500;&#9472;", "the loop"),
    ("#fb5607", "&#9500;&#9472;", "tool calls"),
    ("#ffbe0b", "&#9500;&#9472;", "permissions"),
    ("#8338ec", "&#9500;&#9472;", "context management"),
    ("#3a86ff", "&#9492;&#9472;", "sessions"),
]
tree_lines = "\n    ".join(
    f'<text x="104" y="{358 + i * 38}"><tspan fill="{c}">{branch}</tspan><tspan fill="#c7cede"> {label}</tspan></text>'
    for i, (c, branch, label) in enumerate(TREE)
)

concept_a = svg(
    HEADLINE.format(title="A comparative analysis", subtitle="Ten agents, five components, one measuring stick.")
    + f"""
  <!-- the terminal -->
  <rect x="64" y="192" width="1072" height="364" rx="12" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.14"/>
  <path d="M64 204 a12 12 0 0 1 12-12 h1048 a12 12 0 0 1 12 12 v20 h-1072 z" fill="#454c5c"/>
  <circle cx="90" cy="208" r="5" fill="#ff5f56"/><circle cx="108" cy="208" r="5" fill="#ffbd2e"/><circle cx="126" cy="208" r="5" fill="#27c93f"/>
  <text x="152" y="213" font-family="Menlo, monospace" font-size="14" fill="#9aa6ba">clubmatto@matto.club: ~/ten-harnesses</text>

  <g font-family="Menlo, monospace" font-size="21">
    <text x="104" y="272" fill="#ff006e" font-weight="bold">$</text>
    <text x="129" y="272" fill="#eceff4">diff -r pinocchio/ ten-harnesses/</text>
    <text x="104" y="310" fill="#6f7b8d"># five components, ten implementations.</text>
    {tree_lines}
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept B
FINDINGS = [
    ("01", "the loop", "nearly identical in structure, everywhere"),
    ("02", "tool calls", "catalogues differ by an order of magnitude"),
    ("03", "permissions", "only two make isolation the default"),
    ("04", "context management", "same trick &#8212; the how and when differ"),
    ("05", "sessions", "a database, an append-only log, or a server"),
]
rows = "\n    ".join(
    f'<text x="64" y="{y}" font-family="Menlo, monospace" font-size="15" fill="#6f7b8d">{num}</text>'
    f'\n    <circle cx="{152 if len(name) < 15 else 152}" cy="{y - 6}" r="4" fill="{ACCENTS[i % 5]}"/>'
    f'\n    <text x="176" y="{y}" font-family="Menlo, monospace" font-size="20" font-weight="bold" fill="#eceff4">{name}</text>'
    f'\n    <text x="480" y="{y}" font-family="Menlo, monospace" font-size="17" fill="#9aa6ba">{finding}</text>'
    for i, ((num, name, finding), y) in enumerate(zip(FINDINGS, [244, 308, 372, 436, 500]))
)

concept_b = svg(
    HEADLINE.format(title="Ten agents, five lenses", subtitle="Same anatomy. Everything else splits.")
    + f"""
  <!-- five components, five findings -->
  <line x1="64" y1="222" x2="1136" y2="222" stroke="#eceff4" stroke-opacity="0.08"/>
  <g>
    {rows}
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept C
# the permissions spectrum: ten agents on a trust axis
AGENTS = [
    # (name, x, sub-row 0=top/1=bottom, accent index)
    ("Pi", 170, 0, 0),
    ("Aider (reversibility)", 285, 1, 1),
    ("OpenCode", 430, 0, 2),
    ("Kimi", 505, 1, 3),
    ("Crush", 555, 0, 4),
    ("Goose", 700, 1, 0),
    ("OpenHands", 770, 1, 1),
    ("Qwen", 875, 0, 2),
    ("DeepSeek Harness", 950, 1, 3),
    ("Codex", 1030, 0, 4),
]
BANDS = [
    (140, 340, "no gate"),
    (340, 640, "rule-based"),
    (640, 905, "llm as judge"),
    (905, 1060, "isolation"),
]
band_rects = "\n    ".join(
    f'<rect x="{x0}" y="360" width="{x1 - x0}" height="80" fill="#3a404d" fill-opacity="{0.25 + 0.12 * i}"/>'
    f'\n    <text x="{(x0 + x1) / 2}" y="348" font-family="Menlo, monospace" font-size="13" letter-spacing="2" fill="#8f9bb0" text-anchor="middle">{label.upper()}</text>'
    for i, (x0, x1, label) in enumerate(BANDS)
)
agent_marks = "\n    ".join(
    f'<line x1="{x}" y1="407" x2="{x}" y2="{490 if row else 455}" stroke="#9aa6ba" stroke-width="1" stroke-dasharray="2 4" opacity="0.7"/>'
    f'\n    <text x="{x}" y="{505 if row else 470}" font-family="Menlo, monospace" font-size="15" font-weight="bold" fill="#eceff4" text-anchor="middle">{name}</text>'
    f'\n    <circle cx="{x}" cy="400" r="5" fill="{ACCENTS[accent]}" stroke="#2e3440" stroke-width="1.5"/>'
    for name, x, row, accent in AGENTS
)

concept_c = svg(
    HEADLINE.format(title="The permissions spectrum", subtitle="One bash command. Ten different meanings.")
    + f"""
  <!-- the safety spectrum -->
  <g>
    {band_rects}
  </g>
  <line x1="140" y1="400" x2="1075" y2="400" stroke="#eceff4" stroke-opacity="0.35"/>
  <polygon points="1075,393 1090,400 1075,407" fill="#eceff4" fill-opacity="0.35"/>
  <g>
    {agent_marks}
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept D
# v2's five findings, Pinocchio-style: the vintage telephone exchange
# illustration carries one callout per component, anchored to its anatomy.
ART = OUT / "exchange-dark.png"
art_b64 = base64.b64encode(ART.read_bytes()).decode()
AS = 430 / 1024
AX, AY = 210, 170

def apt(ix: float, iy: float) -> tuple[int, int]:
    return (round(AX + ix * AS), round(AY + iy * AS))

# component -> anchor on the switchboard, label row y, colors
CALLS = [
    ("the loop", "nearly identical, everywhere", apt(340, 390), 240, "#ff006e"),
    ("sessions", "a database, a log, or a server", apt(140, 450), 312, "#fb5607"),
    ("permissions", "only two default to isolation", apt(300, 515), 384, "#ffbe0b"),
    ("tool calls", "catalogues differ by an order of magnitude", apt(430, 720), 456, "#8338ec"),
    ("context management", "same trick, different when", apt(300, 850), 528, "#3a86ff"),
]
callout_svgs = []
for name, finding, (dx, dy), ly, color in CALLS:
    sx = dx + 6 if dx < 500 else dx - 6
    callout_svgs.append(
        f'<path d="M{sx} {dy} L552 {ly - 4}" stroke="#9aa6ba" stroke-width="1.5" stroke-dasharray="2 6" fill="none"/>'
        f'\n    <circle cx="{dx}" cy="{dy}" r="5" fill="{color}" stroke="#2e3440" stroke-width="1.5"/>'
        f'\n    <text x="560" y="{ly}" font-family="Menlo, monospace" font-size="18" font-weight="bold" fill="#eceff4">{name}</text>'
        f'\n    <text x="560" y="{ly + 22}" font-family="Menlo, monospace" font-size="14" fill="#9aa6ba">{finding}</text>'
    )
callouts = "\n    ".join(callout_svgs)

concept_d = svg(
    HEADLINE.format(title="Ten agents, five lenses", subtitle="Same anatomy. Everything else splits.")
    + f"""
  <!-- vintage telephone exchange (transparent png) -->
  <svg x="{AX}" y="{AY}" width="{round(683 * AS)}" height="430" viewBox="0 0 683 1024" preserveAspectRatio="xMidYMid meet">
    <image x="0" y="0" width="683" height="1024" xlink:href="data:image/png;base64,{art_b64}"/>
  </svg>

  <!-- five components, anchored to the switchboard -->
  <g font-family="Menlo, monospace">
    {callouts}
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept E
# the radar: pinocchio at the center, five component axes, ten agents around
CX, CY = 600, 388
ANGLES = [270, 342, 54, 126, 198]  # degrees, 0 = +x, y grows downward
COMPONENTS = [
    ("the loop", "#ff006e"),
    ("tool calls", "#fb5607"),
    ("context management", "#ffbe0b"),
    ("permissions", "#8338ec"),
    ("sessions", "#3a86ff"),
]

def pol(deg: float, rx: float, ry: float) -> tuple[float, float]:
    rad = math.radians(deg)
    return (CX + rx * math.cos(rad), CY + ry * math.sin(rad))

def pentagon(rx: float, ry: float, op: float) -> str:
    pts = " ".join(f"{x:.1f},{y:.1f}" for x, y in (pol(a, rx, ry) for a in ANGLES))
    return f'<polygon points="{pts}" fill="none" stroke="#eceff4" stroke-opacity="{op}"/>'

rings = f"""
  {pentagon(250, 118, 0.28)}
  {pentagon(137, 65, 0.18)}
"""
axes = "\n    ".join(
    f'<line x1="{CX}" y1="{CY}" x2="{pol(a, 250, 118)[0]:.1f}" y2="{pol(a, 250, 118)[1]:.1f}" stroke="#eceff4" stroke-opacity="0.3"/>'
    for a in ANGLES
)

# component chips at the five vertices
chip_specs = [
    ("the loop", "#ff006e", 557, 230, "center"),
    ("tool calls", "#fb5607", 848, 339, "left"),
    ("context management", "#ffbe0b", 663, 497, "center"),
    ("permissions", "#8338ec", 398, 497, "center"),
    ("sessions", "#3a86ff", 266, 339, "right"),
]
chip_w = {"the loop": 86, "tool calls": 102, "context management": 168, "permissions": 110, "sessions": 86}
chips = "\n    ".join(
    f'<rect x="{x}" y="{y}" width="{chip_w[name]}" height="26" rx="8" fill="#2e3440" fill-opacity="0.9" stroke="{accent}" stroke-width="1.5"/>'
    f'\n    <text x="{x + chip_w[name] / 2}" y="{y + 17}" font-family="Menlo, monospace" font-size="13" fill="#eceff4" text-anchor="middle">{name}</text>'
    for name, accent, x, y, _ in chip_specs
)

AGENTS_L = ["OpenCode", "Aider", "DeepSeek Harness", "Qwen Code", "Pi"]
AGENTS_R = ["Kimi Code CLI", "Crush", "OpenHands", "Goose", "Codex CLI"]
ROW_Y = [240, 316, 392, 468, 544]
agent_lines = "\n    ".join(
    f'<line x1="240" y1="{y - 5}" x2="600" y2="388" stroke="#9aa6ba" stroke-width="1" stroke-dasharray="2 6" opacity="0.4"/>'
    for y in ROW_Y
) + "\n    " + "\n    ".join(
    f'<line x1="960" y1="{y - 5}" x2="600" y2="388" stroke="#9aa6ba" stroke-width="1" stroke-dasharray="2 6" opacity="0.4"/>'
    for y in ROW_Y
)
agent_names = "\n    ".join(
    f'<circle cx="72" cy="{y - 5}" r="4" fill="{ACCENTS[i % 5]}"/>'
    f'\n    <text x="88" y="{y}" font-family="Menlo, monospace" font-size="16" fill="#eceff4">{name}</text>'
    for i, (name, y) in enumerate(zip(AGENTS_L, ROW_Y))
) + "\n    " + "\n    ".join(
    f'<circle cx="966" cy="{y - 5}" r="4" fill="{ACCENTS[i % 5]}"/>'
    f'\n    <text x="980" y="{y}" font-family="Menlo, monospace" font-size="16" fill="#eceff4">{name}</text>'
    for i, (name, y) in enumerate(zip(AGENTS_R, ROW_Y))
)

concept_e = svg(
    HEADLINE.format(title="A comparative analysis", subtitle="Same anatomy. Everything else splits.")
    + f"""
  <!-- the radar: one anatomy, ten agents, one measuring stick -->
  <g>
    {rings}
    {axes}
  </g>
  <g>
    {agent_lines}
  </g>
  <g>
    {chips}
  </g>
  <g>
    {agent_names}
  </g>
  <!-- pinocchio, the measuring stick -->
  <g>
    <rect x="505" y="360" width="190" height="56" rx="12" fill="#2e3440" stroke="url(#logoGradient)" stroke-width="1.5"/>
    <text x="600" y="384" font-family="Menlo, monospace" font-size="17" font-weight="bold" fill="#eceff4" text-anchor="middle">Pinocchio</text>
    <text x="600" y="404" font-family="Menlo, monospace" font-size="12" font-style="italic" fill="#9aa6ba" text-anchor="middle">the measuring stick</text>
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept F
# the lineup wall: ten mini terminals, one per agent
AGENTS = [
    # (name, language, license)
    ("OpenCode", "typescript", "MIT"),
    ("Aider", "python", "Apache-2.0"),
    ("DeepSeek Harness", "typescript", "MIT"),
    ("Qwen Code", "typescript", "Apache-2.0"),
    ("Pi", "typescript", "MIT"),
    ("Kimi Code CLI", "typescript", "MIT"),
    ("Crush", "go", "FSL-1.1"),
    ("OpenHands", "ts + python", "MIT"),
    ("Goose", "rust", "Apache-2.0"),
    ("Codex CLI", "rust", "Apache-2.0"),
]
lineup = []
for i, (name, lang, lic) in enumerate(AGENTS):
    wx = 64 + (i % 5) * 218
    wy = 208 + (i // 5) * 160
    accent = ACCENTS[i % 5]
    lineup.append(
        f'<rect x="{wx}" y="{wy}" width="200" height="140" rx="10" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.13"/>'
        f'\n    <path d="M{wx} {wy + 10} a10 10 0 0 1 10 -10 h180 a10 10 0 0 1 10 10 v14 h-200 z" fill="#454c5c"/>'
        f'\n    <circle cx="{wx + 14}" cy="{wy + 12}" r="3.5" fill="#ff5f56"/><circle cx="{wx + 26}" cy="{wy + 12}" r="3.5" fill="#ffbd2e"/><circle cx="{wx + 38}" cy="{wy + 12}" r="3.5" fill="#27c93f"/>'
        f'\n    <text x="{wx + 50}" y="{wy + 16}" font-family="Menlo, monospace" font-size="11" fill="#8f9bb0">{lang}</text>'
        f'\n    <text x="{wx + 16}" y="{wy + 66}" font-family="Menlo, monospace" font-size="15" font-weight="bold"><tspan fill="{accent}">$</tspan><tspan fill="#eceff4" dx="6">{name}</tspan></text>'
        f'\n    <text x="{wx + 32}" y="{wy + 92}" font-family="Menlo, monospace" font-size="11" fill="#9aa6ba">{lic}</text>'
    )
lineup_svg = "\n    ".join(lineup)

concept_f = svg(
    HEADLINE.format(title="A comparative analysis", subtitle="Ten open-source agents, read at the source.")
    + f"""
  <!-- the lineup wall -->
  <g>
    {lineup_svg}
  </g>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept G
# the library shelf: ten covers on a wooden shelf
MAKERS = ["SST", "paul-gauthier", "DeepSeek", "Alibaba", "earendil-works", "Moonshot AI", "Charmbracelet", "All Hands AI", "Block", "OpenAI"]
NAMES_WRAPPED = [
    ["OpenCode"], ["Aider"], ["DeepSeek", "Harness"], ["Qwen Code"], ["Pi"],
    ["Kimi", "Code CLI"], ["Crush"], ["OpenHands"], ["Goose"], ["Codex CLI"],
]
shelf_books = []
for i, (name, lang, lic) in enumerate(AGENTS):
    accent = ACCENTS[i % 5]
    bx = 64 + i * 107
    bh = 250 + (i % 3) * 14
    by = 498 - bh
    lines = "\n    ".join(
        f'<text x="{bx + 14}" y="{by + 28 + j * 17}" font-family="Menlo, monospace" font-size="12" font-weight="bold" fill="#eceff4">{ln}</text>'
        for j, ln in enumerate(NAMES_WRAPPED[i])
    )
    shelf_books.append(
        f'<rect x="{bx}" y="{by}" width="100" height="{bh}" rx="4" fill="#262c38" stroke="#eceff4" stroke-opacity="0.1"/>'
        f'\n    <rect x="{bx}" y="{by}" width="5" height="{bh}" rx="2" fill="{accent}"/>'
        f'\n    {lines}'
        f'\n    <text x="{bx + 14}" y="{by + bh - 14}" font-family="Menlo, monospace" font-size="9" fill="#9aa6ba">{MAKERS[i]}</text>'
    )
shelf_svg_books = "\n    ".join(shelf_books)

concept_g = svg(
    HEADLINE.format(title="A comparative analysis", subtitle="We read the source of all ten.")
    + f"""
  <!-- the library shelf -->
  <g>
    {shelf_svg_books}
  </g>
  <rect x="44" y="498" width="1112" height="14" rx="3" fill="#5a4230"/>
  <rect x="44" y="498" width="1112" height="3" fill="#7a5c40"/>
  <rect x="52" y="512" width="1096" height="5" fill="#000000" fill-opacity="0.3"/>
"""
    + "\n" + FOOTER,
)

# ---------------------------------------------------------------- concept H
# the periodic table: ten elements
ELEMENTS = [
    ("OpenCode", "Oc", "typescript", "MIT"),
    ("Aider", "Ai", "python", "Apache-2.0"),
    ("DeepSeek Harness", "Ds", "typescript", "MIT"),
    ("Qwen Code", "Qw", "typescript", "Apache-2.0"),
    ("Pi", "&#960;", "typescript", "MIT"),
    ("Kimi Code CLI", "Km", "typescript", "MIT"),
    ("Crush", "Cr", "go", "FSL-1.1"),
    ("OpenHands", "Oh", "ts + python", "MIT"),
    ("Goose", "Go", "rust", "Apache-2.0"),
    ("Codex CLI", "Cx", "rust", "Apache-2.0"),
]
element_tiles = []
for i, (name, symbol, lang, lic) in enumerate(ELEMENTS):
    wx = 64 + (i % 5) * 218
    wy = 208 + (i // 5) * 170
    accent = ACCENTS[i % 5]
    element_tiles.append(
        f'<rect x="{wx}" y="{wy}" width="200" height="150" rx="10" fill="#3a404d" stroke="#eceff4" stroke-opacity="0.13"/>'
        f'\n    <text x="{wx + 12}" y="{wy + 22}" font-family="Menlo, monospace" font-size="11" fill="#8f9bb0">{i + 1:02d}</text>'
        f'\n    <text x="{wx + 188}" y="{wy + 22}" font-family="Menlo, monospace" font-size="11" fill="{accent}" text-anchor="end">{lang}</text>'
        f'\n    <text x="{wx + 100}" y="{wy + 74}" font-family="Menlo, monospace" font-size="34" font-weight="bold" fill="{accent}" text-anchor="middle">{symbol}</text>'
        f'\n    <text x="{wx + 100}" y="{wy + 102}" font-family="Menlo, monospace" font-size="13" fill="#eceff4" text-anchor="middle">{name}</text>'
        f'\n    <text x="{wx + 100}" y="{wy + 128}" font-family="Menlo, monospace" font-size="11" fill="#9aa6ba" text-anchor="middle">{lic}</text>'
    )
elements_svg = "\n    ".join(element_tiles)

concept_h = svg(
    HEADLINE.format(title="A comparative analysis", subtitle="Ten elements, one anatomy.")
    + f"""
  <!-- the periodic table -->
  <g>
    {elements_svg}
  </g>
"""
    + "\n" + FOOTER,
)

OUT.mkdir(exist_ok=True)
(OUT / "comparative-a-terminal.svg").write_text(concept_a)
(OUT / "comparative-b-lenses.svg").write_text(concept_b)
(OUT / "comparative-c-spectrum.svg").write_text(concept_c)
(OUT / "comparative-d-exchange.svg").write_text(concept_d)
(OUT / "comparative-e-radar.svg").write_text(concept_e)
(OUT / "comparative-f-lineup.svg").write_text(concept_f)
(OUT / "comparative-g-shelf.svg").write_text(concept_g)
(OUT / "comparative-h-periodic.svg").write_text(concept_h)
print("wrote 8 svgs to", OUT)
