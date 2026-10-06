# DB diff

`db-diff` compares one table in two databases and reports the primary keys of the rows that
differ. It pushes the comparison into the databases as checksum queries, so only checksums
cross the wire when the tables match, and only the differing segments are read row by row.

It is built for the case a dump-and-compare cannot handle: a table with millions of rows where
you need to know *which* rows drifted, without transferring the table.

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
[dialect seam](docs/architecture.md#9-the-cross-engine-question-context-for-a-pro-feature) is
designed for it; the codec is the missing piece.

## Installation

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

A diff is a result rather than a failure, so it gets its own code. A CI job can tell "the data
drifted" apart from "the tool could not run".

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

See [how-it-works.md](docs/how-it-works.md) for the algorithm and its trade-offs.

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

The integration suite starts one container per engine and runs the same checks against all
three. Every dialect has to satisfy one contract: the chunk checksum equals the XOR fold of the
row checksums it covers, and two rows checksum the same exactly when they hold the same values
in the compared columns.

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
