# Fakedata Documentation Overhaul

## Current State

The README covers install, basic usage, ~30 of 80+ generators, a minimal template example,
shell completion, and development basics. Many features exist in code with zero documentation
coverage.

## Phase 1: README Overhaul

**File: `README.md`**

Rewrite from 162 → ~400 lines with this structure:

```
# FakeData

## Install

## Quick Start (keep existing)

## Generators (TODO)
  - Don't list generators statically (they change, hard to categorise)
  - Instead: explain how to explore generators via the CLI itself (`-g`, `--generators`, `--browse`)
  - Add VHS GIF showing `fakedata --generators` and `fakedata -g <name>`

## Custom Generators (TODO)
  - Don't list statically — same reasoning as generators
  - Options parsing quirks should be fixed at the source (code) rather than documented:
    - **`float` uses `:` as separator** — inconsistent with every other custom gen (`,`)
    - **`file` returns `nil, nil` on empty options** — should return a proper error
    - **`float` silently ignores malformed options** (`return nil, nil` instead of error)
  - Instead: link to CLI help + `--help custom` topic

## Column Spec Syntax
  - name:generator:options breakdown
  - 2-part vs 3-part disambiguation logic
  - All option formats with defaults

## Templates (MAJOR expansion)
  - File mode vs stdin pipe mode
  - All template functions reference:
    - {{ .GeneratorName }} (camelCase convention)
    - {{ Loop }}, {{ Odd }}, {{ Even }}
    - {{ Int }}, {{ Enum }}, {{ File }}, {{ Date }}
  - Examples: simple, loop, JSON, CSV, markdown

## Advanced Features (NEW sections)
  - Country-specific generators (first_name_IT, city_DE, etc.)
  - Date pair validation (auto-chronological ordering)
  - Deterministic seeding (expand existing)
  - Streaming with graceful shutdown (expand existing)

## Output Formats
  - column (with separator), ndjson
  - PostgreSQL: jsonb_array, pg_array_int, pg_array_text
  - `--help postgres` topic in CLI

## Shell Completion (keep existing)

## Development (expand)
  - make targets: build, unit, integration, test, coverage, bench,
    lint, import
  - Data sources: dariusk/corpora, dr5hn/world, sigpwned/names

## License
```

**Source files to read for accurate content:**
- `core/people.go`, `core/animals.go`, `core/text.go`, `core/web.go`,
  `core/ids.go`, `core/geo.go`, `core/time.go`, `core/types.go`,
  `core/json.go`, `core/culture.go`, `core/food.go` — for exact names,
  descriptions, and option parsing
- `core/template.go` — for template functions
- `core/column.go` — for column spec parsing logic
- `core/column_pairs.go` — for ordered column pairs

---

## Phase 2: Contextual Help System (DONE)

`fakedata help <topic>` dispatches with `help` as a pseudo-subcommand (no
pflag changes). Topics are editable markdown files under `docs/embed/`,
compiled into the binary via `go:generate` + `tools/embedmd`.

- **Dispatch**: `RunCLIMode` checks `args[0] == "help"`, consumes `args[1]`
  as topic name. `fakedata help` (no topic) lists available topics.
- **Content**: `docs/embed/templates.md`, `columns.md`, `formats.md`,
  `custom.md`, `seeding.md` — plain markdown, no new deps.
- **Embedding**: `tools/embedmd/main.go` reads `docs/embed/*.md` and
  outputs `cli/helptopics_gen.go` with escaped string content.
- **Rendering**: Simple lipgloss-based renderer in `cli/helptopics.go`:
  `#` → SectionHeader, `##` → Bold, `` ``` `` → Dim (code blocks).
- **New files**: `cli/helptopics.go`, `cli/helptopics_gen.go` (generated),
  `tools/embedmd/main.go`, `docs/embed/*.md` (×5).
- **Modified files**: `cli/run.go` (help dispatch).

---

## Phase 3: Interactive Generator Browser (Bubble Tea TUI)

**New file: `cli/browse.go`**

Bubble Tea model with:

1. **Filter input** — bubbles/textinput for type-to-search
2. **Generator list** — bubbles/list or custom table, showing:
   - Generator name (styled with lipgloss)
   - Category label
   - Description (truncated)
3. **Detail panel** — When a generator is selected, show:
   - Full description
   - Option syntax (if custom)
   - 5 sample values (live generated each render)
   - Example CLI usage
4. **Keybindings**:
   - `/` — focus filter
   - `↑/↓` or `j/k` — navigate list
   - `Enter` — select to see details
   - `Esc` — back from detail / clear filter
   - `q` or `Ctrl+C` — quit
   - `?` — toggle help keybindings overlay

**New dependency in `go.mod`:**

```
github.com/charmbracelet/bubbletea
github.com/charmbracelet/bubbles
```

**Modified file: `cli/options.go`**

- Add `Browse bool` to Config
- Register `--browse` / `-B` flag

**Modified file: `cli/run.go`**

- In `RunCLIMode`, add early check:
  ```go
  if cfg.Browse {
      runBrowser(reg)
      os.Exit(0)
  }
  ```

**New file: `cli/browse_test.go`**

- Golden file tests for browser rendering with a known generator list

---

## Phase 4: Doc Generation from Code (DONE)

**New file: `tools/gendocs/main.go`**

A Go tool that walks `core/` and `data/` to generate markdown documentation
tables with generator name, description, options, and examples, grouped by
category.

Usage: `go run tools/gendocs/ > GENERATORS.md`

**Modified: `Makefile`**

Add:
```makefile
docs: ## Generate markdown documentation from code
	@go run tools/gendocs/

.PHONY: docs
```

---

## Phase 5: GIF Demos with VHS

New GIFs for `assets/vhs/fakedata/` (referenced in README):

| GIF | Topic | Commands shown |
|-----|-------|----------------|
| `templates-loop-light.gif` | Template with Loop | `fakedata -T loop.tmpl -n 3` |
| `generator-details-light.gif` | Generator discovery | `fakedata -g int`, `fakedata -g email` |
| `country-specific-light.gif` | Locale generators | `fakedata first_name_IT city_IT phone_IT` |
| `date-pairs-light.gif` | Ordered column pairs | `fakedata -H start_date:date end_date:date` |
| `streaming-light.gif` | Streaming with Ctrl-C | `fakedata --stream email` |
| `browse-light.gif` | Interactive browser | `fakedata -B` |

---

## Phase 6: Enhanced `--generators` / `--generator` Output

**Modified file: `cli/help.go`**

- **`generatorsHelp()`**: Group generators by category with styled
  category headers. Show option signature for custom generators
  (e.g., `int* [min,max]`).

- **`showGeneratorHelp()`**: Add:
  - Category label
  - Option syntax (for custom gens) with defaults
  - Example CLI usage line
  - Template function name equivalent
  - 5 examples (already done, keep)

---

## File Change Summary

| File | Action |
|------|--------|
| `README.md` | Rewrite (~400 lines) |
| `cli/helptopics.go` | **New** — contextual help for topics |
| `cli/helptopics_gen.go` | **New** (generated) — topic content from `docs/embed/*.md` |
| `tools/embedmd/main.go` | **New** — generator tool that reads .md → .go |
| `docs/embed/*.md` | **New** (×5) — templates, columns, formats, custom, seeding |
| `cli/browse.go` | **New** — Bubble Tea generator browser |
| `cli/browse_test.go` | **New** — browser tests |
| `cli/options.go` | Add `Browse` field + flags |
| `cli/run.go` | Add dispatch for `help <topic>` and `--browse` |
| `cli/help.go` | Category-grouped output, richer per-generator detail |
| `tools/gendocs/main.go` | **New** — auto-generate markdown from code |
| `Makefile` | Add `docs` target, wire `go generate` |
| `go.mod` / `go.sum` | Add `bubbletea`, `bubbles` |
| `assets/vhs/fakedata/*.gif` | 6 new VHS GIFs |

---

## Suggested Priority Order

1. **Phase 1: README rewrite** — DONE
2. **Phase 2: Contextual help system** — DONE
3. **Phase 6: Enhanced `--generators`/`--generator`** — improves existing
   CLI, small code change
4. **Phase 4: Doc generation tool** — DONE
5. **Phase 3: Interactive browser** — highest effort, needs new deps,
   biggest wow factor
6. **Phase 5: VHS GIFs** — polish, can be done anytime
