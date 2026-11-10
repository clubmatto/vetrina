#!/usr/bin/env python3
"""Extract fan-out metrics from one or more runs.

    python3 extract.py <label> [<label> ...]
    python3 extract.py --expect 4 fanout-4

Reads runs/<label>.jsonl (stream-json), runs/<label>-spans.jsonl (OTel spans),
and runs/<label>.wall. The file outcome is read from the copied fixture under
runs/<label>/.

The four services each carry eight real DB_HOST keys and eight DB_HOST_OLD
decoys, so a correct run has 32 renamed, 0 left, 32 decoys kept, and 0 decoys
renamed.
"""

import argparse
import json
import pathlib
import re
import sys
from datetime import datetime, timezone

HERE = pathlib.Path(__file__).resolve().parent
RUNS = HERE / "runs"
RESULTS = HERE / "results"

AGENT_TOOLS = {"agent", "Agent"}
EXPECTED_RENAMED = 32
EXPECTED_DECOYS = 32


def events(label):
    path = RUNS / f"{label}.jsonl"
    if not path.exists():
        return
    with path.open() as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                pass


def result_event(label):
    return next((e for e in events(label) if e.get("type") == "result"), {})


def tool_calls(label):
    calls = []
    for e in events(label):
        if e.get("type") != "assistant":
            continue
        for c in (e.get("message", {}) or {}).get("content", []) or []:
            if isinstance(c, dict) and c.get("type") == "tool_use":
                calls.append(c.get("name"))
    return calls


def load_spans(label):
    path = RUNS / f"{label}-spans.jsonl"
    if not path.exists():
        return []
    text = path.read_text(errors="ignore")
    decoder = json.JSONDecoder()
    spans = []
    i = 0
    while i < len(text):
        while i < len(text) and text[i].isspace():
            i += 1
        if i >= len(text):
            break
        try:
            obj, i = decoder.raw_decode(text, i)
        except json.JSONDecodeError:
            break
        spans.append(obj)
    return spans


def unique_spans(spans):
    """The file exporter can flush the same span twice; keep the last copy."""
    by_id = {}
    for span in spans:
        span_id = (span.get("_spanContext") or {}).get("spanId")
        by_id[span_id or id(span)] = span
    return list(by_id.values())


def subagent_spans(label):
    found = []
    for span in unique_spans(load_spans(label)):
        if span.get("name") != "qwen-code.subagent":
            continue
        a = span.get("attributes", {}) or {}
        found.append(
            {
                "id": a.get("qwen-code.subagent.id"),
                "name": a.get("qwen-code.subagent.name"),
                "depth": a.get("qwen-code.subagent.depth"),
                "status": a.get("qwen-code.subagent.status"),
                "duration_ms": a.get("qwen-code.subagent.duration_ms")
                or a.get("duration_ms"),
            }
        )
    return found


def span_usage(label):
    totals = {"input": 0, "output": 0, "cached": 0}
    for span in unique_spans(load_spans(label)):
        if span.get("name") != "qwen-code.llm_request":
            continue
        a = span.get("attributes", {}) or {}
        totals["input"] += int(a.get("gen_ai.usage.input_tokens") or 0)
        totals["output"] += int(a.get("gen_ai.usage.output_tokens") or 0)
        totals["cached"] += int(a.get("gen_ai.usage.cache_read.input_tokens") or 0)
    return totals


def parent_agent_calls(label):
    calls = []
    for e in events(label):
        if e.get("type") != "assistant" or e.get("parent_tool_use_id") is not None:
            continue
        for c in (e.get("message", {}) or {}).get("content", []) or []:
            if isinstance(c, dict) and c.get("type") == "tool_use" and c.get("name") in AGENT_TOOLS:
                calls.append(c)
    return calls


def span_child_count(label):
    return len({s["id"] for s in subagent_spans(label) if s.get("id")})


def child_count(label):
    calls = len(parent_agent_calls(label))
    if calls:
        return calls, "calls"
    return span_child_count(label), "spans"


def wall_s(label):
    path = RUNS / f"{label}.wall"
    if not path.exists():
        return None
    try:
        return float(path.read_text().strip())
    except ValueError:
        return None


def rename_outcome(label):
    root = RUNS / label
    text = ""
    for p in root.rglob("*"):
        if p.is_file() and ".qwen" not in p.parts:
            try:
                text += p.read_text(errors="ignore")
            except OSError:
                pass
    return {
        "renamed": len(re.findall(r"DATABASE_HOST(?!_OLD)", text)),
        "left": len(re.findall(r"DB_HOST(?!_OLD)", text)),
        "decoy_kept": len(re.findall(r"DB_HOST_OLD", text)),
        "decoy_renamed": len(re.findall(r"DATABASE_HOST_OLD", text)),
    }


def metrics(label):
    result = result_event(label)
    usage = result.get("usage", {}) or {}
    children, source = child_count(label)
    spans = span_usage(label)
    wall = wall_s(label)
    outcome = rename_outcome(label)
    return {
        "label": label,
        "children": children,
        "children_source": source,
        "span_children": span_child_count(label),
        "subagents": subagent_spans(label),
        "turns": result.get("num_turns"),
        "tool_calls": len(tool_calls(label)),
        "input": usage.get("input_tokens"),
        "output": usage.get("output_tokens"),
        "cached": usage.get("cache_read_input_tokens"),
        "span_input": spans["input"],
        "span_output": spans["output"],
        "span_cached": spans["cached"],
        "wall_s": wall,
        "duration_ms": result.get("duration_ms"),
        "outcome": outcome,
        "outcome_ok": outcome["renamed"] == EXPECTED_RENAMED
        and outcome["left"] == 0
        and outcome["decoy_kept"] == EXPECTED_DECOYS
        and outcome["decoy_renamed"] == 0,
    }


def fmt(value, width, spec=""):
    if value is None:
        return f"{'-':>{width}}"
    return f"{value:{spec}>{width}}"


def print_table(rows):
    header = (
        f"{'run':22} {'kids':>4} {'spans':>5} {'src':>6} {'turns':>5} {'calls':>5} "
        f"{'input':>9} {'output':>7} {'cached':>9} {'wall_s':>7} "
        f"{'ren':>4} {'left':>4} {'decoy':>5} {'bad':>4} {'ok':>3}"
    )
    print(header)
    print("-" * len(header))
    for r in rows:
        o = r["outcome"]
        wall = f"{r['wall_s']:.1f}" if r["wall_s"] is not None else None
        print(
            f"{r['label']:22} {r['children']:>4} {r['span_children']:>5} "
            f"{r['children_source']:>6} "
            f"{fmt(r['turns'], 5)} {r['tool_calls']:>5} "
            f"{fmt(r['input'], 9)} {fmt(r['output'], 7)} {fmt(r['cached'], 9)} "
            f"{fmt(wall, 7)} {o['renamed']:>4} {o['left']:>4} "
            f"{o['decoy_kept']:>5} {o['decoy_renamed']:>4} "
            f"{'yes' if r['outcome_ok'] else 'NO':>3}"
        )


def write_results(rows):
    RESULTS.mkdir(parents=True, exist_ok=True)
    columns = [
        "label",
        "children",
        "children_source",
        "span_children",
        "turns",
        "tool_calls",
        "input",
        "output",
        "cached",
        "span_input",
        "span_output",
        "span_cached",
        "wall_s",
        "duration_ms",
        "renamed",
        "left",
        "decoy_kept",
        "decoy_renamed",
        "outcome_ok",
    ]
    with (RESULTS / "summary.tsv").open("w") as fh:
        fh.write("\t".join(columns) + "\n")
        for r in rows:
            o = r["outcome"]
            values = {
                **r,
                **o,
                "outcome_ok": "yes" if r["outcome_ok"] else "no",
            }
            fh.write(
                "\t".join(
                    "" if values[c] is None else str(values[c]) for c in columns
                )
                + "\n"
            )
    payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "runs": rows,
    }
    (RESULTS / "results.json").write_text(json.dumps(payload, indent=2) + "\n")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("labels", nargs="+", help="run labels, for example fanout-4-r1")
    parser.add_argument(
        "--expect",
        type=int,
        help="expected number of sub-agents; exit non-zero when a run disagrees",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="print the table but do not write results/",
    )
    args = parser.parse_args(argv)

    if args.expect is not None and len(args.labels) != 1:
        parser.error("--expect takes exactly one label")

    rows = []
    missing = []
    for label in args.labels:
        if not (RUNS / f"{label}.jsonl").exists():
            missing.append(label)
            continue
        rows.append(metrics(label))

    print_table(rows)
    if missing:
        print(f"missing runs: {', '.join(missing)}")

    if rows and not args.no_write:
        write_results(rows)

    if args.expect is not None:
        if not rows:
            return 1
        actual = rows[0]["children"]
        if actual != args.expect:
            print(
                f"VIOLATION: {rows[0]['label']} spawned {actual} sub-agent call(s), "
                f"expected {args.expect} "
                f"({rows[0]['children_source']}, spans={rows[0]['span_children']})",
                file=sys.stderr,
            )
            return 1

    return 1 if missing else 0


if __name__ == "__main__":
    sys.exit(main())
