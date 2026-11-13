# Development

Node 22 or newer, npm, and a Chromium install for the e2e suite.

## Commands

| Command                  | Description                                          |
| ------------------------ | ---------------------------------------------------- |
| `npm install`            | Install dependencies                                 |
| `npm run dev`            | Dev server with live reload at http://localhost:8080 |
| `npm run build`          | Production build in `_site/`                         |
| `npm run clean`          | Remove `_site/`                                      |
| `npm run lint`           | Typecheck and Prettier check                         |
| `npm test`               | Unit tests with Node's test runner                   |
| `npm run e2e`            | Browser flows against `_site/`, after a build        |
| `npm run catalog:gpu`    | Regenerate the GPU bandwidth table from GPU Ark      |
| `npm run prettier:write` | Format everything                                    |

`npm run e2e` starts `scripts/serve.mjs` through Playwright's `webServer`, so
there is no second terminal. Run `npm run build` first, or the suite serves a
stale `_site`.

## Layout

```
whatsmylocalai/
├── src/
│   ├── index.liquid            # the page
│   ├── credits.liquid          # credits and attributions
│   ├── robots.txt.liquid
│   ├── sitemap.xml.liquid
│   ├── llms.txt.liquid
│   ├── _includes/              # head, header, footer
│   ├── _lib/                   # merge, data tests
│   ├── _data/                  # models, GPU, Apple, enrichment
│   └── assets/
│       ├── css/                # page modules plus the shared design system
│       ├── js/                 # Alpine component, detection, model logic
│       └── og.png              # social card
├── e2e/                        # Playwright specs
├── scripts/                    # build, catalog, demo, social card, serve
├── docs/                       # these docs and the demo GIFs
├── _site/                      # built output
├── playwright.config.ts
└── eleventy.config.ts
```

## Build

`scripts/build.ts` runs on `eleventy.before` and on watch changes. PostCSS
resolves the `@import` graph, including the shared design system in
`../assets/css/design-system/`, then esbuild bundles and minifies. Production
files are content-hashed and mapped through `_site/assets/manifest.json`, which
the `asset` Liquid filter resolves.

`app.ts` imports `suggestModelsForVRAM` from `@auxot/model-registry`. esbuild
aliases the package to its browser-safe query module at bundle time, because
the package index re-exports Node-only code.

## Tests

Unit tests use `node:test` through `tsx` and sit next to the code.

- `src/assets/js/*.test.ts`: detection, ranking, filtering, the fit gap.
- `src/_lib/models-merge.test.ts`: catalog shape, uniqueness, Q4 only.
- `src/_lib/gpu-speed.test.ts`: every GPU covered, plausible values, known
  specs.
- `src/_lib/apple-speed.test.ts`: every chip covered, bins reach every memory
  configuration, known specs.

The e2e suite is behaviour, not markup. It covers a recommendation that fits
the budget, a VRAM change that moves the pick, the out-of-reach ordering, the
runner toggle and clipboard, the share round trip, the MLX note, and the email
form success and failure.

## CI

| Workflow                     | Runs                                                       | Does                                                    |
| ---------------------------- | ---------------------------------------------------------- | ------------------------------------------------------- |
| `whatsmylocalai-ci.yml`      | Push and pull request under `whatsmylocalai/` or `assets/` | Lint, unit tests, build, e2e                            |
| `whatsmylocalai-catalog.yml` | Mondays 04:00 UTC and on demand                            | Refreshes the catalog and hardware tables, then commits |

The catalog job is described in [catalog.md](catalog.md). CI installs Chromium
before the e2e step.

## Demo GIF and social card

Both need a build first and Playwright browsers installed.

```bash
npm run build
node scripts/demo.mjs      # docs/assets/demo-light.gif and demo-dark.gif
node scripts/og-image.mjs  # src/assets/og.png
```

The demo script also needs ffmpeg to turn the recording into a GIF.
