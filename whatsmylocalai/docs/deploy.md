# Deploy

Production is served at **https://whatsmylocal.ai** from Cloudflare Pages.

## Project

The project is declared in Terraform in the bottega repo
(`infrastructure/spacelift-stacks/core/website.tf`):

| Setting          | Value                          |
| ---------------- | ------------------------------ |
| Project          | `whatsmylocal-ai`              |
| Branch           | `main`                         |
| Root directory   | `whatsmylocalai`               |
| Build command    | `npm run build`                |
| Output directory | `_site`                        |
| Watched paths    | `whatsmylocalai/*`, `assets/*` |

A push touching either path triggers a build. The build runs `npm run build`,
which is Eleventy plus the asset pipeline; no network calls happen at build
time beyond installing dependencies.

## API URL

The newsletter form posts to `API_URL`, which defaults to
`https://api.matto.club`. The value is baked in at build time:

```bash
API_URL=https://hub.matto.club npm run build
```

Changing the environment variable alone does not redeploy the site. Trigger a
new production deployment after changing it, or the old URL stays in the
built HTML.

## Local preview

```bash
npm run build
node scripts/serve.mjs   # http://127.0.0.1:4173
```
