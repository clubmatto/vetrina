# DB Diff

[![Go](https://img.shields.io/badge/Go-1.24.0-00ADD8?logo=go)](https://go.dev) [![License](https://img.shields.io/github/license/clubmatto/vetrina)](../LICENSE)

`db-diff` compares one table in two databases and reports the primary keys of the rows that
differ. It pushes the comparison into the databases as checksum queries, so only checksums
cross the wire when the tables match, and only the differing segments are read row by row.

It is built for the case a dump-and-compare cannot handle: a table with millions of rows where
you need to know *which* rows drifted, without transferring the table.

Both databases must run the **same engine**. See [Current limitations](#current-limitations).

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="../assets/vhs/db-diff/basic-postgres-dark.gif">
  <img alt="DB Diff reporting the rows that drifted across two Postgres databases" src="../assets/vhs/db-diff/basic-postgres-light.gif">
</picture>

## Table of Contents

- [Install](#install)
- [Quick start](#quick-start)
- [Supported databases](#supported-databases)
- [Usage](#usage)
- [Options](#options)
- [Exit codes](#exit-codes)
- [Output](#output)
- [How it works](#how-it-works)
- [Embedding db-diff](#embedding-db-diff)
- [Development](#development)
- [Current limitations](#current-limitations)
- [License](#license)

## Install

```bash
go install matto.club/vetrina/db-diff@latest
```

Or with Homebrew:

```bash
brew tap clubmatto/vetrina https://github.com/clubmatto/vetrina
brew install clubmatto/vetrina/db-diff
```

From a checkout:

```bash
git clone https://github.com/clubmatto/vetrina
cd vetrina/db-diff
make build
```

## Quick start

```bash
db-diff --source=postgres://user:pass@src:5432/db --target=postgres://user:pass@dst:5432/db --table=orders
```

When the tables match:

```
no differences in orders
```

When they do not, you get one primary key per line:

```
3 differing rows in orders:
1042
1043
9187
```

A diff is a result rather than a failure, so it gets its own exit code. A CI job can tell "the
data drifted" apart from "the tool could not run".

## Supported databases

`db-diff` compares a database against another database **of the same engine**.

| Engine | Status | DSN |
|---|---|---|
| PostgreSQL | supported | `postgres://user:pass@host:5432/db` |
| MySQL | supported | `user:pass@tcp(host:3306)/db` |
| ClickHouse | supported | `clickhouse://user:pass@host:9000/db` |

Cross engine comparisons, such as PostgreSQL against MySQL, are not supported yet. The
checksum has to be computed the same way on both sides, and engines disagree on how they
render values as text, so a cross engine diff needs a type aware canonical form first. The
[dialect seam](docs/architecture.md#9-the-cross-engine-question-an-open-extension-point) is
designed for it; the codec is the missing piece.

## Usage

```bash
db-diff --source=<source_dsn> --target=<target_dsn> --table=<table_name>
```

The table must have the same name on both sides and an integer primary key named `id`.

### Examples

PostgreSQL to PostgreSQL:

```bash
db-diff --source=postgres://user:pass@src:5432/db --target=postgres://user:pass@dst:5432/db --table=orders
```

MySQL to MySQL:

```bash
db-diff --source=user:pass@tcp(src:3306)/db --target=user:pass@tcp(dst:3306)/db --table=orders
```

ClickHouse to ClickHouse:

```bash
db-diff --source=clickhouse://user:pass@src:9000/db --target=clickhouse://user:pass@dst:9000/db --table=orders
```

Only the columns likely to change:

```bash
db-diff --source="$SRC" --target="$DST" --table=orders --include=id,amount,status
```

Everything except the noisy columns:

```bash
db-diff --source="$SRC" --target="$DST" --table=orders --exclude=updated_at,raw_payload
```

## Options

| Flag | Default | Meaning |
|---|---|---|
| `--source` | | source database connection string (required) |
| `--target` | | target database connection string (required) |
| `--table` | | name of the table to compare (required) |
| `--include` | | comma separated list of columns to compare |
| `--exclude` | | comma separated list of columns to leave out |
| `--segment-size` | `10000` | how many primary keys to checksum per query |
| `--version` | | print the version and exit |

`--include` and `--exclude` cannot be used together. A column name that does not exist is an
error, so a typo cannot silently change what is compared.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | the tables match |
| `1` | the tables differ |
| `2` | the comparison could not be completed |

## Output

Matching tables:

```
no differences in orders
```

Differing tables list one primary key per line, so the output pipes:

```
3 differing rows in orders:
1042
1043
9187
```

## How it works

The comparison is a segment walk. The table is cut into ranges of `--segment-size` primary keys,
each range is checksummed on both sides, and only the ranges whose checksums differ are read row
by row. See [how-it-works.md](docs/how-it-works.md) for the algorithm, the checksum, the
collision budget and the tuning notes, and
[architecture.md](docs/architecture.md) for how the tool is built.

## Embedding db-diff

The command line lives in the `cli` package rather than in `package main`, so another binary can
run a comparison with its own dialect:

```go
code := cli.RunFromArgs(version, cli.Options{})
```

`cli.Options` carries two seams. `DialectFor` replaces how a DSN becomes a `Dialect`, and
`AllowCrossEngine` permits a source and a target that resolve to different engines. The refusal
lives in the CLI, not in the algorithm, because the algorithm compares whatever strings the
dialects produce.

A dialect is SQL strings plus result scanning. Implement `diff.Dialect`, wrap it with
`diff.BaseSource`, and hand the result to `differ.Runner`. See
[architecture.md §9](docs/architecture.md#9-the-cross-engine-question-an-open-extension-point)
for the contracts and the open design questions.

## Development

```bash
make unit          # fast tests, no containers
make integration   # conformance and CLI tests, needs Docker
make test          # both
make lint          # golangci-lint
make ci            # lint, unit, integration
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for the setup and the checksum contract, and
[docs/architecture.md](docs/architecture.md) for a complete description of how the tool is
built.

The integration suite starts containers with testcontainers and runs the same checks against all
three engines. Every dialect has to satisfy one contract: the chunk checksum equals the XOR fold
of the row checksums it covers, and two rows checksum the same exactly when they hold the same
values in the compared columns.

## Current limitations

These are known and deliberate for this version:

- **Same engine only.** Cross engine diffs need a canonical, type aware value representation
  first.
- **A single integer primary key named `id`.** Composite keys, and keys that are not integers
  (UUIDs, for example), are not supported.
- **The table name is the same on both sides.** There is no flag to map one name to another.
- **A different column layout is an error.** If the two tables lay the same columns out in a
  different order, `db-diff` refuses rather than reports every row as changed.
- **Segments are not split recursively.** A differing segment is read row by row in one go,
  rather than being divided again. With the default segment size that is 10 000 rows, which is
  fast in practice but not free.
- **The comparison is not transactional.** Rows written while `db-diff` runs can show up as
  differences. Run it against a quiesced replica when that matters.
- **Session settings are not pinned.** Each connection renders `timestamptz`, `TIMESTAMP` and
  `DateTime` values with its own timezone, so both sides should use the same settings. See
  [how-it-works.md](docs/how-it-works.md#why-the-same-engine-only).
- **PostgreSQL 14 or newer**, because the segment checksum uses the `bit_xor` aggregate.

## License

MIT. See [LICENSE](LICENSE).
