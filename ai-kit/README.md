# ai-kit

Use Club Matto's AI configuration in your projects.

## Install

```bash
npm install -g @clubmatto/ai-kit
# or for local development
npm link
```

## Usage

```bash
# First-time setup
ai-kit init

# Sync installed content
ai-kit update

# Skip installing opencode.json to project root
ai-kit init --skip-opencode
ai-kit update --skip-opencode
```

## What's Installed

| Location        | Description                       |
| --------------- | --------------------------------- |
| `.ai/commands/` | Command prompts                   |
| `.ai/rules/`    | Language/framework rules          |
| `.ai/skills/`   | Reusable AI capabilities          |
| `opencode.json` | Opencode configuration (optional) |
| `AGENTS.md`     | Agent instructions                |

## Local Development

```bash
# Build the CLI
npm run build

# Link for local testing
npm link

# Test in any directory
ai-kit init
```

## Version

Alpha - Not yet published to npm.
