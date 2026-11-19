# Consulting

The source of truth for how we sell our work. The page lives at
[`/consulting/`](../../website/src/consulting.liquid). This file is the copy
behind it, and the rules for writing about it anywhere else.

Read `.agents/rules/writing.md` and `.agents/rules/writing-marketing.md` first.
This file only records what is specific to the consulting work.

## The one message

We make coding agents work in a real codebase, and we measure the result
instead of asking you to believe it.

If a piece of copy cannot be traced back to that sentence, it is a different
piece of copy. The products, the writing, and the consulting all serve it: the
products are the proof we finish things, the writing is the proof we understand
agents, and the consulting is how both get paid for.

## Focus and breadth

We are two people, so the page has to do two things at once: go deep enough to be
worth hiring, and wide enough that a buyer does not need a second vendor.

The rule is **one deep spike, wide base**:

- **The spike is AI tooling for developers.** It gets the hero, the diagnosis,
  the three engagements, and the four numbers. It is the reason anyone clicks.
- **The base is everything else we ship.** It gets one section, "The ground we
  cover", one card per area, and every card ends in something a reader can open.
  Go, Kotlin, TypeScript, SQL, OpenTofu, Kubernetes and Nix are in production
  today. Data tools are two of our products, and Kube Shield, the operations one,
  is next.

Two failure modes to avoid:

1. **The one-trick page.** If someone reads it and thinks we only do agents, we
   lose the data and ops work, and we look like a two-person hobby.
2. **The laundry list.** If the stack becomes the headline, we look like a
   staffing agency and the spike disappears. Languages are evidence here, never
   the offer.

Breadth is allowed to be plural in one specific way: say "between us" when the
evidence is one person's history, and say "we" only when the repository backs it.
Luca's Airy platform and Stefano's Marley Spoon platform are both ours to claim,
but a stack only one of us has shipped needs that phrasing.

## The reader

A technical leader with agents already in the toolchain and no measurable gain.
Usually a CTO, a head of engineering, or the staff engineer who has to justify
the subscription. They have read the vendor posts, they have a repo that fights
back, and they can spot a deck from a mile away.

They do not need convincing that agents matter. They need a reason to believe
that two strangers can make theirs work, and a low-risk way to find out.

## What we sell

Three engagements, in the order most teams need them, plus the leadership work
that both founders have done for a living.

| Engagement | What the client gets | Proof we have done it |
|---|---|---|
| **Audit** | Where the agent loses time and tokens, the five changes worth making in order, with the evidence | Our sub-agent measurement: four children, 11 seconds faster, 73% more input tokens |
| **Setup** | Rules, context, skills, tool and permission boundaries, a verification loop, on a branch you can review | ai-kit, the open-source CLI that installs the same configuration |
| **Build** | The CLI, agent, or tool server the stack is missing | Pinocchio in five versions; fakedata and db-diff shipped from our pipeline |
| **Leadership** | Fractional CTO or interim head of engineering for the part where the tooling is not the problem | Luca: CTO at Marley Spoon, Head of Engineering at Airy, fractional CTO since 2022. Stefano: Head of Engineering at Acto and trana, engineering manager at solarisBank |

The base is not a fourth engagement. It is the answer to "can you also work on
the rest of our stack?", and it lives in one section so it never competes with the
spike.

Two rules for this table:

- Never add a row without a proof column that links somewhere public.
- Never claim a capability we have not shipped. "We can help with X" needs an X
  in our own history.

## Proof inventory

Everything we are allowed to say, and where it is checkable:

| Claim | Source |
|---|---|
| Ten open-source coding agents read through the same five components | `/writing/how-coding-agents-work/a-comparative-analysis/` |
| A coding agent built in five versions: loop, tools, permissions, compaction, sessions | `/writing/how-coding-agents-work/building-pinocchio/` |
| Four sub-agents: 82.2s to 71.2s wall time, 477,782 to 826,825 input tokens | `/writing/how-coding-agents-work/sub-agents/` |
| ai-kit installs rules, skills and commands in any repo | `/vetrina/ai-kit/` |
| Six products, two shipped, one in beta, three on the way | `/products/` |
| A month of coding-agent work on DeepSeek: $41.58, against $878 to $7,486 at published frontier rates | Our own bill, posted on LinkedIn and X |
| Go production code in six first-party projects | `fakedata`, `db-diff`, `kube-shield`, `bookmarks`, `lasagna`, `hub` |
| Kotlin Multiplatform shipping Android, iOS and Windows from one codebase | `/products/guido/` |
| TypeScript in a published npm CLI and in this site | `/vetrina/ai-kit/` |
| OpenTofu, k3s and Nix running our own machines | our infrastructure repo, not public: say it, do not link it |
| A query tuned from 444MB read to 28MB | `/writing/tuning-slow-postgres-queries-with-fakedata-pro/` |

A number without one of these behind it does not go on the page. If the proof
is in a social post, the page says "our own bill" and does not link, because
there is nothing on the site to link to yet.

## Words

Use: coding agents, agentic programming, codebase, feedback loop, verification
loop, audit, fixed scope, measure.

Do not use: AI transformation, AI strategy, digital transformation, copilot,
"10x", "supercharge", "unlock the power of", "AI-powered", "leverage".

The register is the same as everywhere else: two practitioners who will tell
you when the agent is the wrong answer. The page's best line is a caveat
("what this is not"), because it is the one a competitor will not write.

## Calls to action

- Site: one primary button, "Tell us about your codebase", to `/contact/`. The
  secondary link is the series, never a calendar.
- The closing ask is always the same five facts: languages, repo size, CI time,
  agent and model, what you already tried. It qualifies the lead and makes the
  first call useful.
- LinkedIn: `Work with us: https://matto.club/consulting/`

## When it goes live

The page is built and reachable at `/consulting/`, but nothing links to it and it
stays out of the sitemap. Shipping it is one commit with these pieces, all of
which are already written and commented out in place:

1. `website/src/_includes/navigation.liquid`: uncomment the Consulting nav entry.
2. `website/src/_includes/footer.liquid`: uncomment the footer entry and its
   separator.
3. `website/src/index.liquid`: swap the hero button pair back to consulting-first,
   and uncomment the line under the quote.
4. `website/src/about.liquid`: uncomment the callout button.
5. `website/src/contact.liquid`: uncomment the hint above the form.
6. `website/src/writing/hello-world.md`: replace the "light consulting" sentence
   with "Beyond products, we take on a few consulting engagements to keep
   ourselves self-funded: that is [how we work together](/consulting/)."
7. `website/src/writing/how-coding-agents-work/index.md`: add the closing
   paragraph, "Everything in this series comes from our own work..." plus the
   consulting link.
8. `website/src/llms.txt.liquid`: the parked blocks at the foot of the file go
   back under `## Pages` and as a `## Consulting` section.
9. `website/src/consulting.liquid`: drop `eleventyExcludeFromCollections: true`,
   which is what keeps it out of the sitemap and the llms.txt loops.
10. `website/src/_includes/head.liquid`: delete the `noindex` block for
    `/consulting/`, so search engines can index the page.

### Mentions parked with the links

Four pieces of copy said we do consulting without linking anywhere. They are back
to their pre-consulting wording, and the consulting versions are parked:

- `_data/site.js`: the default description is "A software artisans company".
- `index.liquid`: the home description is the original one.
- `_includes/head.liquid`: the Organization schema has no description.
- `llms.txt.liquid`: header quote, intro sentence and Home line are the original
  ones.
- `about.liquid`: the lede, the description and the callout talk about tools and
  the bottega, not about engagements.

`writing/hello-world.md` still says "we're open to light consulting". That line
predates this work, it never linked anywhere, and it was left alone on purpose.

Then check the build: `grep -rl 'href="/consulting/"' _site --include="*.html"`
should list every page, `sitemap.xml` should contain the URL, and
`grep -c noindex _site/consulting/index.html` should be 0.

The two documents that were drafted alongside this one now live in the private
marketing repo, not here: `bottega/marketing/linkedin.md` (company page, both
founder profiles, launch post) and `bottega/marketing/review-2026-11.md` (the
copy audit and the open decisions).

## How the page is built

`website/src/consulting.liquid`, laid out like the product pages: a
`.showcase-header`, then `.ds-section-title` sections. The section order is the
argument, so keep it:

1. **Why agents stall**: three failures, each one a thing we can fix.
2. **What we do**: the three engagements, in the order a team needs them.
3. **The ground we cover**: one full-width card for the spike, four cards for the
   base, each ending in a link. The asymmetry is deliberate: it is the section
   that says "we are not a one-trick team" without saying it.
4. **When the tooling is not the problem**: the leadership work, with the two
   founders and their history.
5. **Numbers from our own work**: the proof, four items.
6. **How it starts**: talk, audit, measure again.
7. **The caveat and the CTA**: what it is not, what we promise, availability.

The hero carries the breadth in two small ways: one clause of the lede ("so an
engagement rarely stops at the agent") and a row of stack chips under the
buttons. Both are facts, not claims, and they cost almost no vertical space.

Styles live in `website/src/assets/css/consulting.css` and reuse the design
system tokens. The person card is shared with `/about/` and lives in
`about.css`.
