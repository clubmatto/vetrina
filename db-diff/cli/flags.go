package cli

import (
	"errors"
	"flag"
	"fmt"
	"io"
)

// errHelp reports that the user asked for usage rather than for a run. The
// flag package signals this with flag.ErrHelp when the usage output is its own,
// but a caller that replaces Usage loses that signal, so it is carried here.
var errHelp = errors.New("help requested")

// DefaultSegmentSize is how many primary keys one checksum covers unless the
// command line says otherwise.
const DefaultSegmentSize int64 = 10000

// parsed is the command line after parsing, before validation.
type parsed struct {
	resolved

	// fs is kept so validation can report unexpected positional arguments.
	fs *flag.FlagSet
}

func parseFlags(args []string, opts Options, out io.Writer) (resolved, error) {
	var p parsed

	fs := newFlagSet(args, out, opts, &p)
	p.fs = fs

	if err := fs.Parse(args); err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return resolved{}, errHelp
		}

		return resolved{}, err
	}

	return validate(p)
}

// newFlagSet registers the public flags. A caller that needs more flags cannot
// add them here, so Options is the extension point instead: a downstream layer
// passes its extra configuration through Options rather than through the
// command line this package owns.
func newFlagSet(args []string, out io.Writer, opts Options, p *parsed) *flag.FlagSet {
	fs := flag.NewFlagSet("db-diff", flag.ContinueOnError)
	fs.SetOutput(out)
	fs.Usage = func() {
		fmt.Fprint(out, usageHeader(opts))
		fs.PrintDefaults()
		fmt.Fprint(out, usageFooter(opts))
	}

	p.DialectFor = opts.DialectFor
	p.AllowCrossEngine = opts.AllowCrossEngine
	p.SegmentSize = opts.SegmentSize

	fs.StringVar(&p.SourceDSN, "source", opts.SourceDSN, "source database connection string (required)")
	fs.StringVar(&p.TargetDSN, "target", opts.TargetDSN, "target database connection string (required)")
	fs.StringVar(&p.Table, "table", opts.Table, "name of the table to compare (required)")
	fs.StringVar(&p.Exclude, "exclude", opts.Exclude,
		"comma separated list of columns to exclude from the comparison")
	fs.StringVar(&p.Include, "include", opts.Include,
		"comma separated list of columns to include in the comparison")
	fs.Int64Var(&p.SegmentSize, "segment-size", segmentSizeOr(opts.SegmentSize),
		"number of primary keys to checksum per query")
	fs.BoolVar(&p.showVersion, "version", false, "print the version and exit")

	return fs
}

func segmentSizeOr(size int64) int64 {
	if size <= 0 {
		return DefaultSegmentSize
	}

	return size
}

// validate enforces what the command line has to satisfy before anything is
// opened, so a mistake fails with a message rather than a connection error.
func validate(p parsed) (resolved, error) {
	if p.showVersion {
		return p.resolved, nil
	}
	if p.fs.NArg() > 0 {
		return resolved{}, fmt.Errorf("unexpected argument %q", p.fs.Arg(0))
	}
	if p.SourceDSN == "" || p.TargetDSN == "" || p.Table == "" {
		return resolved{}, errors.New("--source, --target and --table are all required")
	}
	if p.Include != "" && p.Exclude != "" {
		return resolved{}, errors.New("--include and --exclude cannot be used together")
	}
	if p.SegmentSize <= 0 {
		return resolved{}, errors.New("--segment-size must be greater than zero")
	}

	return p.resolved, nil
}

// usageHeader is the help prose above the flag list. It follows the options
// rather than a fixed string, because resolveDialects reads the same
// AllowCrossEngine field: help that cannot drift from the behaviour it
// describes cannot lie about it.
func usageHeader(opts Options) string {
	if opts.UsageHeader != "" {
		return opts.UsageHeader
	}
	if opts.AllowCrossEngine {
		return crossEngineUsageHeader
	}

	return sameEngineUsageHeader
}

// usageFooter is the help prose below the flag list, and follows the header for
// the same reason: the examples show what this binary will actually accept.
func usageFooter(opts Options) string {
	if opts.UsageFooter != "" {
		return opts.UsageFooter
	}
	if opts.AllowCrossEngine {
		return crossEngineUsageFooter
	}

	return sameEngineUsageFooter
}

const sameEngineUsageHeader = `db-diff compares the rows of one table across two databases.

Usage:
  db-diff --source <dsn> --target <dsn> --table <name> [options]

The source DSN decides the dialect. Both databases must run the same engine:
cross dialect diffs are not supported yet.

DSN formats:
  postgres    postgres://user:pass@host:5432/db
  mysql       user:pass@tcp(host:3306)/db
  clickhouse  clickhouse://user:pass@host:9000/db

Options:
`

const sameEngineUsageFooter = `
Exit codes:
  0  the tables match
  1  the tables differ
  2  db-diff could not complete the comparison

Examples:
  db-diff --source "$SRC" --target "$DST" --table orders
  db-diff --source "$SRC" --target "$DST" --table orders --exclude updated_at,raw_payload
`

const crossEngineUsageHeader = `db-diff compares the rows of one table across two databases.

Usage:
  db-diff --source <dsn> --target <dsn> --table <name> [options]

The source and the target may run different engines. Each value is reduced to a
canonical form before it is hashed, so both engines compute the same bytes for
the same data. A column whose two types cannot be compared honestly is refused
rather than reported as changed.

DSN formats:
  postgres    postgres://user:pass@host:5432/db
  mysql       user:pass@tcp(host:3306)/db
  clickhouse  clickhouse://user:pass@host:9000/db

Options:
`

const crossEngineUsageFooter = `
Exit codes:
  0  the tables match
  1  the tables differ
  2  db-diff could not complete the comparison

Examples:
  db-diff --source "$SRC" --target "$DST" --table orders
  db-diff --source "$PG" --target "$MYSQL" --table orders --exclude updated_at,raw_payload
`
