# Mercato

Public-facing posts authored by the team across social platforms. Stored here so
LLMs have the context they need when helping edit or draft new content.

## Directory Structure

```
mercato/
├── README.md
├── linkedin/       # LinkedIn posts
├── twitter/        # Twitter/X threads and posts
├── reddit/         # Reddit posts and comments
└── <platform>/     # future platforms
```

Each platform directory contains flat markdown files (no subdirectories per
year/month — at our volume, a flat list is more scannable).

## File Naming

```
YYYY-MM-DD-descriptive-kebab-slug.md
```

Examples: `2025-07-11-fakedata-pro-announcement.md`, `2025-07-04-club-matto-origin-story.md`

Date prefix ensures chronological sort. Slug makes each file unique and
identifiable at a glance.

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

1. Create a file at `mercato/<platform>/YYYY-MM-DD-descriptive-slug.md`
2. Add frontmatter as specified above
3. Write the body in plain markdown

For thread-based platforms (Twitter, Reddit), use markdown headings or blockquotes to separate thread parts.

## LLM Usage

When asking an LLM to help edit a specific post, provide the single file. When
asking for help with writing style or tone, pass all files filtered by platform
or topic.
