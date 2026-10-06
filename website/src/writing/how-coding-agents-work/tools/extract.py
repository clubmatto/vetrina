#!/usr/bin/env python3
"""Extract the tools experiment metrics from a run's stream-json and request logs.

    python3 extract.py <label> [<label> ...]

Reads runs/<label>.jsonl (stream-json output) and runs/<label>-logs/openai-*.json
(the request payloads written by --openai-logging), and prints one row per run
plus the outcome checks for the two fixtures.
"""
import glob
import json
import pathlib
import re
import sys

HERE = pathlib.Path(__file__).resolve().parent
RUNS = HERE / "runs"


def declared_tools(label):
    """The real surface: what the outgoing request actually declared."""
    logs = sorted(glob.glob(str(RUNS / f"{label}-logs" / "openai-*.json")))
    main = [f for f in logs if "subagent" not in f]
    if not main:
        return None
    return len(json.load(open(main[0]))["request"].get("tools", []))


def events(label):
    with open(RUNS / f"{label}.jsonl") as fh:
        for line in fh:
            line = line.strip()
            if line:
                try:
                    yield json.loads(line)
                except json.JSONDecodeError:
                    pass


def session_metrics(label):
    ev = list(events(label))
    result = next((e for e in ev if e.get("type") == "result"), {})
    calls = []
    for e in ev:
        if e.get("type") != "assistant":
            continue
        for c in (e.get("message", {}) or {}).get("content", []) or []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                calls.append(c.get("name"))
    usage = result.get("usage", {}) or {}
    return {
        "turns": result.get("num_turns"),
        "calls": calls,
        "input": usage.get("input_tokens"),
        "output": usage.get("output_tokens"),
        "cached": usage.get("cache_read_input_tokens"),
        "duration_ms": result.get("duration_ms"),
    }


def rename_outcome(label):
    """The fixture has 8 real DB_HOST keys and 8 DB_HOST_OLD decoys."""
    text = ""
    for p in (RUNS / label).rglob("*"):
        if p.is_file() and ".qwen" not in p.parts:
            try:
                text += p.read_text()
            except (UnicodeDecodeError, PermissionError):
                pass
    return {
        "renamed": len(re.findall(r"DATABASE_HOST(?!_OLD)", text)),
        "left": len(re.findall(r"DB_HOST(?!_OLD)", text)),
        "decoy_kept": len(re.findall(r"DB_HOST_OLD", text)),
        "decoy_renamed": len(re.findall(r"DATABASE_HOST_OLD", text)),
    }


def references_outcome(label):
    """The two real call sites are HandleProfile and BuildReport; Charge is the decoy."""
    text = ""
    for e in events(label):
        if e.get("type") == "assistant":
            for c in (e.get("message", {}) or {}).get("content", []) or []:
                if isinstance(c, dict) and c.get("type") == "text":
                    text = c["text"]
    return {
        "HandleProfile": bool(re.search(r"HandleProfile", text)),
        "BuildReport": bool(re.search(r"BuildReport", text)),
        "mentions_Charge_decoy": bool(re.search(r"Charge", text)),
    }


def main(labels):
    print(f"{'run':26} {'decl':>4} {'turns':>5} {'calls':>5} {'input':>8} {'output':>6} {'cached':>8} {'wall_s':>7}")
    for label in labels:
        if not (RUNS / f"{label}.jsonl").exists():
            print(f"{label:26} (missing)")
            continue
        m = session_metrics(label)
        print(f"{label:26} {declared_tools(label) or 0:>4} {m['turns'] or 0:>5} {len(m['calls']):>5} "
              f"{m['input'] or 0:>8} {m['output'] or 0:>6} {m['cached'] or 0:>8} "
              f"{(m['duration_ms'] or 0)/1000:>7.1f}")
    for label in labels:
        if not (RUNS / label).exists():
            continue
        if label.startswith("rename"):
            print(f"  {label}: {rename_outcome(label)}")
        elif label.startswith("references"):
            print(f"  {label}: {references_outcome(label)}")


if __name__ == "__main__":
    main(sys.argv[1:] or ["rename-one-tool", "rename-all-declared", "rename-on-demand",
                          "references-one-tool", "references-all-declared", "references-on-demand"])
