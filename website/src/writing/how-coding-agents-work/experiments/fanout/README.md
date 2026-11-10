# Fan-out experiment

The same rename task, delegated to 1, 2, or 4 fresh sub-agents. It measures the
tokens and wall clock the parent pays for fan-out, and whether the work comes
back correct.

The task is the rename fixture from the [tools experiment](../tools/), copied
four times. Each service (`svc-a` to `svc-d`) contains the same trap: eight real
`DB_HOST` keys and eight `DB_HOST_OLD` decoys.

## Setup

Requires Qwen Code 0.27.1 on `PATH` (or `QWEN=/path/to/qwen`) and a DeepSeek
key:

```bash
npm install --prefix /tmp/qwen @qwen-code/qwen-code@0.27.1
export PATH=/tmp/qwen/node_modules/.bin:$PATH
export DEEPSEEK_API_KEY=...
```

`run.sh` also sources `fanout/.env.local` when it exists, so the key can live
there instead (that file is gitignored):

```bash
printf 'DEEPSEEK_API_KEY=...\n' > .env.local
```

## Run

```bash
./make-fixture.sh          # once, builds fixtures/rename-fanout
./run.sh 4 fanout-4
./run.sh 1 fanout-1
./run.sh 2 fanout-2
```

`run.sh` copies `fixtures/rename-fanout` to `runs/<label>`, writes the Qwen
settings, and points `HOME` at `runs/<label>-home` so Qwen can write its cache
inside the workspace. It records:

- `runs/<label>.jsonl`: stream-json output
- `runs/<label>-logs/`: outgoing request payloads
- `runs/<label>-spans.jsonl`: OTel spans, including subagent spans
- `runs/<label>.wall`: process wall clock
- `runs/<label>.err`: stderr

It then prints the row and exits non-zero if the number of sub-agents does not
match the condition. Use `DRY_RUN=1` to set up a cell and print the command
without calling the model.

```bash
./run-all.sh            # 1, 2, 4 with one rep each
REPS=3 ./run-all.sh     # three reps per condition
python3 extract.py fanout-1-r1 fanout-2-r1 fanout-4-r1
```

## What is measured

- `result.usage`: input, output, and cached tokens. Qwen aggregates parent and
  subagent requests in the final result.
- `wall`: process wall clock, start to exit.
- `children`: unique `qwen-code.subagent` span IDs, with the `agent` tool-call
  count as a fallback.
- `renamed`, `left`, `decoy_kept`, `decoy_renamed`: file outcome across the four
  services. Correct is 32 renamed, 0 left, 32 decoys kept, 0 decoys renamed.
- Span totals are reported next to the result totals as a cross-check.

## Caveats

- One harness, Qwen Code 0.27.1, one model, one task.
- Fresh sub-agents, not forks. Forks share the parent prefix and prompt cache,
  so their cost curve is different.
- Wall clock is provider-latency dominated. One run per cell is an anecdote.
  Use `REPS=3` or more before quoting timings.
- The fixture is small. It shows the fan-out tax on a short task, not the
  crossover where parallel exploration starts to pay.
