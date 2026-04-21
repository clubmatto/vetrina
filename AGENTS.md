# Agents.md

This is a monorepo containing apps in many languages.

You MUST follow the specific rules for each language. **ALWAYS** start from
checking out the closest README.md.

## How to Find the Right Rules

1. **Identify the primary language** of the file(s) you're working with.
2. **Navigate to `.agents/rules/`** and open the corresponding file:
   - TypeScript → `typescript.md`
   - Go → `go.md`
   - Kotlin → `kotlin.md`
   - etc.

CRITICAL: When you encounter a file reference (e.g., `@.agents/rules/go.md`), use the Read tool to load it on a need-to-know basis.

## Additional Guidelines

- [Plan Mode](.agents/rules/plan-mode.md)
- [When You're Unsure](.agents/rules/unsure.md)

## Language-Agnostic Rules

### Code Preservation (CRITICAL)

When refactoring code, **always preserve existing comments, TODOs, and FIXME markers** - even if the surrounding code is being rewritten. Technical debt reminders represent valuable context that must not be lost.

**Never remove:**
- `// TODO ...` comments
- `// FIXME ...` comments  
- Inline comments explaining non-obvious logic
- Doc comments on public APIs

**Rationale**: LLMs tend to treat comments as noise during refactoring.

### Pre-Commit Checklist

Before committing, always verify:
1. ✅ All lint checks pass (language-specific linter)
2. ✅ All type checks pass (where applicable)
3. ✅ All tests pass
4. ✅ No comments/TODOs were accidentally removed

### Read First

**Always start by reading the project's README.md** to understand:
- Language and framework versions
- Available scripts and commands
- Project-specific conventions

### Dependency Management (General)

- Pin exact versions for production dependencies (avoid floating versions like `1.+`)
- Audit dependencies regularly for security vulnerabilities
- Minimize external dependencies - prefer stdlib/built-in solutions when available
- Upgrade systematically, test thoroughly after each update
