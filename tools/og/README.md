# OG image generator

Python scripts that produce the 2400x1260 banners in
`website/src/assets/writing/`. Run a script and copy the output where the article's
frontmatter `image:` expects it.

- `build-comparative-v2.py` — the comparative analysis of coding agents banner
- `key-bg.py` — shared keyboard-background helper

The scripts are self-contained except for Pillow:

```bash
pip install pillow
python3 tools/og/build-comparative-v2.py
```
