# 🛠️ Technical Writing

Read `writing.md` first. This file adds rules for documentation and code
communication. It does not apply to marketing or narrative writing.

## 🎯 Reader And Job

The reader is trying to do something: install, configure, debug, extend, or
review. They are not a prospect. Help them finish the task.

## 🗣️ Voice

Peer to peer. Calm, precise, example-led. No selling, no motivational filler,
no jokes that slow the reader down.

Emoji are optional in a README and should match the project. Avoid them in API
reference, code comments, and changelogs.

## 📄 READMEs

A good README answers these questions in order:

1. **What is this?** One sentence.
2. **Why would I use it?** One or two sentences.
3. **How do I install it?** The command only.
4. **How do I use it?** The smallest working example.
5. **Where do I go next?** Options, reference, or license.

````markdown
# project-name

A CLI that does X.

## Install

```bash
npm install -g project-name
```

## Usage

```bash
project-name do-thing
```
````

Keep the first screen useful. The one-line description should be easy to find.

## 📚 Docs And API Reference

Write for the task, not for the code structure:

1. **What this lets you do**: one sentence.
2. **Prerequisites**: versions, accounts, files.
3. **Steps**: numbered, with exact commands.
4. **Expected result**: output, file, or state.
5. **Next step**: the next relevant page.

- Use runnable code, not pseudo-code. If an example cannot run, label it.
- Show the command and its output when the output matters.
- Warn before destructive or irreversible steps.
- Explain why before a non-obvious step.
- Do not document what the code already makes obvious.
- Link to deeper material instead of repeating it.

## 💬 Code Comments

Comment on **why**, not **what**. The code should be self-documenting for the
"what".

```typescript
// ✅ GOOD: Explains why
// Retry up to 3 times because the API is flaky under load.
const user = await retry(3, () => fetchUser(id));

// ❌ BAD: Restates the code
// Loop 3 times
for (let i = 0; i < 3; i++) {
  await fetchUser(id);
}
```

## 📝 Commit Messages

Follow conventional commits. Use the imperative mood. Keep the subject line
under 72 characters.

```
✅ GOOD:
feat(fakedata): add ClickHouse support
fix(cli): respect Ctrl+C in transactions
docs: update README with install instructions

❌ BAD:
Added ClickHouse support to FakeData Pro because users asked for it
Fixed the thing where Ctrl+C wasn't working properly
```

## 📋 Changelogs

Write for the person upgrading, not for the team that wrote the code.

- Group changes under Added, Changed, Fixed, Removed, and Security.
- Describe the user-visible effect, not the implementation.
- Link to the issue or pull request when it helps.
- Call out breaking changes first.
- Leave out internal refactors with no user-visible effect.

## 🔀 Pull Requests

A pull request description should answer:

1. **What changed?** One paragraph.
2. **Why?** The problem or the decision.
3. **How was it tested?** Commands, screenshots, or a checklist.
4. **What is the risk?** Migration, performance, or rollback notes.

## 🔗 Links

- `Read the docs: <url>` for documentation.
- `Install: <command>` for installation.
- `Full example: <url>` for a longer sample.
- Use plain URLs on their own line when the context is obvious.

## 🔍 Self-Check

- Can a new reader finish the task from this page?
- Are the commands exact and runnable?
- Did I explain why before the non-obvious step?
- Did I cut the marketing language?
- Is there one clear next step?

{{FOOTER}}
