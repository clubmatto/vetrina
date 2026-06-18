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

## Generators (complete, organized by category)
  - People (13 gens)
  - Animals (7 gens)
  - Text (12 gens)
  - Web & Network (8 gens)
  - IDs (5 gens)
  - Geography (21 gens)
  - Time (5 gens)
  - Types & Data (5 gens)
  - JSON (4 gens, including pg types)
  - Culture (10 gens)
  - Food (4 gens)
  - Planned (4 gens)

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

## Custom Generators (expand existing)
  - int, float, enum, file, date, datetime, timestamp, phone_number
  - Full option tables with defaults and constraints

## Advanced Features (NEW sections)
  - Country-specific generators (first_name_IT, city_DE, etc.)
  - Date pair validation (auto-chronological ordering)
  - PostgreSQL-specific generators (jsonb_array, pg_array_int,
    pg_array_text, polygon)
  - Deterministic seeding (expand existing)
  - Streaming with graceful shutdown (expand existing)

## Output Formats
  - column (with separator)
  - ndjson

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
- `core/date_pairs.go` — for date pair validation

---

## Phase 2: Contextual CLI Help System

**New file: `cli/helptopics.go`**

Topic-based help rendered with lipgloss + markdown:

```go
package cli

var helpTopics = map[string]string{
    "templates": `# Templates ...`,
    "generators": `...`,
    "formats":    `...`,
    "columns":    `...`,
}
```

**Modified file: `cli/options.go`**

- Add `HelpTopic` field to `Config`
- Register `--help <topic>` flag

**Modified file: `cli/run.go`**

- Add dispatch in `RunCLIMode`:
  ```go
  if cfg.HelpTopic != "" {
      topic, ok := helpTopics[cfg.HelpTopic]
      if !ok { ... }
      output.Println(topic)
      os.Exit(0)
  }
  ```

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

## Phase 4: Doc Generation from Code

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
| `date-pairs-light.gif` | Date pair validation | `fakedata -H start_date:date end_date:date` |
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
| `cli/browse.go` | **New** — Bubble Tea generator browser |
| `cli/browse_test.go` | **New** — browser tests |
| `cli/options.go` | Add `HelpTopic`, `Browse` fields + flags |
| `cli/run.go` | Add dispatch for `--help <topic>` and `--browse` |
| `cli/help.go` | Category-grouped output, richer per-generator detail |
| `tools/gendocs/main.go` | **New** — auto-generate markdown from code |
| `Makefile` | Add `docs` target |
| `go.mod` / `go.sum` | Add `bubbletea`, `bubbles` |
| `assets/vhs/fakedata/*.gif` | 6 new VHS GIFs |

---

## Suggested Priority Order

1. **Phase 1: README rewrite** — highest impact, no new deps, pure docs
2. **Phase 6: Enhanced `--generators`/`--generator`** — improves existing
   CLI, small code change
3. **Phase 2: Contextual `--help <topic>`** — medium effort, big UX win
4. **Phase 4: Doc generation tool** — enables "docs from code" workflow
5. **Phase 3: Interactive browser** — highest effort, needs new deps,
   biggest wow factor
6. **Phase 5: VHS GIFs** — polish, can be done anytime
