# whatsmylocal.ai v2 plan

Status: active. Workstreams 0 to 4 are shipped. Workstream 5 is implemented
and waiting to ship. Workstreams 6 and 7 and the final accessibility pass are
still open. Last updated: 2026-11-13.

The Product board is the source of truth. This file mirrors the plan on the
`whatsmylocal.ai v2 roadmap` card (`97ebf5bb-5778-435c-9a24-faeeb20ac03b`).
If they disagree, the board wins.

## Goal

v1 answers "does this fit?" v2 answers the next questions: how far off you
are, how fast it runs, what it costs, and on which engine. The order is
fit -> speed -> cost.

## Decisions

- **MLX is an engine, not a runner.** Ollama and LM Studio stay the two
  runners. Both ship MLX engines on Apple Silicon, so the site adds a
  conditional note, not a third toggle.
- **Speed is estimated, not measured.** Use the llmspeed bandwidth model, show
  a range, and label it as an estimate.
- **The catalog refresh is a dedicated workflow.** It bumps the two data
  packages, runs lint/test/build, commits the lockfile, and lets Cloudflare
  Pages deploy.
- **The parked items stay parked.** Side-by-side comparison and notify-me are
  not in v2.
- **The options live in tabs.** Fits and out of reach are two panels under
  Other options, so the primary result keeps the space it earns.
- **e2e tests cover behaviour, not audits.** They assert user-visible
  outcomes: a pick that fits, a command that changes, a share link that
  replays, a gap that shrinks up the list.

## Workstreams

### 0. Guardrails

- [x] Add `npm test` using `tsx --test`.
- [x] Test the pure modules: detection, model sorting and filtering, ranking.
- [x] Add tests for fit gap.
- [ ] Add tests for speed and cost as those modules land.
- [x] Add `.github/workflows/whatsmylocalai-ci.yml` with lint, test, build, and
      the e2e suite.
- [x] Add data sanity tests: model count, unique names, positive sizes.
- [x] Document the test command in `README.md`.

Done when CI is green and the weekly catalog job can rely on it.

### 1. Fit gap

- [x] Add `shortfall` and `beyondModels` to `src/assets/js/models.ts`.
- [x] Add the `beyondModels`, `visibleBeyond`, and `closestBeyond` getters to
      `src/assets/js/app.ts`, plus the `showBeyond` state.
- [x] Add "How far off you are" in the Out of reach panel of
      `src/index.liquid`. Show the closest six, with a show-all toggle.
- [x] Use the closest three in the no-fit empty state.
- [x] Add the gap chip and list styles to `src/assets/css/models.css`.
- [x] Test shortfall, ordering, the exact-fit boundary, and the no-fit case.

Done when every non-fitting model can show `~X GB short`, the values update
with the simulator, and the section is keyboard accessible.

### 2. UI review and guardrails

Findings from the built page at 320 to 1440 px, in both themes. What holds:
no horizontal overflow, AA contrast on the key text pairs, clean landmarks.
What did not: the out-of-reach models competed with the primary list, two
identical show-all buttons sat in one section, model names were not headings,
result changes were silent for screen readers, and the email modal leaked
focus.

- [x] Put out-of-reach models behind tabs: "Fits" and "Out of reach".
- [x] Render out-of-reach models as compact rows instead of cards.
- [x] Make model names headings so heading navigation reaches them.
- [x] Announce result changes with a polite live region.
- [x] Trap focus in the email modal and return it to the trigger on close.
- [x] Raise interactive targets to at least 24 px.
- [x] Align ARIA on both show-all toggles.
- [x] Add a functional e2e suite: recommendation, runner, share, gap, signup.
- [x] Review the speed layout: the band becomes a stat, with a simulated
      terminal beside the card on desktop and stacked on mobile.
- [ ] Review the cost and setups layouts before building them.

Done when the e2e suite runs in CI and covers every flow above.

The audit checks that came out of the review (contrast, targets, ids) are not
a CI gate. They were one-off findings and belong in the final accessibility
pass, not in a test that pretends to prove the product works.

### 3. Weekly catalog rebuild

- [x] Add `.github/workflows/whatsmylocalai-catalog.yml` with a weekly schedule
      and `workflow_dispatch`.
- [x] Install the latest `@opencode-ai/models` and `@auxot/model-registry`.
- [x] Run lint, test, and build. Fail before committing on error.
- [x] Commit `package.json` and `package-lock.json` when they change, then push.
- [x] Verify the Cloudflare Pages project watches `whatsmylocalai/*`.
- [x] Confirm a real run pushes the commit, or exits as a clean no-op.
- [x] Show the catalog source dates on the page.

Both paths are verified. A push-triggered run took `@opencode-ai/models` from
0.0.133 to 0.0.134 and pushed `chore(whatsmylocalai): refresh the model
catalog`. A manual dispatch on the latest version skipped verification and the
commit: a clean no-op. The temporary push trigger is gone, leaving the Monday
schedule and `workflow_dispatch`.

The registry is already on its latest release, 1.1.4, and it is what limits the
model list: models.dev has 320 open-weight entries, the registry 93 Q4 ones. See
the coverage question in the plan's open questions.

Done when a manual run either produces a commit or a clean no-op, and Pages
deploys the result.

### 4. MLX engine note

- [x] Keep `Runner = "lmstudio" | "ollama"`.
- [x] Add a conditional note under the runner hint when `vendor === "apple"`:
      both runners ship MLX engines, and the commands on the page use GGUF.
- [x] Make the note actionable: `lms get --mlx` for LM Studio, `-mlx` tags for
      Ollama. The hint follows the runner toggle.
- [x] Add the note markup and style it in `models.css`.
- [x] Update `src/llms.txt.liquid` to mention the MLX engines.
- [x] Do not add `mlx.json`, a third command, or an MLX catalog.
- [x] Test it: Apple Silicon shows the note, other hardware does not.

Done when Apple users see the note, non-Apple users do not, and the wording
does not claim the GGUF command uses MLX.

### 5. Speed estimate

- [x] Add `src/_data/gpu_speed.json` with bandwidth for every GPU in
      `gpu_database.json`. Backend comes from the vendor at runtime.
- [x] Generate it in the weekly job from
      [GPU Ark](https://huggingface.co/datasets/Intelion/gpuark-gpu-dataset)
      (CC BY 4.0), like the package bumps: regenerate, verify, commit.
- [x] Add `src/_data/apple_speed.json` with per-chip bandwidth bins for every
      chip in `apple_chips.json`, curated from Apple's spec pages.
- [x] Add `src/_data/model_speed.json` with active parameters for sparse
      models whose name does not encode them.
- [x] Add `src/assets/js/speed.ts` with the bandwidth model, coefficients, and
      the band.
- [x] Show a `~A-B tok/s` chip on the best pick and model cards, including
      tight fits.
- [x] Label the estimate as GGUF; tooltip: "GGUF via llama.cpp or Metal, MLX
      builds can differ."
- [x] Add llmspeed credits.
- [x] Test the estimator: known values, monotonicity, sparse versus dense, and
      unknown hardware.
- [x] Promote the band to a stat and add the simulated terminal (autoplay once,
      replay, reduced-motion aware, stacked on mobile).
- [x] Skip llmspeed's measured combos: too few model and hardware matches to
      matter.

The GPU table is generated, not hand-entered: `scripts/catalog-gpu.mjs`
downloads GPU Ark, matches each card by name and VRAM, drops laptop rows, and
fails the job when a card has no bandwidth or a spot check drifts. Overrides
live in `scripts/gpu-speed-overrides.json`.

Apple silicon has no data in GPU Ark, so its table is curated from Apple's spec
pages (Wikipedia for chips Apple no longer lists). Bandwidth is stored as
`[max memory GB, GB/s]` bins because it varies by configuration, for example
M5 at 153 GB/s with 16 GB and 170 GB/s with 24 or 32 GB. The first pass also
added M5 Ultra at 1.2 TB/s and removed M4 Ultra, which Apple never shipped. The
update procedure is in [catalog.md](catalog.md#apple-silicon-bandwidth).

Done when the badge updates with GPU and RAM changes, no network calls happen
at runtime, and the estimate is labelled honestly.

### 6. Cost calculator

- [ ] Add three cloud price presets from models.dev: budget, mid, frontier.
- [ ] Add `src/assets/js/cost.ts` with the local and cloud formulas.
- [ ] Add the calculator section with usage, watts, electricity price,
      hardware cost, hardware life, and cloud preset inputs.
- [ ] Show local cost per month, cloud cost per month, cost per million
      tokens, and break-even months.
- [ ] Keep the assumptions visible.
- [ ] Test the formulas and the empty and zero cases.

Done when the calculator updates live, works on mobile, and does not imply
more precision than the inputs allow.

### 7. Recommended setups

- [ ] Decide between a `/setups/` page and an in-page tab. The current
      recommendation is a separate page.
- [ ] Add `src/_data/setups.json` with four rigs: specs, price, vendor link,
      and `last_checked`.
- [ ] Compute the best model and speed for each rig at build time.
- [ ] Keep vendor outreach as a separate board todo. Use public links until
      there are deals.
- [ ] Update `src/sitemap.xml.liquid` and `src/llms.txt.liquid`.

Done when each rig shows what it runs, links to the vendor, and shows when the
data was last checked.

### 8. Parked

- [ ] Side-by-side rig comparison: refactor the machine state into a factory,
      run two instances, and share both through the URL.
- [ ] Notify-me-when-it-fits: needs hub schema, API, and an email template.
      No code until the hub work is scoped.

### 9. Docs

- [x] Rewrite the README as a short product page that links into `docs/`.
- [x] Move detection, ranking, and sharing to `docs/how-it-works.md`.
- [x] Move sourcing and refresh to `docs/catalog.md`, including the manual
      Apple bandwidth update.
- [x] Move commands, tests, CI, and asset regeneration to
      `docs/development.md`, and deployment to `docs/deploy.md`.
- [x] Move the demo GIFs to `docs/assets/` and update the demo script.

## Board changes

- Rewrite the MLX todo on the Product card from "third runtime" to "Apple
  Silicon engine note."
- Add a comment to the Product card with the engine decision and links to the
  Ollama and LM Studio MLX announcements.
- Retitle and rewrite Marketing card `7e3b12a9` from "a third runtime" to
  "MLX is already inside your runner." Keep its Nov 19 due date.
- Keep the fit gap and catalog items as they are.

## Open questions

1. Marketing: approve the new title and angle? Recommendation: yes.
2. Speed: is the GGUF label and caveat enough, or do we need separate MLX
   numbers? Recommendation: GGUF only.
3. Model coverage: models.dev lists 320 open-weight models, the registry ships
   93 Q4 ones. Scope the "never stale" claim, ask Auxot to refresh, or vendor
   and extend the registry?
4. Parked: do the two parked items stay parked?
5. Later, before workstreams 6 and 7: does the cost calculator include hardware
   amortization? Is setups a page or a tab, and which vendors?

Board dates: the catalog post is due Mon 2026-11-16 and the MLX post Thu
2026-11-19.

## Final pass

Accessibility is deferred, not dropped. Do this before calling v2 done.

- [ ] Contrast and target-size pass in both themes.
- [ ] Keyboard walkthrough of the machine panel, both option tabs, and the
      email modal.
- [ ] Re-check the ARIA on tabs, toggles, and the live region.

## References

- [llmspeed](https://llmspeed.dev/) and the
  [llmspeed source](https://github.com/nicorobinreal/llmspeed), MIT licensed.
- [Ollama MLX preview](https://ollama.com/blog/mlx) and
  [MLX performance update](https://ollama.com/blog/mlx-performance).
- [LM Studio unified MLX engine](https://lmstudio.ai/blog/unified-mlx-engine)
  and the [`lms get` docs](https://lmstudio.ai/docs/cli/local-models/get).
- [mlx-lm](https://github.com/ml-explore/mlx-lm).
- [models.dev](https://models.dev).
