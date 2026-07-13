---
title: "ai-kit — AI configuration as code"
platform: twitter
topics:
  - ai-kit
  - open-source
  - announcement
---

We've been using ai-kit since before founding Club Matto. Two goals:

- Centralise our agentic coding config so the whole team can use it
- Learn with structured experiments as "automatic programming" evolves

ai-kit is a small CLI that sets up AI coding assistants. One command, your project gets language-specific rules, reusable skills, and custom commands.

npx @clubmatto/ai-kit sync

Detects your languages (TS, Go, Kotlin, Spring Boot), works on monorepos, smart updates — only changed files get overwritten so you can keep up with our updates.

MIT, on npm.

Docs: https://github.com/clubmatto/vetrina/blob/main/ai-kit/README.md
