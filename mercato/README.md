# Mercato

Public-facing posts authored by the team across social platforms. Stored here so
LLMs have the context they need when helping edit or draft new content.

## Directory Structure

```
mercato/
├── README.md
├── drafts/         # In-progress / unpublished drafts
├── linkedin/       # LinkedIn posts
├── twitter/        # Twitter/X threads and posts
├── producthunt/    # Product Hunt launch listings
├── reddit/         # Reddit posts and comments
└── <platform>/     # future platforms
```

Each platform directory contains flat markdown files (no subdirectories per
year/month — at our volume, a flat list is more scannable).

## File Naming

### Published posts

```
YYYY-MM-DD-descriptive-kebab-slug.md
```

Examples: `2026-07-07-fakedata-pro-announcement.md`, `2026-07-04-club-matto-origin-story.md`

Date prefix ensures chronological sort. Slug makes each file unique and
identifiable at a glance.

### Drafts

Drafts live in `drafts/` and use the same kebab-slug convention **without** the
date prefix:

```
descriptive-kebab-slug.md
```

Example: `fakedata-v0-1-0.md`

Drafts follow the same frontmatter schema as published posts, but the `platform`
field indicates the intended platform.

When the same content targets multiple platforms, suffix the secondary platform
name to the slug:

- `fakedata-pro-dry-run.md`          (primary — usually LinkedIn)
- `fakedata-pro-dry-run-twitter.md`  (Twitter version)

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
---
```

Use `topics` to tag projects, products, themes. This is the primary mechanism
for cross-platform search (e.g. `grep "fakedata-pro" mercato/**/*.md`).

## Searching / Filtering

| Query | Command |
|---|---|
| All posts about a topic | `grep "fakedata-pro" mercato/**/*.md` |
| All LinkedIn posts | `grep "platform: linkedin" mercato/**/*.md` |
| Recent posts (last 10) | `ls -t mercato/linkedin/ \| head -10` |

## Adding a New Post

### Draft-first (recommended)
1. Create the file in `drafts/` with a descriptive kebab slug (no date prefix)
2. Set `platform` in frontmatter to the target platform
3. When ready to publish, move to `mercato/<platform>/YYYY-MM-DD-<slug>.md`

### Direct publish
1. Create the file at `mercato/<platform>/YYYY-MM-DD-descriptive-slug.md`
2. Add frontmatter as specified above
3. Write the body in plain markdown

For thread-based platforms (Twitter, Reddit), use markdown headings or blockquotes
to separate thread parts.

### Twitter Posts

- Body (excluding frontmatter) must be **240 characters or fewer**
- If a terminal GIF is attached, omit the command from the tweet text — the GIF
  demonstrates it
- Keep the same core message as the LinkedIn version, but condense to essentials

## Style

Keep posts short. The goal is a teaser, not a summary: announce the topic,
say why it matters in a line or two, link out.

- **Open with a one-line announcement** — an emoji framing like 📢 or 🚀 is
  on-brand.
- **One hook line** naming the topic in everyday words, then 2-4 sentences max.
- **Mention the topic, not the innards.** Omit specific numbers, timings, or
  implementation details unless they _are_ the point of the post.
- **Close with the link**: `Read it here: <url>` (LinkedIn), or just the URL
  (Twitter).
- **Conversational, fewest words.** No marketing adjectives, no "we thought
  we'd" padding.
- **Twitter is LinkedIn trimmed**: same announcement and hook, cut to
  essentials, comfortably under 240 characters.

### Example style anchors

When editing a post, start from a real example from the same platform rather
than rewriting from scratch:

- LinkedIn: `linkedin/2026-07-13-ai-kit-announcement.md`,
  `linkedin/2026-07-31-fakedata-v0-2-0-clickhouse.md`
- Twitter: `twitter/2026-07-23-pro-custom-columns.md`

## Media Assets

Posts can include terminal recordings produced with
[VHS](https://github.com/charmbracelet/vhs).

For social clips (LinkedIn, Twitter), record a one-off GIF — do **not** add the
demo to the project's `gifs.txt` or generate MP4s. Project demos serve the
website and READMEs; social clips are throwaway.

1. Create a self-contained tape at `assets/vhs/<clip>.tape` with all settings
   embedded (see One-Off Recordings in `assets/vhs/README.md`), outputting
   `<clip>-light.gif` in the light theme.
2. Keep it short, roughly half of a project demo: ~10 seconds.
3. Generate it with an absolute path:
   `./generate.sh --tape /Users/.../assets/vhs/<clip>.tape`
4. Reference the resulting GIF in the post.

See `assets/vhs/README.md` for the full VHS workflow.

## LLM Usage

When asking an LLM to help edit a specific post, provide the single file. When
asking for help with writing style or tone, pass all files filtered by platform
or topic.

Regardless of the task, pass at least one example post from the target platform
alongside the request — the style is learned by example, not description.
State the target length explicitly (LinkedIn ≈ 55-90 words, Twitter ≤ 200
characters).
