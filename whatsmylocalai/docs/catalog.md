# Catalog

The page is a static build over four data sources: two npm packages, one
curated file, and two hardware tables generated or curated in this repo.

For detection and ranking, see [how-it-works.md](how-it-works.md).

## Where the data comes from

| Data                                   | Source                                                                             | Refreshed     |
| -------------------------------------- | ---------------------------------------------------------------------------------- | ------------- |
| Model list, descriptions, capabilities | [`models.dev`](https://models.dev) via `@opencode-ai/models/snapshot`              | Weekly, by CI |
| Q4 VRAM estimates, parameters          | [`@auxot/model-registry`](https://www.npmjs.com/package/@auxot/model-registry)     | Weekly, by CI |
| Ollama tags and blurbs                 | `src/_data/enrichment.json`, curated by us                                         | Manually      |
| GPU memory bandwidth                   | [GPU Ark](https://huggingface.co/datasets/Intelion/gpuark-gpu-dataset) (CC BY 4.0) | Weekly, by CI |
| Apple silicon bandwidth                | Apple tech specs, Wikipedia for older chips                                        | Manually      |

The merged catalog is built by `src/_lib/models-merge.js`: take Q4 entries from
the registry, deduplicate by model name, match each to models.dev for a
description and extra capabilities, then attach the enrichment entry. The page
only ships Q4, so the sizes and the `~X GB Q4` chips agree.

## The weekly refresh

`.github/workflows/whatsmylocalai-catalog.yml` runs on Mondays at 04:00 UTC,
and on demand through `workflow_dispatch`. In one pass it:

1. Bumps `@opencode-ai/models` and `@auxot/model-registry` to their latest
   releases, pinned exactly.
2. Regenerates `src/_data/gpu_speed.json` from GPU Ark.
3. Runs lint, unit tests, and the build.
4. Commits whatever changed (`package.json`, `package-lock.json`, and
   `src/_data/gpu_speed.json`) and pushes.

A week with no upstream change is a clean no-op: the diff gate skips both the
verification steps and the commit. The generated files carry no timestamp, so
an unchanged dataset produces a byte-identical file.

Two things to remember when debugging it:

- Pushes made with `GITHUB_TOKEN` do not trigger other workflows. The bot
  commit therefore does not run the e2e suite; the job verifies lint, tests,
  and build itself, and Cloudflare Pages still deploys the commit.
- The registry is what limits coverage. models.dev lists far more open-weight
  models than the registry ships Q4 entries for, so new models appear only
  after a registry release.

Run it manually from the Actions tab when a release lands mid-week. The local
equivalent is:

```bash
npm ci
npm install --save-dev --save-exact @opencode-ai/models@latest @auxot/model-registry@latest
npm run catalog:gpu
npm run lint && npm test && npm run build
```

## GPU bandwidth

`scripts/catalog-gpu.mjs` downloads the GPU Ark CSV and writes
`src/_data/gpu_speed.json` for every card in `gpu_database.json`.

The match is by normalized model name plus VRAM size, for example
`RTX 3060` at `12 GB`. That second key matters: NVIDIA reuses names across
memory sizes and bandwidth differs (`RTX 3060` is 360 GB/s at 12 GB, 240 GB/s
at 8 GB). Board-partner rows duplicate each card, so the script takes the most
common bandwidth for a name and memory size. Laptop, mobile, Max-Q, and
handheld rows are dropped before counting.

Two guards keep a bad dataset from reaching the page:

- A card with no match fails the job, with instructions to add an override.
- `SPOT_CHECKS` asserts a handful of known specs, so an upstream shape change
  is caught even when every card still matches.

Real-world exceptions go in `scripts/gpu-speed-overrides.json`. The Arc A770 is
the current one: the dataset's reference row says 512 GB/s, while the 16 GB card
is 560 GB/s.

Attribution is required by the CC BY 4.0 license and lives on the credits page.

## Apple silicon bandwidth

There is no machine-readable vendor source for Apple memory bandwidth, so this
table is curated. It changes only when Apple ships a chip, which is rare.

Values come from Apple's own spec pages first:

- [MacBook Pro specs](https://www.apple.com/macbook-pro/specs/)
- [Mac Studio specs](https://www.apple.com/mac-studio/specs/)

For chips Apple no longer lists, use the Wikipedia per-chip pages. llmspeed is
a useful cross-check, but its Apple figures are partly derived, so do not treat
it as the source of record.

Bandwidth varies by configuration, not just by chip, so the data is stored as
bins in `src/_data/apple_speed.json`: each chip maps to a list of
`[max unified memory GB, GB/s]`, first match wins.

| Chip           | Bin rule                | Source    |
| -------------- | ----------------------- | --------- |
| M1 to M2 Ultra | One value per chip      | Wikipedia |
| M3 Max         | 36 GB: 300, larger: 400 | Wikipedia |
| M3 Ultra       | 800                     | Wikipedia |
| M4, M4 Pro     | One value per chip      | Apple     |
| M4 Max         | 36 GB: 410, larger: 546 | Apple     |
| M5             | 16 GB: 153, larger: 170 | Apple     |
| M5 Pro         | 307                     | Apple     |
| M5 Max         | 36 GB: 460, larger: 614 | Apple     |
| M5 Ultra       | 1200                    | Apple     |

The memory configurations a chip ships with live separately in
`src/_data/apple_chips.json`, which also drives the RAM cross-check.

### Adding a chip or a configuration

1. Add the chip and its memory configurations to `apple_chips.json`.
2. Add its bandwidth bins to `apple_speed.json`.
3. Run `npm test`.

The coverage test fails when a chip in `apple_chips.json` has no bins, or when
a memory configuration falls outside every bin. There is no CI job for this
table; the test is the guard.

Two corrections landed with the first pass: `M4 Ultra` was removed because
Apple never shipped it (the Mac Studio paired M4 Max with M3 Ultra), and
`M5 Ultra` was added with 96, 256, and 512 GB configurations at 1.2 TB/s.

## Enrichment

`src/_data/enrichment.json` adds what the packages do not carry: an Ollama tag
and a one-line blurb, keyed by model name. About twenty models have entries.
Everything else falls back to a slug for the Ollama command and no blurb.
