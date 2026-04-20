# ai-kit

[![CI](https://github.com/clubmatto/vetrina/actions/workflows/ci.yml/badge.svg)](https://github.com/clubmatto/vetrina/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/@clubmatto/ai-kit)](https://www.npmjs.com/package/@clubmatto/ai-kit)
[![License: MIT](https://img.shields.io/npm/l/@clubmatto%2Fai-kit)](/LICENSE)

The AI configuration CLI from Club Matto. Sync rules, skills, and commands to power up your AI coding workflow.

## Features

- **Language Rules** — TypeScript, Go, Kotlin, and more
- **Skills** — Reusable AI capabilities like Playwright automation
- **Commands** — Pre-built prompts for common tasks (commit messages, PR reviews)

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
```

## What's Installed

| Location          | Description                       |
| ----------------- | --------------------------------- |
| `.agents/rules/`  | Language/framework rules          |
| `.agents/skills/` | Reusable AI capabilities          |
| `opencode.json`   | Opencode configuration (optional) |
| `AGENTS.md`       | Agent instructions                |

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

## License

MIT — see [LICENSE](/LICENSE) for details.
