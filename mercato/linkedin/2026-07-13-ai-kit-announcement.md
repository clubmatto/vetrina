---
title: "ai-kit — AI configuration as code"
platform: linkedin
topics:
  - ai-kit
  - open-source
  - announcement
---

We've been using ai-kit since before even founding Club Matto. The goal of 
this project is two-fold: 

- We wanted to centralise our own agentic coding configuration so the whole 
  team could use it
- As we're at early stages of "automatic programming", there's a lot to 
  learn and we like to learn with structured experiments.

This is how ai-kit was born.

ai-kit is a small CLI that sets up AI coding assistants for any project. One 
command, and your project gets language-specific rules, reusable skills, and 
custom commands!

It detects your project's languages and frameworks (currently we support: 
TypeScript, Go, Kotlin, Spring Boot), installs the relevant rules, and wires 
everything together. It works on monorepos as well and supports smart updates: 
only changed files get overwritten, so your customizations stick and you can 
keep up with our updates.

MIT licensed, available on npm.

Docs for the 🤓: https://github.com/clubmatto/vetrina/blob/main/ai-kit/README.md
