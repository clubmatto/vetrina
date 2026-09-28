#!/usr/bin/env python3
"""Key out the plaster wall of the exchange photo via border flood-fill."""
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

SRC = Path(__file__).parent / "exchange-illustration.png"
DST = Path(__file__).parent / "exchange-cut.png"

img = Image.open(SRC).convert("RGBA")
w, h = img.size
px = img.load()

# sample the plaster tone from several border points
samples = [px[2, 2], px[w // 2, 2], px[w - 3, 2], px[2, h // 2], px[w - 3, h // 2], px[2, h - 3], px[w - 3, h - 3]]
base = tuple(sum(c[i] for c in samples) // len(samples) for i in range(3))
TOL = 100  # sum of per-channel deltas

def is_bg(p) -> bool:
    r, g, b = p[0], p[1], p[2]
    return abs(r - base[0]) + abs(g - base[1]) + abs(b - base[2]) < TOL or p[3] < 12

seen = [[False] * w for _ in range(h)]
q = deque()
for x in range(w):
    for y in (0, h - 1):
        if is_bg(px[x, y]) and not seen[y][x]:
            seen[y][x] = True
            q.append((x, y))
for y in range(h):
    for x in (0, w - 1):
        if is_bg(px[x, y]) and not seen[y][x]:
            seen[y][x] = True
            q.append((x, y))

while q:
    x, y = q.popleft()
    px[x, y] = (0, 0, 0, 0)
    for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
        if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and is_bg(px[nx, ny]):
            seen[ny][nx] = True
            q.append((nx, ny))

# 1px alpha feather so cut edges don't alias
alpha = img.getchannel("A").filter(ImageFilter.GaussianBlur(1))
img.putalpha(alpha)

img.save(DST)
print("saved", DST, "base color", base)
