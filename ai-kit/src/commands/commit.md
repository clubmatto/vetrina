---
description: Commit the work done in this session with a structured commit message.
---

Create a commit with the following format:

## Commit Message Format

**First line (one-liner):**

- Use conventional commits format: `<type>: <description>`
- Examples: `feat: add init command`, `fix: resolve path issue`, `docs: update README`

**Body (bullet list):**

- List the main changes made in this session
- Each item should be a brief description of a specific change

**Sign-off:**

- End with: `created with the help of <MODEL>`
- Use the current model name (e.g., "MiniMax", "GPT-4", "Claude")

## Example

```
feat: add init and update commands

- Created init command for first-time setup
- Added manifest tracking in .ai/.ai-kit
- Implemented update command for version sync
- Added --skip-opencode option

created with the help of MiniMax
```

## Process

1. First, review all changes with `git status` and `git diff`
2. Write a concise one-liner following conventional commits
3. List the key changes as bullet points
4. Add the sign-off line with the current model
5. Commit with `git commit -m "your message"`
