#!/usr/bin/env python3
"""The three tools deep dive charts, from the harness's own results file.

Outputs SVGs to .og-drafts; render them at 2x and copy the PNGs into
website/src/assets/writing/:

    python3 tools/og/build-tools-charts.py
    for f in tools-tokens tools-calls tools-clock; do
      rsvg-convert -w 2400 -h 1260 .og-drafts/$f.svg -o website/src/assets/writing/$f.png
    done

Two text lines only: the title names the metric, the subtitle states the setup.
House style: 1200x630 viewBox, rendered 2x by rsvg-convert, same palette and
footer as tools/og/build-comparative-v2.py.
"""
import csv
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS = ROOT / "website/src/writing/how-coding-agents-work/tools/results/summary.tsv"
OUT = ROOT / ".og-drafts"
OUT.mkdir(exist_ok=True)

rows = list(csv.DictReader(RUNS.open(), delimiter="\t"))
by = {r["label"]: r for r in rows}

PATHS = "\n      ".join(re.findall(r"<path[^>]*/>",
                                    (ROOT / "website/src/assets/header-logo.svg").read_text()))
SANS = "Helvetica Neue, Arial, sans-serif"
MONO = "Menlo, monospace"

TASKS = [
    ("rename", ["rename-one-tool", "rename-all-declared", "rename-on-demand"]),
    ("reference lookup",
     ["references-one-tool", "references-all-declared", "references-on-demand",
      "references-all-declared+lsp"]),
]
NAMES = {
    "rename-one-tool": "shell only",
    "rename-all-declared": "all declared",
    "rename-on-demand": "on demand",
    "references-one-tool": "shell only",
    "references-all-declared": "all declared",
    "references-on-demand": "on demand",
    "references-all-declared+lsp": "with gopls",
}

DEFS = """  <defs>
    <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff006e"/>
      <stop offset="25%" stop-color="#fb5607"/>
      <stop offset="50%" stop-color="#ffbe0b"/>
      <stop offset="75%" stop-color="#8338ec"/>
      <stop offset="100%" stop-color="#3a86ff"/>
    </linearGradient>
    <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ff006e"/>
      <stop offset="35%" stop-color="#fb5607"/>
      <stop offset="60%" stop-color="#ffbe0b"/>
      <stop offset="82%" stop-color="#8338ec"/>
      <stop offset="100%" stop-color="#3a86ff"/>
    </linearGradient>
    <radialGradient id="bgWash" cx="0.5" cy="0.32" r="1">
      <stop offset="0" stop-color="#353c4b"/>
      <stop offset="1" stop-color="#2e3440"/>
    </radialGradient>
  </defs>"""

FOOTER = f"""  <g transform="translate(64 578) scale(0.0300)">
    <g clip-path="url(#clipLogo)">
      {PATHS}
    </g>
    <defs><clipPath id="clipLogo"><rect width="1024" height="1024"/></clipPath></defs>
  </g>
  <text x="106" y="600" font-family="{MONO}" font-size="18" fill="#9aa6ba">matto.club</text>"""


def svg(title, subtitle, body):
    return f"""<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
{DEFS}

  <rect width="1200" height="630" fill="url(#bgWash)"/>

  <text x="62" y="96" font-family="{SANS}" font-weight="700" font-size="58" fill="#eceff4">{title}</text>
  <text x="64" y="140" font-family="{SANS}" font-size="24" fill="#aab4c4">{subtitle}</text>

{body}

{FOOTER}
</svg>
"""


def thousands(n):
    return f"{int(n):,}"


BAR_X, BAR_MAX, PITCH, BAR_H = 268, 700, 46, 28


def bars(metric, sub_of):
    """Horizontal bars per task, one scale across both tasks."""
    peak = max(float(r[metric]) for r in rows)
    out, y = [], 172
    for name, labels in TASKS:
        out.append(f'  <text x="64" y="{y}" font-family="{MONO}" font-size="21" fill="#ffbe0b">{name}</text>')
        y += 26
        for lab in labels:
            r = by[lab]
            value = float(r[metric])
            w = int(value / peak * BAR_MAX)
            shown = f"{value:.1f}s" if metric == "wall_s" else thousands(value)
            out.append(f'  <text x="64" y="{y + 14}" font-family="{SANS}" font-size="18" fill="#eceff4">{NAMES[lab]}</text>')
            out.append(f'  <text x="64" y="{y + 31}" font-family="{MONO}" font-size="13" fill="#6f7b8d">{sub_of(r)}</text>')
            out.append(f'  <rect x="{BAR_X}" y="{y}" width="{w}" height="{BAR_H}" rx="7" fill="url(#barGradient)"/>')
            out.append(f'  <text x="{BAR_X + w + 14}" y="{y + 20}" font-family="{MONO}" font-size="18" fill="#c7cede">{shown}</text>')
            y += PITCH
        y += 28
    return "\n".join(out)


SETUP = "One coding agent, the same two tasks, with 1, 2 or 28 tools declared."

CARDS = [
    ("tools-tokens", "Input tokens per task", SETUP,
     bars("input", lambda r: f'{r["calls"]} calls')),
    ("tools-calls", "Tool calls per task", SETUP,
     bars("calls", lambda r: f'{thousands(r["input"])} tokens')),
    ("tools-clock", "Wall clock per task", SETUP + " Each cell ran once.",
     bars("wall_s", lambda r: f'{r["calls"]} calls')),
]

for name, title, subtitle, body in CARDS:
    (OUT / f"{name}.svg").write_text(svg(title, subtitle, body))
    print("wrote", OUT / f"{name}.svg")
