# OG image generator

Python scripts that produce the 2400x1260 banners in
`website/src/assets/writing/`. Run a script and copy the output where the article's
frontmatter `image:` expects it.

- `build-comparative-v2.py` — the comparative analysis of coding agents banner
- `build-tools-charts.py` — the tools deep dive charts, read from the experiment's
  own `results/summary.tsv`
- `key-bg.py` — shared keyboard-background helper

The scripts are self-contained except for Pillow:

```bash
pip install pillow
python3 tools/og/build-comparative-v2.py
```

`build-tools-charts.py` writes SVGs to `.og-drafts/`, which `rsvg-convert` turns
into the PNGs the site serves:

```bash
python3 tools/og/build-tools-charts.py
for f in tools-tokens tools-calls tools-clock; do
  rsvg-convert -w 2400 -h 1260 ".og-drafts/$f.svg" -o "website/src/assets/writing/$f.png"
done
```
