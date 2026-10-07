# db-diff: current state

This document describes what `db-diff` **is today**, as built. It is written to be handed to
another LLM as context for reasoning about changes to it. It is deliberately complete and
redundant: every claim here is grounded in the code in this directory.

Read this as ground truth for a design discussion. Where the code imposes a constraint, the
constraint is stated, because most design questions about this tool are really questions about
which of these constraints are worth relaxing.

Path references are relative to the module root. Written against `v0.0.4`.

---

## 1. What it is

A single-binary Go CLI. It compares **one table** in **two databases** and prints the **primary
keys of the rows that differ**.

```
db-diff --source=<dsn> --target=<dsn> --table=<name> [--include=...] [--exclude=...] [--segment-size=N]
```

Design centre of gravity: a table with millions of rows where you need to know *which* rows
drifted, without transferring the table. Correctness is prioritised over cleverness. The
alternative it replaces is a full dump-and-compare.

**It is a data verification tool, so its one unacceptable failure is a false negative**: saying
"the tables match" when they do not. A false positive (reporting a difference that is not there)
is an annoyance. Every design decision below is downstream of that asymmetry.

Released as `v0.0.4`: `go install matto.club/vetrina/db-diff@latest`, or Homebrew. CI runs lint,
unit and integration on every push.

---

## 2. Invariants (treat these as load-bearing)

**I1 — No false negatives from the checksum.**
Two rows produce the same row checksum **iff** they hold the same values in the compared
columns, with NULL distinct from the empty string.

**I2 — The fold property.**
`GetChunkHash(range) == XOR fold of GetRowsHash(range)` over the same range. This is what lets
the tool trust "the checksums match" without pulling rows. It is asserted by a conformance test
against real engines.

**I3 — Order independence.**
The chunk checksum must not depend on the order the database returns rows in. A query plan, a
physical layout, or a ClickHouse background merge can all change that order.

**I4 — Symmetry.**
`diff(source, target) == diff(target, source)` as sets. The tool must not care which side is
called the source.

**I5 — All three engines derive the same 64-bit value for the same row.**
Byte for byte. This is what makes a cross-engine comparison *possible* in principle. Because the
three engines only agree on spelling for a subset of types, comparing across engines is
nonetheless **refused** in the CLI today (see §9).

**I6 — Same dialect on both sides.**
Enforced in `cli.resolveDialects`, before any connection is opened.

---

## 3. Architecture

```
main.go                       entry point; calls cli.RunFromArgs
  └── cli                     flags, exit codes, dialect selection, wiring, output
        └── differ            THE ALGORITHM (segment walk + row comparison)
              └── diff        engine-independent types, contracts, column selection
                    ├── sqlbuild      identifier quoting, range predicate
                    └── pg | mysql | clickhouse
                                      one package per engine; SQL + result scanning only
integration/                  tests that need containers (conformance, CLI end-to-end)
testutil/                     container fixtures
```

The dependency direction is strictly inward: dialects depend on `diff`; `diff` depends on
nothing engine-specific; `differ` depends on `diff`. `cli` depends on all of it, and `main`
depends only on `cli`.

### 3.1 `diff` — the engine-independent core

```go
type IDRange struct { Min int64; Max int64 }      // inclusive, int64 primary key only

type Table struct {                                // name and columns TRAVEL TOGETHER
    Name    string
    Columns []string
}

type ChunkHash struct { Hash string }              // 16 lowercase hex digits

type MetadataReader interface {
    GetColumnNames(ctx, tableName) ([]string, error)          // in the DB's own order
    GetMinMax(ctx, tableName) (min, max int64, empty bool, err error)
    Ping(name string) error
    Close() error
}

type HashReader interface {
    GetChunkHash(ctx, table *Table, r IDRange) (*ChunkHash, error)
    GetRowsHash(ctx, table *Table, r IDRange) (map[int64]string, error)
}

type Source interface { MetadataReader; HashReader }

type ColumnExpr struct {                           // a column, and the SQL that renders its value
    Name  string                                   // unquoted; the dialect quotes it
    Value string                                   // SQL producing the value to hash
}

type Dialect interface {
    GetColumnNamesSQL(tableName string) string
    ScanColumnName(rows *sql.Rows) (string, error)
    GetMinMaxSQL(tableName string) string
    GetChunkHashSQL(tableName string, columns []string, r IDRange) string
    GetRowsHashSQL(tableName string, columns []string, r IDRange) string
}
```

`BaseSource` (`diff/source.go`) implements all of `Source` generically on top of
`*sql.DB` plus a `Dialect`. A dialect package therefore supplies **only** SQL strings and result
scanning; there is no per-engine logic elsewhere.

Two details exist to make past bugs unrepresentable, and are worth preserving:

- `Table` binds the name to its columns. An earlier version passed a single metadata struct to
  both sides, so the target's checksum was computed against the source's table and **any two
  tables compared equal**.
- `GetMinMax` returns `empty bool` instead of using NULL bounds. ClickHouse returns the column
  type's default (`0`) for `MIN`/`MAX` of an empty table, not NULL.

`diff.GetColumnNames` applies `--include` / `--exclude`:

- `--include` preserves the user's order.
- `--exclude` preserves the database's schema order.
- No selection → every column, in schema order.
- A name that does not exist is an **error**, not a silent no-op.
- Excluding every column is an error.

`diff.ValidateSameColumns` requires the target to expose every *selected* column, in the
*same relative order*. Extra columns on the target are fine (that is what `--exclude` is for).
This exists because the digest folds columns in the order given: a different layout would
otherwise surface as "every row changed" instead of as a schema problem.

`diff.CompareRows` is the only place row-level comparison happens. It is a **set union**:

```
for each id in source: if not in target OR hashes differ -> differs
for each id in target: if not in source                   -> differs
sort ascending
```

Iterating one side alone is what dropped rows that existed only on the other side.

### 3.2 `differ` — the algorithm

```go
type Runner struct {
    Source, Target diff.Source
    Table          *diff.Table
    SegmentSize    int64            // 0 -> DefaultSegmentSize (10000)
}
func (r Runner) Run(ctx) ([]int64, error)
```

`Run`:

1. `GetMinMax` on **both** sides.
2. If both are empty → no differences, no queries.
3. `walkMin, walkMax = union of the two ranges`. If one side is empty, the other side's bounds
   stand in. **The walk covers both ranges, never just the source's** — a target row outside the
   source's range otherwise never appears in a predicate, which also broke symmetry (I4).
4. Walk `[walkMin, walkMax]` in steps of `SegmentSize`:
   - `end = min(start + SegmentSize - 1, walkMax)` (clamping prevents int64 overflow near
     `MaxInt64`).
   - `GetChunkHash` on both sides for `{start, end}`; if equal, skip.
   - Otherwise `CompareRows` for that range and collect ids.
   - Advance `start = end + 1`, and **break when `end == walkMax`** (`end + 1` wraps negative at
     the top of the range).
5. Sort and return.

Cost profile: one checksum query per side per segment, plus two row-level queries only for
segments that differ.

`differ` lives in a package rather than in `main` because the algorithm was once duplicated into
the test helper. Both copies carried the same range bug. Tests must drive the real thing.

### 3.3 The dialects

Each dialect renders two expressions per row. The **shape is identical across engines**; only the
function names differ.

**NULL bitmap** — one character per column, `'0'` for NULL and `'1'` otherwise, concatenated in
column order. This is what keeps NULL distinct from `''` (I1).

**Per-column digest** — one MD5 per column over that column's text rendering.

**Row digest** — MD5 over `bitmap || digest_1 || digest_2 || ...`. Every part is fixed width (1
char per bitmap entry, 32 hex per digest), so the concatenation is unambiguous: no row can
collide with another by shifting a delimiter between columns.

**Row checksum** — the first 16 hex digits (8 bytes) of the row digest, read as an unsigned
64-bit integer.

**Chunk checksum** — XOR of the row checksums in the range, rendered as 16 hex digits.

Where each engine has to differ, and why:

| Engine | Fold | Traps encoded in the SQL |
|---|---|---|
| PostgreSQL | `bit_xor` (needs **PG ≥ 14**) | No unsigned ints. `%` takes its sign from the dividend, so `(-2^63+k) % 2^63` **drops bit 63**; must use two-argument `mod(x, 2^64)`, then `::bigint` to keep the bit pattern. `bit_xor` over an empty range is NULL → `COALESCE(..., 0)` |
| MySQL | `BIT_XOR` | `CONV()` returns a **decimal string**; without `CAST(... AS UNSIGNED)` `BIT_XOR`/`HEX` read its ASCII bytes. `COALESCE(BIT_XOR(...), 0)` coerces unsigned→signed and **clamps to `7FFF...FFFF`**; `BIT_XOR` already folds to 0 over no rows, so no COALESCE. `CONCAT` not `CONCAT_WS` (the latter skips NULL args). Values are cast `AS BINARY`, not `AS CHAR`, so the stored bytes are hashed rather than a charset-dependent decoding. Identifiers need backticks, not double quotes |
| ClickHouse | `groupBitXor` | `reinterpretAsUInt64` is **little-endian**, so `unhex` reads the bytes reversed; `reverse()` cancels it. `hex()` is uppercase → wrapped in `lower()` so the digest input matches the other engines. `toString` handles `Nullable` where `CAST(x AS String)` refuses NULL. Empty table → `MIN/MAX` return `0`, handled by `COUNT(*)` |

The row-hash values and the chunk-hash values are therefore **the same strings in all three
engines** for the same row, which a golden test asserts by computing the expected digest in Go.

### 3.4 CLI surface

Flags: `--source`, `--target`, `--table` (all required), `--include`, `--exclude` (mutually
exclusive), `--segment-size` (default 10000), `--version`.

Exit codes: `0` match, `1` differ, `2` could not run. A diff is a result, not an error.

Output: `no differences in <table>`, or `<n> differing rows in <table>:` followed by one primary
key per line.

Dialect is inferred from the DSN:

| DSN prefix / shape | dialect |
|---|---|
| `postgres://`, `postgresql://` | postgres |
| `clickhouse://`, `tcp://` | clickhouse |
| contains `@tcp(` or `@unix(` | mysql |
| anything else | error |

---

## 4. Extension-point map

Where the seams are, for anyone reasoning about adding capability.

| If the change is about… | It belongs in… |
|---|---|
| Adding an engine | a new package with a `Dialect` implementation + a case in `defaultDialectFor` |
| The checksum definition | the three `rowHashExpr` implementations, kept identical in *value* |
| The comparison algorithm | `differ` |
| Column selection / validation | `diff/diff.go` |
| Flags, exit codes, output | `cli` |
| Embedding the CLI in another binary | `cli.Options` (`DialectFor`, `AllowCrossEngine`) |
| Cross-engine comparison | currently blocked by §9; see below |

### The checksum is the main architectural seam

The checksum is defined **once per engine** and must agree by construction. There is no shared
implementation to change: the definition is duplicated three times as SQL. The only thing
keeping them in agreement is (a) the documented shape above, (b) a golden test that pins all
three to a Go-computed value.

That duplication is deliberate — pushing the hash into the database is the entire performance
story — but it is the single most fragile thing in the codebase. Any change to the checksum
shape must be made in three places and verified by the golden test.

---

## 5. Tests

| Suite | Needs Docker | What it protects |
|---|---|---|
| `diff/diff_test.go` | no | column selection, layout validation, `CompareRows` union/symmetry, error propagation |
| `differ/differ_test.go` | no | the range union, symmetry, segment clamping, the int64 bound, the default segment size |
| `integration/conformance_test.go` | yes | the fold contract, diff semantics, NULL≠empty, empty sides, out-of-range rows, disjoint ranges, and **a golden checksum computed in Go** |
| `integration/binary_test.go` | yes | binary values stay distinct on all three engines (the MySQL `AS CHAR` false negative) |
| `integration/cli_test.go` | yes | the built binary: exit codes, flag validation, `--include`/`--exclude`, symmetry, cross-engine refusal, error messages |

The conformance suite starts **two containers per engine** (a diff needs two databases).

The golden test is the only test that can catch a *consistently wrong* checksum. Self-consistency
tests (dialect vs. its own output) cannot: they pass for a wrong-but-consistent digest. This is
how the Postgres bit-63 bug and ClickHouse's byte reversal were found.

`make unit` is container-free; `make integration` needs Docker; `make ci = lint unit integration`.

---

## 6. Performance model

- Work per segment: 2 checksum queries (one per side).
- Work per *differing* segment: 2 row-level queries returning up to `SegmentSize` rows each.
- So: matching tables cost one pass of aggregate queries. Drifted tables cost
  `O(differing segments × SegmentSize)` rows transferred.
- Only checksums cross the wire when tables match.
- No recursion: a differing segment is read whole, not subdivided (see §9).
- No concurrency: segments are walked serially.

---

## 7. What it does not do

Stated so it is not assumed:

- No cross-engine comparison (refused).
- No composite keys; no non-integer keys (UUIDs). Primary key must be an integer column named `id`.
- No table-name mapping: the table has the same name on both sides.
- No recursive segment splitting.
- No parallelism.
- No snapshot/isolation: rows written during a run can appear as differences.
- Session settings are not pinned, so `timestamptz`/charset/timezone rendering must match on both
  connections or identical data can hash differently.
- The comparison is not streaming; a differing segment's rows are materialised in a Go map.
- No progress output; no structured/JSON output; no output to a file.

---

## 8. Known weaknesses (accepted, not bugs)

- **64-bit accumulator.** For a 10,000-row segment the probability of a colliding fold is ~2.7 ×
  10⁻¹²; across 10,000 segments ~2.7 × 10⁻⁸. Accepted deliberately; widening it is a contained
  change (one expression per dialect).
- **Session-dependent rendering** (§7) is the most likely source of false positives in the field.
- **Non-unique `id`** silently collapses rows in the `map[int64]string` keyed by id.
- **The checksum is duplicated three times** (§4).

---

## 9. The cross-engine question (an open extension point)

**Status: refused, deliberately.** `cli.resolveDialects` errors before connecting if the two DSNs
resolve to different dialects.

Two independent reasons it cannot work today:

1. **Value rendering differs per engine.** A boolean renders `t` in PostgreSQL, `1` in MySQL.
   Timestamps carry different precision. A decimal pads differently. The bit-pattern case is a
   separate, narrower problem.
2. **Session settings leak into rendering.** PostgreSQL formats `timestamptz` in the session
   `TimeZone`; MySQL decodes text in the connection charset; ClickHouse formats `DateTime` in the
   column timezone.

Without a canonical, type-aware text form per value, a cross-engine run hashes two different
strings for the same logical value and reports **every row as changed** — which is why refusing
was chosen over producing that.

What is already in place for it: I5 holds. For the types where the three engines agree on
spelling (notably signed integers), the checksums are already identical, which the golden test
proves. The missing piece is a canonical value codec per type, not a change to the algorithm.

**The seam is already the right shape.** `diff.BaseSource` implements every `Source` method
generically over `*sql.DB` plus a `Dialect`, and `differ.Runner` takes a `diff.Source`. So a
caller can supply its own `diff.Dialect` — one that renders a canonical form of each value
instead of the engine's native text — compose it with `diff.BaseSource`, and hand the result to
`differ.Runner`. No interface has to widen and the algorithm does not change:

```go
source := &diff.BaseSource{Conn: db, Dialect: canonicalDialect{}}
ids, err := differ.Runner{Source: source, Target: target, Table: table}.Run(ctx)
```

The rendering is a `diff.ColumnExpr`: a column name and a SQL expression producing the value to
hash. Each dialect's `NativeExpr` is the same-engine case. A canonical codec is the same shape
returning a canonical expression instead, which is why the `Dialect` methods still take column
names and build the expressions themselves.

That is why the cross-engine work is a codec problem rather than an algorithm problem.

**One decision the cross-engine work must make explicitly.** The codec answers "how do I encode
a value"; it does not answer "are these two declared types comparable". Comparing a
microsecond-precision timestamp against a second-precision one, or a wall-clock column against
an instant one, is a *contract* question. Answering it implicitly per type means the failure
surfaces as a difference on every row rather than as a refusal. It deserves to be a named
decision, not an implementation detail.

**Open design questions for that discussion** (not answered here):

- Is a cross-engine build a *capability* boundary (different dialects) or a *packaging* boundary
  (same code, different distribution), or both?
- Where does the *comparability* decision live (see above): a declared contract between two
  types, or validation at preflight time?
- Where does a canonical codec live — in the dialect packages (SQL-side, keeps compute in the
  database) or in Go (requires pulling typed values, which changes the performance story)?
- Does a canonical form need to handle every type, or can it be scoped to a declared subset with
  a loud error for the rest?
- Does the same split need to support comparing *different* table names, or *different* key
  columns, which are also currently unsupported?
