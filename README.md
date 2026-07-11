<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/banners/x-banner.png">
    <img src="assets/banners/x-banner-light.png" alt="Club Matto" width="100%">
  </picture>
</p>

# Club Matto

[![ai-kit CI](https://github.com/clubmatto/vetrina/actions/workflows/ai-kit-ci.yml/badge.svg)](https://github.com/clubmatto/vetrina/actions/workflows/ai-kit-ci.yml)
[![fakedata CI](https://github.com/clubmatto/vetrina/actions/workflows/fakedata-ci.yml/badge.svg)](https://github.com/clubmatto/vetrina/actions/workflows/fakedata-ci.yml)
[![License: MIT](https://img.shields.io/github/license/clubmatto/vetrina)](LICENSE)

The Club Matto monorepo — open source CLI tools and projects for developers.

## Projects

| Project                | Description                                          | Language              | Install                                                                                 |
|------------------------|------------------------------------------------------|-----------------------|-----------------------------------------------------------------------------------------|
| [ai-kit](./ai-kit)     | Sync AI rules, skills, and commands into any project | TypeScript            | `npm install -g @clubmatto/ai-kit`                                                      |
| [fakedata](./fakedata) | Generate fake data rows for testing and development  | Go                    | `go install matto.club/vetrina/fakedata@latest` / `brew install clubmatto/tap/fakedata` |
| [mercato](./mercato)   | Public social media posts by the team                | Markdown              | —                                                                                       |
| [website](./website)   | Club Matto website                                   | TypeScript / Eleventy | —                                                                                       |

See individual project READMEs for detailed usage, development guides, release
processes, or content conventions.

## Development

This monorepo contains projects in multiple languages. Each project manages its
own dependencies and has its own build, test, and lint commands.

```bash
# ai-kit (TypeScript)
cd ai-kit && npm install && npm run ci

# fakedata (Go)
cd fakedata && make test

# mercato (content)
# No build step — posts are plain markdown

# website (TypeScript / Eleventy)
cd website && npm install && npm run build
```

### CI/CD

Every push and pull request runs automated checks:

| Workflow                                         | Status                                                                                           | Projects                                      |
|--------------------------------------------------|--------------------------------------------------------------------------------------------------|-----------------------------------------------|
| [ai-kit CI](.github/workflows/ai-kit-ci.yml)     | ![ai-kit CI](https://github.com/clubmatto/vetrina/actions/workflows/ai-kit-ci.yml/badge.svg)     | TypeScript lint, typecheck, test, integration |
| [fakedata CI](.github/workflows/fakedata-ci.yml) | ![fakedata CI](https://github.com/clubmatto/vetrina/actions/workflows/fakedata-ci.yml/badge.svg) | Go lint + test                                |

Releases are triggered by version tags (`ai-kit/v*.*.*`, `fakedata/v*.*.*`) and
publish to npm, GitHub Releases, and Homebrew automatically.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and
our [Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE) for details.
