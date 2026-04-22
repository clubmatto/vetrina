# ai-kit

[![CI](https://github.com/clubmatto/vetrina/actions/workflows/ai-kit-ci.yml/badge.svg)](https://github.com/clubmatto/vetrina/actions/workflows/ai-kit-ci.yml)
[![npm version](https://img.shields.io/npm/v/@clubmatto/ai-kit)](https://www.npmjs.com/package/@clubmatto/ai-kit)
[![License: MIT](https://img.shields.io/npm/l/@clubmatto%2Fai-kit)](/LICENSE)

The AI configuration CLI from Club Matto. Sync rules, skills, and commands to
power up your AI coding workflow.

## Features

- **Language Rules** — TypeScript, Go, Kotlin, and more
- **Skills** — Reusable AI capabilities like Playwright automation
- **Commands** — Pre-built prompts for common tasks (commit messages, PR
  reviews)

## Quick Start

```bash
# Install globally
npm install -g @clubmatto/ai-kit

# Sync AI configuration to your project
ai-kit sync
```

## Usage

```bash
# Initialize or update AI configuration
ai-kit sync

# Skip installing opencode.json to project root
ai-kit sync --skip-opencode

# Language detection & filtering
ai-kit sync --all-rules              # Install all language rules
ai-kit sync --languages=go,kotlin    # Install specific language rules
ai-kit sync --monorepo               # Force monorepo AGENTS.md template
ai-kit sync --single-repo            # Force single-repo AGENTS.md template
```

The CLI automatically detects project languages and installs only relevant
rules:

- **TypeScript/JavaScript**: `package.json` or `.ts`/`.js` files
- **Go**: `go.mod` or `.go` files
- **Kotlin**: `build.gradle`, `build.gradle.kts`, `pom.xml` or `.kt` files
- **Spring Boot**: `application.properties`/`.yml` + Kotlin/Java files

Multiple languages → monorepo mode (all rules + monorepo AGENTS.md).
Single language → single-repo mode (language-specific AGENTS.md).

## What's Installed

| Location          | Description                               |
| ----------------- | ----------------------------------------- |
| `.agents/rules/`  | Language/framework rules (auto-detected)  |
| `.agents/skills/` | Reusable AI capabilities                  |
| `opencode.json`   | Opencode configuration (optional)         |
| `AGENTS.md`       | Agent instructions (monorepo/single-repo) |

## Commands

| Command       | Description                        |
| ------------- | ---------------------------------- |
| `ai-kit sync` | Initialize or update configuration |

## Local Development

```bash
# Build the CLI
npm run build

# Link for local testing
npm link

# Test in any directory
ai-kit sync
```

## Release

```bash
# Create git tag with prefix (triggers automated release)
git tag ai-kit/v<version>
git push origin ai-kit/v<version>
```

## License

MIT — see [LICENSE](/LICENSE) for details.
