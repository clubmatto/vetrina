# Mercato

Public-facing posts authored by the team across social platforms. Stored here so LLMs have
the context they need when helping edit or draft new content.

Everything in this directory is public, **drafts included**. A draft is content we are happy
for anyone to read before it goes out, so nothing here needs to be kept private.

`drafts/` corresponds to the `editing` column on the Marketing board in Lasagna. A post
gets a file there when work starts on it, and the file moves to
`<platform>/YYYY-MM-DD-<slug>.md` when it publishes. **An empty `drafts/` is a normal
state**, not a backlog problem. It just means nothing is in flight.

## Directory Structure

```
mercato/
├── README.md
├── drafts/         # In-progress drafts (legitimately empty sometimes)
├── linkedin/       # LinkedIn posts
├── twitter/        # Twitter/X threads and posts
├── producthunt/    # Product Hunt launch listings
├── reddit/         # Reddit posts and comments
└── <platform>/     # future platforms
```

Each platform directory contains flat markdown files, with no subdirectories per year or
month. At our volume a flat list is more scannable.

## File Naming

### Published posts

```
YYYY-MM-DD-descriptive-kebab-slug.md
```

Examples: `2026-07-07-fakedata-pro-announcement.md`,
`2026-07-04-club-matto-origin-story.md`

The date prefix keeps the list chronological. The slug makes each file identifiable at a
glance.

### Drafts

Drafts live in `drafts/` and use the same kebab-slug convention **without** the date
prefix:

```
descriptive-kebab-slug.md
```

Drafts follow the same frontmatter schema as published posts. The `platform` field
indicates the intended platform.

When the same content targets multiple platforms, suffix the secondary platform to the
slug:

- `fakedata-pro-dry-run.md` (primary, usually LinkedIn)
- `fakedata-pro-dry-run-twitter.md` (Twitter version)

## Frontmatter Schema

Every file must start with YAML frontmatter:

```yaml
---
title: "Post title as it appears on the platform"
platform: linkedin
topics:
  - fakedata
  - fakedata-pro
  - announcement
format: we-measured
source: https://matto.club/writing/tuning-slow-postgres-queries-with-fakedata-pro/
---
```

Use `topics` to tag projects, products and themes. This is the primary mechanism for
cross-platform search, for example `grep "fakedata-pro" mercato/**/*.md`.

`format` is the slot the post fills and `source` is where it came from. Together they
answer which kind of post earns attention:

| `format` | Meaning |
|---|---|
| `article` | The long-form post itself |
| `shipped` | One thing that changed in a repo |
| `from-the-series` | One idea lifted out of a long-form article |
| `we-measured` | A number and what it means |
| `how-we-work` | Process or an anonymized client pattern |
| `take` | A principle or opinion |
| `reshare` | Evergreen, community, book review |

`source` points at the article, PR or card the post came from. Use the article URL for a
harvest, or a `https://github.com/clubmatto/...` link for a code-derived post.

## Searching and Filtering

| Query | Command |
|---|---|
| All posts about a topic | `grep "fakedata-pro" mercato/**/*.md` |
| All LinkedIn posts | `grep "platform: linkedin" mercato/**/*.md` |
| Recent posts (last 10) | `ls -t mercato/linkedin/ \| head -10` |

## Adding a New Post

### Draft-first, recommended

1. Create the file in `drafts/` with a descriptive kebab slug and no date prefix.
2. Set `platform` in the frontmatter to the target platform.
3. When it publishes, move it to `mercato/<platform>/YYYY-MM-DD-<slug>.md`.

Moving the card on the Marketing board is part of the same step.

### Direct publish

1. Create the file at `mercato/<platform>/YYYY-MM-DD-descriptive-slug.md`.
2. Add the frontmatter described above.
3. Write the body in plain markdown.

For thread-based platforms such as Twitter and Reddit, use markdown headings or blockquotes
to separate thread parts.

## Platform Rules

Voice, tone, punctuation and structure come from the Writing & Docs rule that ai-kit
installs at `.agents/rules/writing.md`. Follow it, and do not restate it here.

These are the mercato specifics:

- **LinkedIn: 55 to 90 words.** Close with `Read it here: <url>`.
- **Twitter: 280 characters at most, aim for 200.** Close with the bare URL.
- **Twitter is LinkedIn trimmed.** Same announcement and hook, cut to essentials.
- **Mention the topic, not the innards.** Leave out numbers, timings and implementation
  details unless they are the point of the post.
- **If a terminal GIF is attached, omit the command from the text.** The GIF shows it.

### Example style anchors

When editing a post, start from a real example from the same platform instead of rewriting
from scratch:

- LinkedIn: `linkedin/2026-07-13-ai-kit-announcement.md`,
  `linkedin/2026-07-31-fakedata-v0-2-0-clickhouse.md`
- Twitter: `twitter/2026-07-23-pro-custom-columns.md`

## Media Assets

Posts can include terminal recordings produced with
[VHS](https://github.com/charmbracelet/vhs).

For social clips, record a one-off GIF. Do **not** add the demo to the project's `gifs.txt`
or generate MP4s. Project demos serve the website and READMEs, while social clips are
throwaway.

1. Create a self-contained tape at `assets/vhs/<clip>.tape` with all settings embedded. See
   One-Off Recordings in `assets/vhs/README.md`.
2. Keep it short, roughly half of a project demo, so about 10 seconds.
3. Generate it with an absolute path: `./generate.sh --tape /Users/.../assets/vhs/<clip>.tape`
4. Reference the resulting GIF in the post.

See `assets/vhs/README.md` for the full VHS workflow.

## LLM Usage

When asking an LLM to edit a specific post, provide that single file. When asking for help
with style or tone, pass all files filtered by platform or topic.

Always pass at least one example post from the target platform alongside the request. The
style is learned by example, not description. State the target length explicitly.
