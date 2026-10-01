// Package cli holds the db-diff command line.
//
// It lives in a library rather than in package main so a caller can embed it.
// A Go main package cannot be imported, so a downstream layer — one that adds,
// say, a dialect that renders canonical values for cross engine comparison —
// would otherwise have to copy the command line and let the two drift.
package cli

import (
	"context"
	"database/sql"
	"errors"
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

// Exit codes. A diff is a result, not an error, so it gets its own code: a CI
// job can tell "the tables differ" apart from "the tool could not run".
const (
	// ExitClean means the tables match.
	ExitClean = 0
	// ExitDiffers means the tables differ.
	ExitDiffers = 1
	// ExitFailure means the comparison could not be completed.
	ExitFailure = 2
)

// Options configures one run. The zero value is not usable: SourceDSN,
// TargetDSN and Table are required.
type Options struct {
	// SourceDSN and TargetDSN are the connection strings. The dialect is
	// inferred from each.
	SourceDSN string
	TargetDSN string
	// Table is the table to compare, present on both sides under this name.
	Table string
	// Include and Exclude select the compared columns. They are mutually
	// exclusive.
	Include string
	Exclude string
	// SegmentSize is how many primary keys one checksum covers. Zero means the
	// engine default.
	SegmentSize int64

	// DialectFor overrides how a DSN becomes a Source, which is the seam a
	// caller uses to supply its own dialect. Nil means the public dialects.
	DialectFor func(dsn string) (Dialect, error)
	// AllowCrossEngine permits a source and a target that resolve to different
	// dialects. The public tool refuses them: engines render values their own
	// way, so the checksums only agree when both sides compute them the same
	// way. A caller that supplies canonical dialects can allow it.
	AllowCrossEngine bool
}

// Dialect names an engine and opens a Source for it.
type Dialect struct {
	// Name identifies the engine, and is what the cross engine check compares.
	Name string
	// Open builds a Source over an already opened connection.
	Open func(db *sql.DB) diff.Source
}

// Run executes the command line over args and returns the process exit code.
//
// It does not call os.Exit, so a caller keeps control of teardown and of how
// the code becomes an exit status.
func Run(ctx context.Context, version string, args []string, opts Options) int {
	parsed, err := parseFlags(args, opts, os.Stdout)
	if err != nil {
		if errors.Is(err, errHelp) {
			return ExitClean
		}
		fmt.Fprintf(os.Stderr, "db-diff: %v\n", err)

		return ExitFailure
	}
	if parsed.showVersion {
		fmt.Printf("db-diff %s\n", version)

		return ExitClean
	}

	ids, err := diffTable(ctx, parsed)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			fmt.Fprintln(os.Stderr, "db-diff: interrupted")

			return ExitFailure
		}
		fmt.Fprintf(os.Stderr, "db-diff: %v\n", err)

		return ExitFailure
	}

	if len(ids) == 0 {
		fmt.Printf("no differences in %s\n", parsed.Table)

		return ExitClean
	}

	fmt.Printf("%d differing rows in %s:\n", len(ids), parsed.Table)
	for _, id := range ids {
		fmt.Println(id)
	}

	return ExitDiffers
}

// RunFromArgs is Run with args taken from os.Args, and with SIGINT wired to
// context cancellation so a query in flight is abandoned rather than waited on.
func RunFromArgs(version string, opts Options) int {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	return Run(ctx, version, os.Args[1:], opts)
}

// resolved is the parsed and validated command line.
type resolved struct {
	Options

	showVersion bool
}

func diffTable(ctx context.Context, opts resolved) ([]int64, error) {
	sourceDialect, targetDialect, err := resolveDialects(opts)
	if err != nil {
		return nil, err
	}

	source, err := openSource(opts.SourceDSN, sourceDialect)
	if err != nil {
		return nil, fmt.Errorf("connect to source: %w", err)
	}
	defer closeSource(source, "source")

	target, err := openSource(opts.TargetDSN, targetDialect)
	if err != nil {
		return nil, fmt.Errorf("connect to target: %w", err)
	}
	defer closeSource(target, "target")

	columns, err := diff.GetColumnNames(
		ctx, source, opts.Table, splitColumns(opts.Include), splitColumns(opts.Exclude))
	if err != nil {
		return nil, err
	}

	// The target has to expose the same columns under the same names and in the
	// same order. The digest folds columns in the order it is given, so a
	// different layout would otherwise surface as every row having changed.
	targetColumns, err := target.GetColumnNames(ctx, opts.Table)
	if err != nil {
		return nil, fmt.Errorf("table %s on the target: %w", opts.Table, err)
	}
	if err := diff.ValidateSameColumns(opts.Table, opts.Table, columns, targetColumns); err != nil {
		return nil, err
	}

	// Each side carries its own table name. Sharing one struct between the two
	// would let the target checksum read the source table, and the comparison
	// would report no differences no matter what the data is.
	table := &diff.Table{Name: opts.Table, Columns: columns}

	runner := differ.Runner{
		Source:      source,
		Target:      target,
		Table:       table,
		SegmentSize: opts.SegmentSize,
	}

	return runner.Run(ctx)
}

// resolveDialects picks the dialect for each side and refuses a cross engine
// pair unless the caller allows one.
//
// The refusal happens before connecting, so it does not depend on either
// database being reachable. It exists because each engine renders its values
// its own way: comparing across engines would report differences that are not
// there. A caller supplying canonical dialects sets AllowCrossEngine.
func resolveDialects(opts resolved) (Dialect, Dialect, error) {
	dialectFor := opts.DialectFor
	if dialectFor == nil {
		dialectFor = defaultDialectFor
	}

	sourceDialect, err := dialectFor(opts.SourceDSN)
	if err != nil {
		return Dialect{}, Dialect{}, err
	}
	targetDialect, err := dialectFor(opts.TargetDSN)
	if err != nil {
		return Dialect{}, Dialect{}, err
	}
	if sourceDialect.Name != targetDialect.Name && !opts.AllowCrossEngine {
		return Dialect{}, Dialect{}, fmt.Errorf(
			"cannot compare %s against %s: both databases must run the same engine",
			sourceDialect.Name, targetDialect.Name)
	}

	return sourceDialect, targetDialect, nil
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

func openSource(dsn string, dialect Dialect) (diff.Source, error) {
	db, err := sql.Open(driverName(dialect.Name), dsn)
	if err != nil {
		return nil, err
	}

	source := dialect.Open(db)
	if err := source.Ping(dialect.Name); err != nil {
		// The connection is unusable, so nothing else will succeed. Report it
		// here rather than as the first symptom of a query much later on.
		_ = db.Close()

		return nil, err
	}

	return source, nil
}

// defaultDialectFor infers the engine from the DSN.
func defaultDialectFor(dsn string) (Dialect, error) {
	switch {
	case strings.HasPrefix(dsn, "postgres://"), strings.HasPrefix(dsn, "postgresql://"):
		return Dialect{Name: "postgres", Open: func(db *sql.DB) diff.Source { return pg.NewDiffSource(db) }}, nil
	case strings.HasPrefix(dsn, "clickhouse://"), strings.HasPrefix(dsn, "tcp://"):
		return Dialect{
			Name: "clickhouse",
			Open: func(db *sql.DB) diff.Source { return clickhouse.NewDiffSource(db) },
		}, nil
	case strings.Contains(dsn, "@tcp("), strings.Contains(dsn, "@unix("):
		return Dialect{Name: "mysql", Open: func(db *sql.DB) diff.Source { return mysql.NewDiffSource(db) }}, nil
	default:
		return Dialect{}, fmt.Errorf(
			"cannot tell the dialect of %q: expected a postgres://, clickhouse:// or MySQL DSN", dsn)
	}
}

// driverName maps a dialect name to its database/sql driver.
func driverName(dialect string) string {
	switch dialect {
	case "postgres":
		return "postgres"
	case "mysql":
		return "mysql"
	default:
		return "clickhouse"
	}
}

func closeSource(source diff.Source, side string) {
	if err := source.Close(); err != nil {
		log.Warn("could not close connection", "side", side, "error", err)
	}
}
