# Mercato

Public-facing posts authored by the team across social platforms. Stored here so LLMs have
the context they need when helping edit or draft new content.

Everything in this directory is public, **drafts included**. A draft is content we are happy
for anyone to read before it goes out, so nothing here needs to be kept private.

`drafts/` corresponds to the `editing` column on the Marketing board in Lasagna. A post
gets a file there when work starts on it, and the file moves to
`posts/YYYY-MM-DD-<slug>.md` when it publishes — same file, same slug, date prefix
added. **An empty `drafts/` is a normal state**, not a backlog problem. It just means
nothing is in flight.

## Directory Structure

```
mercato/
├── README.md
├── drafts/         # In-progress drafts (legitimately empty sometimes)
├── posts/          # Published record: one file per post
└── docs/           # Style guide and helpers
```

Both directories hold flat markdown files, one file per post, with no subdirectories
per year, month, or platform. At our volume a flat list is more scannable. The
platforms a post ran on live in its frontmatter and its `## <Platform>` sections, not
in the directory tree — drafts and published posts have the exact same shape.

## File Naming

### Published posts

```
YYYY-MM-DD-descriptive-kebab-slug.md
```

Examples: `posts/2026-07-07-fakedata-pro-announcement.md`,
`posts/2026-06-30-club-matto-origin-story.md`

The date prefix is the day the post shipped, and it is the only difference between a
published file and its draft: the slug carries over unchanged, so `grep`-ing a slug
always finds both the draft and the record. The date prefix keeps the list
chronological; the slug makes each file identifiable at a glance.

### Drafts

Drafts live in `drafts/` and use the same kebab-slug convention **without** the date
prefix:

```
descriptive-kebab-slug.md
```

One file per draft. The frontmatter carries a `platforms` list, plus `publish_date` for
the scheduled date from the board card. A batch leaves several posts in `drafts/` at
once, so without a date in the file there is no telling Monday's post from Sunday's.
The filename stays undated: the slug is the stable identity linking card to file, and a
slipped slot becomes a one-line change instead of a rename. On publish the date moves
into the filename and the field is dropped.

The body carries one `## <Platform>` section per entry in `platforms`, in the same
order. Platform-specific titles and copy live inside their sections; the frontmatter
`title` is the post's working title. Published files keep the sections — they are the
record of what actually ran on each platform.

## Frontmatter Schema

Every file must start with YAML frontmatter, and the schema is the same for drafts and
published posts:

```yaml
---
title: "Post working title"
platforms:
  - linkedin
  - twitter
topics:
  - fakedata
  - announcement
image: https://github.com/clubmatto/vetrina/blob/main/assets/image.png
---
```

Use `topics` to tag projects, products and themes. This is the primary mechanism for
cross-platform search, for example `grep "fakedata-pro" mercato/**/*.md`.

The only field that distinguishes the two states is `publish_date: YYYY-MM-DD`, present
in `drafts/` and dropped at publish, where the date prefix takes over.

The `image:` field is the GitHub link to the image that ships with the post, the same
form as the card's `Image:` line, for example
`https://github.com/clubmatto/vetrina/blob/main/website/src/assets/writing/how-coding-agents-work.png`.
Text-only posts omit the field, and published files keep it as the record of what
shipped. A post that ships with several images uses an `images:` list instead, same
URL form, one entry per image in attach order.

## Post Images

Articles ship with an OG image. The full style — layout, palette, fonts, the prompt
that produces one, and every example shipped so far — lives in
[`docs/STYLE.md`](docs/STYLE.md).

Which slot a post filled, and the article it was harvested from, are tracked on the
Marketing board rather than here. The scheduled date is the one exception, and only
while a post is still a draft. Mercato is the published record, not the plan.

## Searching and Filtering

| Query                     | Command                                    |
| ------------------------- | ------------------------------------------ |
| All posts about a topic   | `grep "fakedata-pro" mercato/**/*.md`      |
| All LinkedIn posts        | `grep -l "## LinkedIn" mercato/posts/*.md` |
| Recent posts (last 10)    | `ls -t mercato/posts/ \| head -10`         |
| A post's draft and record | `ls mercato/{drafts,posts}/*the-slug*`     |

## Adding a New Post

### Draft-first, recommended

1. Create the file in `drafts/` with a descriptive kebab slug and no date prefix.
2. List the target platforms in `platforms`, write one `## <Platform>` section per
   platform, and set `publish_date` to the card's due date.
3. Link the file from the Marketing board card's description.
4. When it publishes, drop `publish_date`, move the file into `posts/` with the date
   prefix added — `git mv drafts/<slug>.md posts/YYYY-MM-DD-<slug>.md` — and repoint
   the card's description link. Nothing gets split: the sections stay as they are.

Moving the card on the Marketing board is part of the same step.

### Direct publish

1. Create the file at `mercato/posts/YYYY-MM-DD-descriptive-slug.md`.
2. Add the frontmatter described above.
3. Write the body as one `## <Platform>` section per platform.

For thread-based platforms such as Twitter and Reddit, use markdown headings or blockquotes
to separate thread parts.

## Platform Rules

Voice, tone, punctuation and structure come from the Writing & Docs rule that ai-kit
installs at `.agents/rules/writing.md`. Follow it, and do not restate it here.

These are the mercato specifics:

- **LinkedIn: no hard limit.** Write what the post needs; 100 to 200 words is the usual
  range. Close with `Read it here: <url>`.
- **Twitter: 280 characters at most, aim for 200.** Close with the bare URL.
- **Instagram: 5 hashtags max.** The image is the post: a 1080x1440 (3:4) board —
  anything else gets cropped by the feed — caption short. No inline links; the URL
  lives in the bio, so close with `link in bio` instead.
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
