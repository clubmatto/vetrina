# Experiments

The runnable harnesses behind the How coding agents work series. One directory
per experiment, self-contained so its numbers stay reproducible after the
article ships.

| Experiment | Article | Question |
| --- | --- | --- |
| [tools](./tools/) | [Tools](../tools.md) | What does the shape of the tool surface cost? |
| [fanout](./fanout/) | [Sub-agents](../sub-agents.md) | What does delegating the same task to 1, 2, or 4 sub-agents cost? |

## Convention

- `run.sh` runs one cell and writes to `runs/<label>`.
- `extract.py` turns the raw runs into rows for `results/`.
- `fixtures/` holds the task and any generated inputs.
- `results/` holds the numbers the article quotes. `runs/` is gitignored.
- `website/.eleventyignore` ignores the whole `experiments/` directory, so
  experiment markdown never ships as posts.

Keep each experiment self-contained. Shared helpers go in `common/` only when
two experiments need the same code and the duplication is real.
