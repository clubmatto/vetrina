# 📝 Editorial Writing

Read `writing.md` first. This file adds rules for blog posts, essays, series,
reviews, and other writing where the reader chose to spend time with you.

## 🎯 Reader And Job

The reader is not looking for a task. They are deciding whether this is worth
their attention. Give them a reason in the first sentence, then keep earning
it.

## 🗣️ Voice

Curious, first-person plural, candid, occasionally funny. Write like a person
who did the work and is telling you what they found. Not a docs persona, not a
brand account.

- "We" for the work and the team. "I" for a personal story.
- Contractions are normal.
- Humor is welcome when it comes from the situation, not from forced jokes.
- Opinions are allowed. Label them as opinions.

## 🪝 Openings

Start with one of these:

- A scene: "A few weeks ago, something a bit silly started annoying us."
- A claim: "Most agent frameworks are a loop with a for-loop inside."
- A number: "A month of coding-agent work on DeepSeek cost us $41.58."
- A question the reader has actually asked.

Avoid:

- "In this post, we will explore..."
- "In today's fast-moving world..."
- A dictionary definition.
- A long apology for writing the post.

The first sentence should make the second sentence necessary.

## 🧱 Structure

Think in beats, not in a report template:

1. **Hook**: the scene, claim, or number.
2. **Stakes**: why this matters now.
3. **Development**: the evidence, examples, code, and decisions.
4. **Turn**: what surprised you, what changed, or what you got wrong.
5. **Landing**: the takeaway.

Use headings to mark beats. A series post can open with continuity ("In the
first post of this series...") but do not spend a paragraph summarising what
the reader can read elsewhere.

## 🎚️ Rhythm

- Paragraphs are usually one to three sentences.
- Vary sentence length. A short sentence after a long one lands.
- Parentheses and asides are allowed when they add voice. Cut them when they
  hide the point.
- Code blocks, screenshots, and quotes break up the text. Use them as evidence,
  not decoration.
- Longer pieces need signposts, not repetition. Each section should add
  something new.

## ✅ Evidence

- Use real numbers, names, quotes, and code from the work.
- Link to the source, the repo, or the previous post.
- Say when something is an estimate, a guess, or a small sample.
- Include the caveat. "This worked for us" is stronger than "this always
  works".
- If the piece is technical, follow `writing-technical.md` for code comments,
  commands, and code blocks.

## ⭐ Reviews

For a book, tool, or product review, separate praise from criticism with bold
labels:

```markdown
**The good:**

- First three chapters are solid
- Great introduction for beginners

**The not-so-good:**

- Writing quality drops after chapter 4
- Felt too long
```

Then give a verdict: a score, a recommendation, or the person who should read
it.

## 🎬 Endings

Land the point. Do not summarise the post you just wrote.

- End on the takeaway, the open question, or the next experiment.
- A call to action is optional. Use one when the post announces something.
- Link to the related work once. Do not stack links.

## 🧪 Examples

```markdown
<!-- ✅ GOOD: scene, concrete, voice -->

A few weeks ago, something a bit silly started annoying us: a docs-only
change still ran the full 7m41s CI build.

<!-- ❌ BAD: throat-clearing -->

In this blog post, we will explore the fascinating world of CI optimization and
why it matters for modern engineering teams.
```

```markdown
<!-- ✅ GOOD: claim and evidence -->

Most "agent frameworks" are a loop with a for-loop inside. We read ten
open-source coding agents and found the same few-dozen-line loop behind every
framework.

<!-- ❌ BAD: generic assertion -->

Agent frameworks are an important part of the modern AI landscape.
```

## 🔍 Self-Check

- Does the first sentence make the second one necessary?
- Is there a person, a scene, or a number?
- Does every section add something new?
- Is the caveat honest?
- Does the ending land, instead of repeating?
- Would I read this to the end?

Last updated: 2026-11-09. This file extends the global rules in @AGENTS.md. Always check both files.
