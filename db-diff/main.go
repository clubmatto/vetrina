// Command db-diff compares one table across two databases and reports the
// primary keys of the rows that differ.
package main

import (
	"context"
	"database/sql"
	"errors"
	"flag"
	"fmt"
	"os"
	"os/signal"
	"strings"
	"syscall"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	"github.com/charmbracelet/log"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	"matto.club/vetrina/db-diff/clickhouse"
	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/differ"
	"matto.club/vetrina/db-diff/mysql"
	"matto.club/vetrina/db-diff/pg"
)

// exit codes. A diff is a result, not an error, so it gets its own code: a CI
// job can tell "the tables differ" apart from "the tool could not run".
const (
	exitClean    = 0
	exitDiffers  = 1
	exitFailure  = 2
	defaultChunk = 10000
)

// version is stamped at build time with -ldflags.
var version = "dev"

type options struct {
	source      string
	target      string
	table       string
	include     string
	exclude     string
	segmentSize int64
	showVersion bool
}

func main() {
	os.Exit(run())
}

func run() int {
	opts, err := parseFlags(os.Stdout)
	if err != nil {
		if errors.Is(err, flag.ErrHelp) {
			return exitClean
		}
		fmt.Fprintf(os.Stderr, "db-diff: %v\n", err)

		return exitFailure
	}
	if opts.showVersion {
		fmt.Printf("db-diff %s\n", version)

		return exitClean
	}

	// Ctrl+C cancels the queries in flight instead of leaving the process to
	// wait on a scan of a large table.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	ids, err := diffTable(ctx, opts)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Fprintln(os.Stderr, "db-diff: interrupted")

			return exitFailure
		}
		fmt.Fprintf(os.Stderr, "db-diff: %v\n", err)

		return exitFailure
	}

	if len(ids) == 0 {
		fmt.Printf("no differences in %s\n", opts.table)

		return exitClean
	}

	fmt.Printf("%d differing rows in %s:\n", len(ids), opts.table)
	for _, id := range ids {
		fmt.Println(id)
	}

	return exitDiffers
}

func parseFlags(out *os.File) (options, error) {
	var opts options

	fs := newFlagSet(out, &opts)

	if err := fs.Parse(os.Args[1:]); err != nil {
		return options{}, err
	}

	return validate(opts, fs)
}

func newFlagSet(out *os.File, opts *options) *flag.FlagSet {
	fs := flag.NewFlagSet("db-diff", flag.ContinueOnError)
	fs.SetOutput(out)
	fs.Usage = func() {
		fmt.Fprintf(out, usageHeader)
		fs.PrintDefaults()
		fmt.Fprintf(out, usageFooter)
	}

	fs.StringVar(&opts.source, "source", "", "source database connection string (required)")
	fs.StringVar(&opts.target, "target", "", "target database connection string (required)")
	fs.StringVar(&opts.table, "table", "", "name of the table to compare (required)")
	fs.StringVar(&opts.exclude, "exclude", "", "comma separated list of columns to exclude from the comparison")
	fs.StringVar(&opts.include, "include", "", "comma separated list of columns to include in the comparison")
	fs.Int64Var(&opts.segmentSize, "segment-size", defaultChunk, "number of primary keys to checksum per query")
	fs.BoolVar(&opts.showVersion, "version", false, "print the version and exit")

	return fs
}

// validate enforces what the command line has to satisfy before anything is
// opened, so a mistake fails with a message rather than a connection error.
func validate(opts options, fs *flag.FlagSet) (options, error) {
	if opts.showVersion {
		return opts, nil
	}
	if fs.NArg() > 0 {
		return options{}, fmt.Errorf("unexpected argument %q", fs.Arg(0))
	}
	if opts.source == "" || opts.target == "" || opts.table == "" {
		return options{}, errors.New("--source, --target and --table are all required")
	}
	if opts.include != "" && opts.exclude != "" {
		return options{}, errors.New("--include and --exclude cannot be used together")
	}
	if opts.segmentSize <= 0 {
		return options{}, errors.New("--segment-size must be greater than zero")
	}

	return opts, nil
}

const usageHeader = `db-diff compares the rows of one table across two databases.

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

const usageFooter = `
Exit codes:
  0  the tables match
  1  the tables differ
  2  db-diff could not complete the comparison

Examples:
  db-diff --source "$SRC" --target "$DST" --table orders
  db-diff --source "$SRC" --target "$DST" --table orders --exclude updated_at,raw_payload
`

func diffTable(ctx context.Context, opts options) ([]int64, error) {
	// The checksum has to be computed the same way on both sides, and each
	// engine renders its values its own way, so comparing across engines would
	// report differences that do not exist. Checked before connecting, so the
	// refusal does not depend on either database being reachable.
	sourceDialect, _, err := dialectFor(opts.source)
	if err != nil {
		return nil, err
	}
	targetDialect, _, err := dialectFor(opts.target)
	if err != nil {
		return nil, err
	}
	if sourceDialect != targetDialect {
		return nil, fmt.Errorf(
			"cannot compare %s against %s: both databases must run the same engine",
			sourceDialect, targetDialect)
	}

	_, source, err := openSource(opts.source)
	if err != nil {
		return nil, fmt.Errorf("connect to source: %w", err)
	}
	defer closeSource(source, "source")

	_, target, err := openSource(opts.target)
	if err != nil {
		return nil, fmt.Errorf("connect to target: %w", err)
	}
	defer closeSource(target, "target")

	columns, err := diff.GetColumnNames(
		ctx, source, opts.table, splitColumns(opts.include), splitColumns(opts.exclude))
	if err != nil {
		return nil, err
	}

	// The target has to expose the same columns under the same names and in the
	// same order. The digest folds columns in the order it is given, so a
	// different layout would otherwise surface as every row having changed.
	targetColumns, err := target.GetColumnNames(ctx, opts.table)
	if err != nil {
		return nil, fmt.Errorf("table %s on the target: %w", opts.table, err)
	}
	if err := diff.ValidateSameColumns(opts.table, opts.table, columns, targetColumns); err != nil {
		return nil, err
	}

	// Each side carries its own table name. Sharing one struct between the two
	// would let the target checksum read the source table, and the comparison
	// would report no differences no matter what the data is.
	table := &diff.Table{Name: opts.table, Columns: columns}

	runner := differ.Runner{
		Source:      source,
		Target:      target,
		Table:       table,
		SegmentSize: opts.segmentSize,
	}

	return runner.Run(ctx)
}

func splitColumns(value string) []string {
	if value == "" {
		return nil
	}

	parts := strings.Split(value, ",")
	columns := make([]string, 0, len(parts))
	for _, part := range parts {
		column := strings.TrimSpace(part)
		if column != "" {
			columns = append(columns, column)
		}
	}

	return columns
}

// openSource picks the dialect from the DSN and returns it alongside the
// source, because the caller has to check that both sides agree.
func openSource(dsn string) (string, diff.Source, error) {
	driverName, wrap, err := dialectFor(dsn)
	if err != nil {
		return "", nil, err
	}

	db, err := sql.Open(driverName, dsn)
	if err != nil {
		return "", nil, err
	}

	source := wrap(db)
	if err := source.Ping(driverName); err != nil {
		// The connection is unusable, so nothing else will succeed. Report it
		// here rather than as the first symptom of a query much later on.
		_ = db.Close()

		return "", nil, err
	}

	return driverName, source, nil
}

func dialectFor(dsn string) (string, func(*sql.DB) diff.Source, error) {
	switch {
	case strings.HasPrefix(dsn, "postgres://"), strings.HasPrefix(dsn, "postgresql://"):
		return "postgres", func(db *sql.DB) diff.Source { return pg.NewDiffSource(db) }, nil
	case strings.HasPrefix(dsn, "clickhouse://"), strings.HasPrefix(dsn, "tcp://"):
		return "clickhouse", func(db *sql.DB) diff.Source { return clickhouse.NewDiffSource(db) }, nil
	case strings.Contains(dsn, "@tcp("), strings.Contains(dsn, "@unix("):
		return "mysql", func(db *sql.DB) diff.Source { return mysql.NewDiffSource(db) }, nil
	default:
		return "", nil, fmt.Errorf(
			"cannot tell the dialect of %q: expected a postgres://, clickhouse:// or MySQL DSN", dsn)
	}
}

func closeSource(source diff.Source, side string) {
	if err := source.Close(); err != nil {
		log.Warn("could not close connection", "side", side, "error", err)
	}
}
