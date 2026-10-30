#!/usr/bin/env python3
"""Check the Marketing board (Lasagna) against mercato/ and report drift.

Run it as `python3 mercato/docs/invariants.py` (or make it executable). It
fetches the board through Cloudflare Access with the lasagna_* service-token
secrets (evaluated from Infisical if not already in the environment — curl is
mandatory, urllib's TLS fingerprint gets blocked), then checks:

  1. every published card references an existing posts/ file, and every posts/
     file inside the tracked era has a published card (the era starts at the
     oldest post that does have one; older history predates the board)
  2. every drafts/ file is referenced by a card that is neither published nor
     still sitting in ideas/drafting
  3. no draft carries a publish_date that has already passed — that means the
     post shipped somewhere but the move-to-posts/ flow never ran
  4. image frontmatter pointing at a github blob URL resolves to a local asset
  5. due-date hygiene: nothing overdue in editing/review/ready, nothing due
     today or earlier still in ideas/drafting
  6. every tweet in a Twitter section fits in 280 chars with links as 23

Exits non-zero if anything violates, so it can run unattended.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[2]
MERCATO = ROOT / "mercato"
BOARD_URL = "https://lasagna.matto.club/api/cards?board_id=ec783a0b-ba74-484c-8093-2228b830fdda"
INFISICAL = (
    "infisical secrets --projectId=8019187e-4f3c-47fa-a06d-578769e3acf5 "
    "--env=production --path=/lasagna --plain"
)

STAGES = {
    "28acd956-d31b-48f3-a1b2-1105b1d0cdf1": "ideas",
    "cd5d5f73-43fa-47e3-82c6-2b4a21539863": "drafting",
    "1cbae82c-36a1-44cb-81d7-a13144ab4881": "editing",
    "b62963be-a44b-47e5-8731-58bbe2705fe8": "review",
    "206ea33e-9f02-4a46-9ed8-26a13a6bc2e4": "ready",
    "a08c7e7a-48af-4444-81eb-344aab39b386": "published",
}

# Cards parked on purpose (guido content waiting on the video pipeline): their
# due dates are cleared, so no rule fires for them anyway.
PARKED = {"9494acf6"}


def fetch_board():
    env = dict(os.environ)
    if not env.get("lasagna_api_client_id"):
        out = subprocess.run(INFISICAL, shell=True, capture_output=True, text=True)
        for line in out.stdout.splitlines():
            if "=" in line:
                k, v = line.split("=", 1)
                env[k.strip()] = v.strip()
    for _ in range(3):
        r = subprocess.run(
            ["curl", "-s", "-w", "%{http_code}", BOARD_URL,
             "-H", f"CF-Access-Client-Id: {env['lasagna_api_client_id']}",
             "-H", f"CF-Access-Client-Secret: {env['lasagna_api_client_secret']}"],
            capture_output=True, text=True)
        if r.stdout.endswith("200"):
            return json.loads(r.stdout[:-3], strict=False)["data"]
    sys.exit("could not fetch the board (auth or network)")
    return []


def main():
    today = datetime.now(ZoneInfo("Europe/Rome")).strftime("%Y-%m-%d")
    cards = fetch_board()
    stage = lambda c: STAGES.get(c.get("stage_id"), c.get("stage_id"))
    urls = lambda c: re.findall(r"https?://[^\s\)\]]+", c.get("description") or "")

    posts = sorted(MERCATO.glob("posts/*.md"))
    drafts = sorted(MERCATO.glob("drafts/*.md"))
    post_slug = lambda p: re.sub(r"^\d{4}-\d{2}-\d{2}-", "", p.stem)
    draft_slug = lambda p: p.stem

    matched = [p for p in posts if any(
        stage(c) == "published" and any(post_slug(p) in u for u in urls(c))
        for c in cards)]
    era = min(p.name[:10] for p in matched)

    viol = []
    print(f"today {today} | cards {len(cards)} | posts {len(posts)} | drafts {len(drafts)} | era {era}")

    for c in cards:
        if stage(c) == "published" and not [p for p in posts if any(post_slug(p) in u for u in urls(c))]:
            viol.append(f"published card without post file: {c['title'][:60]}")
    for p in posts:
        if p.name >= era and not [c for c in cards if stage(c) == "published" and any(post_slug(p) in u for u in urls(c))]:
            viol.append(f"orphan post, no published card: {p.name}")

    for d in drafts:
        ref = [c for c in cards if draft_slug(d) in (c.get("description") or "")]
        if not ref:
            viol.append(f"orphan draft, no card references it: {d.name}")
        for c in ref:
            if stage(c) == "published":
                viol.append(f"illegitimate draft, card published: {d.name}")
            elif stage(c) in ("ideas", "drafting"):
                viol.append(f"draft exists but card in {stage(c)}: {d.name}")
        m = re.search(r"^publish_date: (\S+)", d.read_text(), re.M)
        if m and m.group(1) < today:
            viol.append(f"publish_date {m.group(1)} passed but still in drafts/: {d.name}")

    for f in posts + drafts:
        m = re.search(r"^image:\s*(\S+)", f.read_text(), re.M)
        if m and "github.com/clubmatto/vetrina/blob/main/" in m.group(1):
            if not (ROOT / m.group(1).split("/blob/main/")[1]).exists():
                viol.append(f"image asset missing: {f.name}")

    for c in cards:
        d = (c.get("due_date") or "")[:10]
        if not d or c["id"][:8] in PARKED:
            continue
        s = stage(c)
        if d < today and s in ("editing", "review", "ready"):
            viol.append(f"overdue in {s}: {c['title'][:55]} (due {d})")
        if d <= today and s in ("ideas", "drafting"):
            viol.append(f"due {d} but still in {s}: {c['title'][:55]}")
        if d == today and s != "published":
            has_draft = any(d_.stem in (c.get("description") or "") for d_ in drafts)
            print(f"due today: [{s}] {c['title'][:55]}" + ("" if has_draft else " — NO DRAFT"))

    for f in posts + drafts:
        txt = f.read_text()
        if "## Twitter" not in txt:
            continue
        tw = txt.split("## Twitter")[1].split("## LinkedIn")[0]
        for i, tweet in enumerate(re.split(r"\n### ", tw)[1:], 1):
            n = len(re.sub(r"https?://\S+", "x" * 23, tweet.strip()))
            if n > 280:
                viol.append(f"tweet over 280 ({n}): {f.name} #{i}")

    if viol:
        print("\n".join("VIOLATION: " + v for v in viol))
        sys.exit(1)
    print("ALL INVARIANTS HOLD")


if __name__ == "__main__":
    main()
