# ai-kit

Use Club Matto's AI configuration in your projects.

Note: the project is early in development so it's more opinionated than we might want it to be long term. Check out
the [roadmap](docs/roadmap.md) for more details

## Install

```bash
npm install -g @clubmatto/ai-kit
# or for local development
npm link
```

## Usage

```bash
# Initialize or update
ai-kit sync

# Skip installing opencode.json to project root
ai-kit sync --skip-opencode
```

## What's Installed

| Location        | Description                       |
|-----------------|-----------------------------------|
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
ai-kit sync
```

## Version

Alpha - Not yet published to npm.
