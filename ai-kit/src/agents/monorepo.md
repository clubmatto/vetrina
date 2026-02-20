# Agents.md

This is a monorepo containing apps in many languages.

You MUST follow the specific rules for each language. **ALWAYS** start from
checking out README.md.

## Build Systems

- **Kotlin/Java**: Gradle (Kotlin DSL). Use `./gradlew` commands.
- **Go**: Go modules. Use `go` commands.
- **TypeScript**: (Planned) `npm`.

## How to Find the Right Rules

1. **Identify the primary language** of the file(s) you're working with.
2. **Navigate to `.ai/rules/`** and open the corresponding file:
   - TypeScript → `typescript.md`
   - Go → `go.md`
   - Kotlin → `kotlin.md`
   - etc.

CRITICAL: When you encounter a file reference (e.g., `@.ai/rules/go.md`), use the Read tool to load it on a need-to-know basis.

## Additional Guidelines

- [Plan Mode](.ai/rules/plan-mode.md)
- [When You're Unsure](.ai/rules/unsure.md)

*This file was last updated: [2026-01-27]. Always check the `.ai/rules/` directory for the most current language-specific guidelines.*
