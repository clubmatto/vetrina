---
title: "ai-kit — AI configuration as code"
platform: linkedin
topics:
  - ai-kit
  - open-source
  - announcement
---

We've been quiet about this one, but it's been part of our daily workflow for a while.

ai-kit is a CLI that sets up AI coding assistants for any project. One command, and your project gets language-specific rules, reusable skills, and custom commands — all versioned alongside your code.

```bash
npx @clubmatto/ai-kit sync
```

It detects your project's languages (TypeScript, Go, Kotlin, Spring Boot), installs the right rules, and wires everything together. Works for monorepos too. Supports smart updates — only changed files get overwritten, so your customizations stick.

MIT licensed, available on npm.

Docs: https://github.com/clubmatto/vetrina/blob/main/ai-kit/README.md

P.S. The GIF in the README was recorded with VHS (https://github.com/charmbracelet/vhs) — more on our terminal demo pipeline soon.
