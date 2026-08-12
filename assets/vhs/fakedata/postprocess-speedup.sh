#!/usr/bin/env bash
# Fast-forward the load segment of a recorded pro-postgres demo.
#
# The tape records the full 5,000,000-row load in real time (~4 min), then this
# script finds the load window via OCR (from the "Found 1 tables" start marker
# to the "Generated 5,000,000" summary) and re-times only that segment by ~30x,
# keeping the intro and the query result at normal speed.
#
# Usage: postprocess-speedup.sh <raw.mp4> <out.mp4> <workdir>
set -euo pipefail

RAW="$1"
OUT="$2"
WORK="$3"

rm -rf "$WORK"
mkdir -p "$WORK"

read FT1 FT2 <<< "$(python3 - "$RAW" "$WORK" <<'PY'
import os, re, subprocess, sys

raw, work = sys.argv[1], sys.argv[2]

def run(cmd):
    subprocess.run(cmd, check=True, capture_output=True)

def ocr(path):
    r = subprocess.run(["tesseract", path, "stdout", "--psm", "6"],
                       capture_output=True, text=True)
    return r.stdout

coarse = os.path.join(work, "coarse")
os.makedirs(coarse, exist_ok=True)
run(["ffmpeg", "-loglevel", "error", "-y", "-i", raw, "-vf", "fps=1",
     os.path.join(coarse, "f_%05d.png")])

ct1 = ct2 = None
for name in sorted(os.listdir(coarse)):
    if not name.endswith(".png"):
        continue
    idx = int(name.split("_")[1].split(".")[0])
    text = ocr(os.path.join(coarse, name))
    if ct1 is None and re.search(r"Found|Round 1", text):
        ct1 = idx - 1
    if ct2 is None and re.search(r"Generated 5", text):
        ct2 = idx - 1
    if ct1 is not None and ct2 is not None:
        break
print(f"coarse t1={ct1} t2={ct2}", file=sys.stderr, flush=True)
assert ct1 is not None and ct2 is not None, "could not locate load window"

def refine(regex, coarse_t, label):
    sub = os.path.join(work, label)
    os.makedirs(sub, exist_ok=True)
    start = max(0, coarse_t - 6)
    run(["ffmpeg", "-loglevel", "error", "-y", "-ss", str(start), "-i", raw,
         "-t", "12", "-vf", "fps=10", os.path.join(sub, "f_%05d.png")])
    for name in sorted(os.listdir(sub)):
        if not name.endswith(".png"):
            continue
        idx = int(name.split("_")[1].split(".")[0])
        if re.search(regex, ocr(os.path.join(sub, name))):
            return start + (idx - 1) / 10.0
    raise SystemExit(f"refine failed for {label}")

ft1 = refine(r"Found|Round 1", ct1, "ref_t1")
ft2 = refine(r"Generated 5", ct2, "ref_t2")
print(f"{ft1:.2f} {ft2:.2f}", flush=True)
PY
)"

echo "t1=$FT1 t2=$FT2"
N=$(python3 -c "import sys; t1,t2=map(float,sys.argv[1:]); n=round((t2-t1)/8); print(min(max(n,10),60))" "$FT1" "$FT2")
echo "speedup N=$N"

ffmpeg -loglevel error -y -i "$RAW" -filter_complex \
"[0:v]trim=start=0:end=${FT1},setpts=PTS-STARTPTS[a];\
[0:v]trim=start=${FT1}:end=${FT2},setpts=(PTS-STARTPTS)/${N}[b];\
[0:v]trim=start=${FT2},setpts=PTS-STARTPTS[c];\
[a][b][c]concat=n=3:v=1:a=0,fps=30,format=yuv420p[v]" \
-map "[v]" -an -c:v libx264 -crf 18 -preset medium -movflags +faststart "$OUT"

echo "wrote $OUT"
