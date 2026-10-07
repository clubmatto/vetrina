# Contributing

We love every form of contribution.

## Setup

This project uses Go. See the `go.mod` file for the required version.

```bash
git clone https://github.com/clubmatto/vetrina
cd vetrina/db-diff
make
```

## Testing

Run all tests:

```bash
make test
```

For just unit tests, which need no Docker:

```bash
make unit
```

For just the tests that talk to real engines:

```bash
make integration
```

The integration suite starts containers with testcontainers, so it needs a running Docker
daemon. It needs two databases per engine, because comparing a database against itself is not
a diff. Budget a minute or two for a full run.

## Linting

```bash
make lint
```

## Submitting Changes

1. Fork the repo
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request against `main`

## Changing the checksum

The row and chunk checksums are defined once per engine, in SQL, and they have to agree. If you
touch `rowHashExpr` or the fold in `pg/`, `mysql/` or `clickhouse/`, you are changing the format
that all three must share, and you will need to change all three.

`integration/conformance_test.go` has a golden test that computes the expected checksum in Go
and asserts every engine produces it. That test is the contract. Self-consistency tests cannot
catch a digest that is wrong but consistent, which is exactly the class of bug this format is
vulnerable to, so keep the golden test honest: if the format legitimately changes, update the Go
side deliberately rather than adjusting the assertion to match the output.

## Adding an engine

An engine is a package that implements `diff.Dialect`, which is SQL strings plus result
scanning. `diff.BaseSource` supplies the rest of `diff.Source` on top of `*sql.DB`. Register the
new dialect in `cli.defaultDialectFor`.

The checksum a dialect produces has to match the other three byte for byte, so wire it into the
conformance suite before anything else.

## Embedding

The command line lives in `cli` rather than in `package main`, so another binary can run a
comparison with its own dialect. `cli.Options` exposes `DialectFor`, which replaces how a DSN
becomes a `Dialect`, and `AllowCrossEngine`, which permits a source and a target that resolve to
different engines.

[docs/architecture.md §4](docs/architecture.md#4-extension-point-map) maps the rest of the
seams.
