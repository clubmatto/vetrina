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
- "You" for the reader, especially when naming a likely assumption: "You may
  think..." beats "The conventional wisdom is...".
- Contractions are normal.
- Humor is welcome when it comes from the situation, not from forced jokes.
- Opinions are allowed. Label them as opinions.
- Voice comes from one blunt word or aside, not from adjectives. Allow one per
  section: "which arguably makes it dumber", "so to speak".

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
- Writing about the piece instead of the subject: "this post", "the thesis of
  this article", "as we will see". A short spoken signpost is fine ("Now
  let's...", "more on this in a moment"); an essay about the essay is not.
- The authors' research backstory before the reader knows why it matters.

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

- Announce the shape before the detail: "We found four differences", "There
  are two approaches". Then list them.
- Name a section after the reader's question or the action: "How much does
  spawning cost?", not "What a sub-agent costs".
- If a paragraph has three or more parallel bold lead-ins, make it a list.
  Introduce the list with one sentence that says how many items follow.

## 🎚️ Rhythm

- Paragraphs are usually one to three sentences.
- Vary sentence length. A short sentence after a long one lands.
- Write the glue you would say out loud. When the thought turns, use the
  connective you would use in speech: "Of course", "In short", "though", "in
  fact", "more on this in a moment". One per paragraph, not one per sentence.
- Parentheses and asides are allowed when they add voice. Cut them when they
  hide the point.
- Code blocks, screenshots, and quotes break up the text. Use them as evidence,
  not decoration.
- Longer pieces need signposts, not repetition. Each section should add
  something new.

## ✅ Evidence

- Use real numbers, names, quotes, and code from the work.
- Link to the source, the repo, or the previous post.
- Say what the evidence suggested, not what it proved. "The vocabulary helped
  us see" is honest; "the vocabulary agrees" is a claim the survey cannot
  support.
- When you report a finding, state the count: "We found four differences".
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
- Does every sentence have an actor, or is an abstraction doing the work?
- Does every section add something new?
- Is the caveat honest?
- Does the ending land, instead of repeating?
- Would I say this out loud?
- Would I read this to the end?

{{FOOTER}}
