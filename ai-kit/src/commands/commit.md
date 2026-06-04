---
description: Commit the work done in this session with a structured commit message.
---

Create a commit with the following format:

## Commit Message Format

**First line (one-liner):**

- Use conventional commits format: `<type>(<scope>): <description>`
- The **scope** is the project subdirectory — determine it from the changed files.

  | Changed files             | Scope        |
  |---------------------------|--------------|
  | `fakedata/**`             | `fakedata`   |
  | `ai-kit/**`               | `ai-kit`     |
  | Mixed (multiple projects) | Pick primary |

- If changes span **multiple projects**, pick the one with the most changes, or use
  `type: description` (without scope) when there is no clear primary project.
- Root-level files (e.g. `opencode.json`, `.github/`, `AGENTS.md`) and changes
  spanning **all** projects get no scope.
- Examples: `feat(fakedata): add csv output`, `fix(ai-kit): resolve sync crash`,
  `docs: update contributing guide`

**Body (bullet list):**

- List the main changes made in this session
- Each item should be a brief description of a specific change

**Sign-off:**

- End with: `created with the help of <MODEL>`
- Format the model name as lowercase, hyphenated: `<name>-<variant>`
- Examples: `DeepSeek V4 Flash` → `deepseek-v4-flash`, `Claude Opus 4` → `claude-opus-4`

## Examples

**Single project — use scope:**

```
feat(fakedata): add csv output format

- Added --format csv flag to generate command
- Implemented CSV writer with header detection
- Added tests for CSV output

created with the help of deepseek-v4-flash
```

**Cross-project or root — no scope:**

```
ci: add shared release workflow for Go projects

- Created tools/go-release with build, archive, and formula generation
- Updated fakedata release workflow to use shared tool
- Added release documentation

created with the help of deepseek-v4-flash
```

## Process

1. First, review all changes with `git status` and `git diff`
2. If there changes you did not make, ask if you should include them
3. Determine the scope from the changed file paths
4. Write a concise one-liner following `<type>(<scope>): <description>`
5. List the key changes as bullet points
6. Add the sign-off line with the current model
7. Commit with `git commit -m "your message"`
