// Package integration_test holds the tests that need real database engines.
//
// They all follow the same shape: start two containers per dialect, build the
// same table with fixtures every engine can express, then assert on what the
// diff reports. The suite drives the same runner the binary uses, so a dialect
// cannot pass by accident.
package integration_test

import (
	"context"
	"crypto/md5"
	"database/sql"
	"encoding/hex"
	"fmt"
	"strconv"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"matto.club/vetrina/db-diff/clickhouse"
	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/differ"
	"matto.club/vetrina/db-diff/mysql"
	"matto.club/vetrina/db-diff/pg"
	"matto.club/vetrina/db-diff/testutil"
)

// fixtureRow is one row of the portable fixture table. Note is a pointer so a
// test can tell a NULL apart from the empty string.
type fixtureRow struct {
	ID      int64
	Label   string
	Stage   string
	Amount  int64
	Payload string
	Note    *string
}

// literals renders the row as a VALUES tuple in the dialect under test.
// Postgres needs the casts because bare literals are typed as unknown, and
// ClickHouse needs them because a String literal does not fit a Nullable
// column on its own.
func (r fixtureRow) literals(dialect string) string {
	note := "NULL"
	if r.Note != nil {
		note = testutil.QuoteString(*r.Note)
	}

	stringValue := func(value string) string {
		quoted := testutil.QuoteString(value)
		switch dialect {
		case "postgres":
			return quoted + "::text"
		case "clickhouse":
			return "toNullable(" + quoted + ")"
		default:
			return quoted
		}
	}

	switch dialect {
	case "postgres":
		return fmt.Sprintf("%d, %s, %s, %d, %s, %s::text",
			r.ID, stringValue(r.Label), stringValue(r.Stage), r.Amount,
			stringValue(r.Payload), note)
	case "mysql":
		return fmt.Sprintf("%d, %s, %s, %d, %s, %s",
			r.ID, stringValue(r.Label), stringValue(r.Stage), r.Amount,
			stringValue(r.Payload), note)
	default:
		amount := fmt.Sprintf("toNullable(%d)", r.Amount)

		return fmt.Sprintf("%d, %s, %s, %s, %s, toNullable(%s)",
			r.ID, stringValue(r.Label), stringValue(r.Stage), amount,
			stringValue(r.Payload), note)
	}
}

// TestConformance runs the checksum contract and the diff semantics against
// every dialect. Every assertion here is engine independent, so a dialect that
// fails is a dialect that is wrong.
func TestConformance(t *testing.T) {
	if testing.Short() {
		t.Skip("conformance tests need containers")
	}

	for _, backend := range testutil.Backends() {
		t.Run(backend.Name, func(t *testing.T) {
			// Two containers, one per side: a diff between two databases is
			// what the tool does, and giving both sides the same database would
			// make every case trivially equal.
			sourceDB := backend.Start(t)
			targetDB := backend.Start(t)

			source := openSource(t, backend.Name, sourceDB.DSN)
			target := openSource(t, backend.Name, targetDB.DSN)

			runChecksumContract(t, sourceDB, source)
			runDiffSemantics(t, sourceDB, targetDB, source, target)
			runHashEdgeCases(t, sourceDB, source)
		})
	}
}

// runDiffSemantics covers what the tool reports for a pair of databases holding
// the same table.
func runDiffSemantics(
	t *testing.T,
	sourceDB, targetDB *testutil.Database,
	source, target diff.Source,
) {
	dialect := sourceDB.Name

	anchor := fixtureRow{ID: 1, Label: "anchor", Stage: "new", Amount: 1, Payload: "anchor", Note: nil}

	cases := []struct {
		name         string
		sourceRows   []fixtureRow
		targetRows   []fixtureRow
		segmentSize  int64
		wantDiffered []int64
	}{
		{
			name: "identical tables have no differences",
			sourceRows: []fixtureRow{
				{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: ptr("first")},
				{ID: 2, Label: "two", Stage: "done", Amount: 20, Payload: "b", Note: nil},
				{ID: 3, Label: "three", Stage: "new", Amount: 30, Payload: "c", Note: ptr("")},
			},
			targetRows: []fixtureRow{
				{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: ptr("first")},
				{ID: 2, Label: "two", Stage: "done", Amount: 20, Payload: "b", Note: nil},
				{ID: 3, Label: "three", Stage: "new", Amount: 30, Payload: "c", Note: ptr("")},
			},
			wantDiffered: nil,
		},
		{
			name: "a changed value is reported",
			sourceRows: []fixtureRow{
				{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
				{ID: 2, Label: "changed", Stage: "new", Amount: 20, Payload: "b", Note: nil},
			},
			targetRows: []fixtureRow{
				{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
				{ID: 2, Label: "original", Stage: "new", Amount: 20, Payload: "b", Note: nil},
			},
			wantDiffered: []int64{2},
		},
		{
			name:       "a row missing from the target is reported",
			sourceRows: []fixtureRow{anchor, {ID: 2, Label: "only-in-source", Stage: "new", Amount: 2, Payload: "s", Note: nil}},
			// The anchor keeps the target's MIN/MAX span aligned with the
			// source, so the missing row is exercised rather than the range.
			targetRows:   []fixtureRow{anchor},
			wantDiffered: []int64{2},
		},
		{
			name:       "a row missing from the source is reported",
			sourceRows: []fixtureRow{anchor},
			targetRows: []fixtureRow{
				anchor,
				{ID: 2, Label: "only-in-target", Stage: "new", Amount: 2, Payload: "t", Note: nil},
			},
			wantDiffered: []int64{2},
		},
		{
			// The target holds a row below the source's lowest key. A loop that
			// only walks the source's own range never puts that row in a
			// predicate, so it is never reported. A zero id cannot be the
			// fixture here: MySQL rewrites an explicit 0 on an AUTO_INCREMENT
			// column.
			name: "a target row below the source range is reported",
			sourceRows: []fixtureRow{
				{ID: 5, Label: "five", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "six", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
			},
			targetRows: []fixtureRow{
				{ID: 1, Label: "below", Stage: "new", Amount: 1, Payload: "p1", Note: nil},
				{ID: 5, Label: "five", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "six", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
			},
			wantDiffered: []int64{1},
		},
		{
			name: "a target row above the source range is reported",
			sourceRows: []fixtureRow{
				{ID: 5, Label: "five", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "six", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
			},
			targetRows: []fixtureRow{
				{ID: 5, Label: "five", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "six", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
				{ID: 99, Label: "above", Stage: "new", Amount: 99, Payload: "p99", Note: nil},
			},
			wantDiffered: []int64{99},
		},
		{
			// A one-row source next to a one-row target at a higher id: the
			// ranges do not overlap at all.
			name:         "disjoint ranges are reported",
			sourceRows:   []fixtureRow{{ID: 5, Label: "source", Stage: "new", Amount: 5, Payload: "s", Note: nil}},
			targetRows:   []fixtureRow{{ID: 9, Label: "target", Stage: "new", Amount: 9, Payload: "t", Note: nil}},
			wantDiffered: []int64{5, 9},
		},
		{
			name:       "an empty source is not a clean result",
			sourceRows: nil,
			targetRows: []fixtureRow{
				{ID: 1, Label: "row-in-target", Stage: "new", Amount: 1, Payload: "t", Note: nil},
				{ID: 2, Label: "another", Stage: "new", Amount: 2, Payload: "t", Note: nil},
			},
			wantDiffered: []int64{1, 2},
		},
		{
			name: "an empty target is not a clean result",
			sourceRows: []fixtureRow{
				{ID: 1, Label: "row-in-source", Stage: "new", Amount: 1, Payload: "s", Note: nil},
				{ID: 2, Label: "another", Stage: "new", Amount: 2, Payload: "s", Note: nil},
			},
			targetRows:   nil,
			wantDiffered: []int64{1, 2},
		},
		{
			name:       "a changed value plus a missing row are both reported",
			sourceRows: []fixtureRow{anchor, {ID: 3, Label: "only-in-source", Stage: "new", Amount: 3, Payload: "s", Note: nil}},
			targetRows: []fixtureRow{
				{ID: 1, Label: "anchor", Stage: "new", Amount: 1, Payload: "DIFFERENT", Note: nil},
				{ID: 2, Label: "only-in-target", Stage: "new", Amount: 2, Payload: "t", Note: nil},
			},
			wantDiffered: []int64{1, 2, 3},
		},
		{
			name: "values in different columns do not cancel out",
			sourceRows: []fixtureRow{
				{ID: 1, Label: "a", Stage: "b", Amount: 1, Payload: "x", Note: nil},
				{ID: 2, Label: "ab", Stage: "", Amount: 1, Payload: "x", Note: nil},
			},
			targetRows: []fixtureRow{
				{ID: 1, Label: "ab", Stage: "", Amount: 1, Payload: "x", Note: nil},
				{ID: 2, Label: "a", Stage: "b", Amount: 1, Payload: "x", Note: nil},
			},
			// Both rows hold the same values, just moved between columns, so
			// hashing concatenated values would call these tables equal. They
			// are not equal: row 1 changed.
			wantDiffered: []int64{1, 2},
		},
		{
			name: "differences in different segments are all reported",
			sourceRows: []fixtureRow{
				{ID: 1, Label: "a", Stage: "new", Amount: 1, Payload: "p1", Note: nil},
				{ID: 2, Label: "b", Stage: "new", Amount: 2, Payload: "p2", Note: nil},
				{ID: 3, Label: "c", Stage: "new", Amount: 3, Payload: "p3", Note: nil},
				{ID: 4, Label: "d", Stage: "new", Amount: 4, Payload: "p4", Note: nil},
				{ID: 5, Label: "e", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "f", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
				{ID: 7, Label: "g", Stage: "new", Amount: 7, Payload: "p7", Note: nil},
			},
			targetRows: []fixtureRow{
				{ID: 1, Label: "a", Stage: "new", Amount: 1, Payload: "p1", Note: nil},
				{ID: 2, Label: "b", Stage: "new", Amount: 2, Payload: "CHANGED", Note: nil},
				{ID: 3, Label: "c", Stage: "new", Amount: 3, Payload: "p3", Note: nil},
				{ID: 4, Label: "d", Stage: "new", Amount: 4, Payload: "p4", Note: nil},
				{ID: 5, Label: "e", Stage: "new", Amount: 5, Payload: "p5", Note: nil},
				{ID: 6, Label: "f", Stage: "new", Amount: 6, Payload: "p6", Note: nil},
				{ID: 7, Label: "g", Stage: "new", Amount: 7, Payload: "CHANGED", Note: nil},
			},
			// A segment size of 3 puts id 2 and id 7 in the first and the last
			// segment, so a loop that stops early loses the last one.
			segmentSize:  3,
			wantDiffered: []int64{2, 7},
		},
	}

	for i, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			// The runner addresses one table name on both sides, so each case
			// holds the two data sets in the same table on the two databases.
			// Each case gets its own table name to stay independent.
			table := fmt.Sprintf("semantics_%d", i)
			buildTable(t, sourceDB, dialect, table, tc.sourceRows)
			buildTable(t, targetDB, dialect, table, tc.targetRows)

			segmentSize := tc.segmentSize
			if segmentSize == 0 {
				segmentSize = 10000
			}

			got := diffTables(t, source, target, table, table, segmentSize)
			require.Len(t, got, len(tc.wantDiffered), "differing ids: %v", got)
			for i, want := range tc.wantDiffered {
				require.Equal(t, want, got[i])
			}
		})
	}
}

// runHashEdgeCases pins down the parts of the checksum contract the diff
// semantics do not reach.
func runHashEdgeCases(t *testing.T, container *testutil.Database, source diff.Source) {
	dialect := container.Name
	ctx := context.Background()

	t.Run("an empty table is reported as empty", func(t *testing.T) {
		table := "hash_empty_table"
		container.Exec(t, tableSchema(dialect, table))

		_, _, empty, err := source.GetMinMax(ctx, table)
		require.NoError(t, err)
		require.True(t, empty, "an empty table has to be reported as empty")
	})

	t.Run("a table holding one row is not reported as empty", func(t *testing.T) {
		// The row has to be non-empty to catch a bounds check that reads
		// "MIN and MAX are 0" as "the table is empty". MySQL also rewrites an
		// explicit id of 0 to 1 on an AUTO_INCREMENT column, so 0 is not a
		// portable fixture value.
		table := "hash_single_row"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 1, Payload: "z", Note: nil},
		}))

		minID, maxID, empty, err := source.GetMinMax(ctx, table)
		require.NoError(t, err)
		require.False(t, empty, "a table with a row has to be reported as non-empty")
		require.EqualValues(t, 1, minID)
		require.EqualValues(t, 1, maxID)
	})

	t.Run("a NULL and an empty string hash differently", func(t *testing.T) {
		// NULL and the empty string are different data. A column that is NULL
		// on one side and empty on the other is the classic replication
		// artifact, and reporting it as equal is a false negative.
		table := "hash_null_and_empty"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "same", Stage: "same", Amount: 1, Payload: "same", Note: nil},
		}))

		nullHash := hashOfRow(t, source, table, 1)
		container.Exec(t, updateStatement(dialect, table, 1, "note", ""))

		require.NotEqual(t, nullHash, hashOfRow(t, source, table, 1))
	})

	t.Run("the chunk hash is stable across runs", func(t *testing.T) {
		table := "hash_stable"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
			{ID: 2, Label: "two", Stage: "done", Amount: 20, Payload: "b", Note: nil},
		}))

		metadata := tableInfo(t, source, table)
		idRange := diff.IDRange{Min: 1, Max: 2}

		first, err := source.GetChunkHash(ctx, metadata, idRange)
		require.NoError(t, err)
		second, err := source.GetChunkHash(ctx, metadata, idRange)
		require.NoError(t, err)

		require.Equal(t, first.Hash, second.Hash)
	})

	t.Run("an empty range hashes to the zero fold", func(t *testing.T) {
		table := "hash_empty_range"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
		}))

		chunk, err := source.GetChunkHash(ctx, tableInfo(t, source, table), diff.IDRange{Min: 100, Max: 200})
		require.NoError(t, err)
		require.Equal(t, "0000000000000000", chunk.Hash)
	})

	t.Run("a different column layout is rejected", func(t *testing.T) {
		table := "hash_layout"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
		}))

		columns := tableInfo(t, source, table).Columns
		reversed := make([]string, len(columns))
		for i, column := range columns {
			reversed[len(columns)-1-i] = column
		}

		require.NoError(t, diff.ValidateSameColumns(table, table, columns, columns))
		require.Error(t, diff.ValidateSameColumns(table, table, columns, reversed))
	})

	t.Run("dropping a column changes the checksum", func(t *testing.T) {
		table := "hash_dropped_column"
		container.Exec(t, tableSchema(dialect, table))
		container.Exec(t, insertStatement(dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
		}))

		metadata := tableInfo(t, source, table)
		withoutNote, err := diff.GetColumnNames(ctx, source, table, nil, []string{"note"})
		require.NoError(t, err)
		require.NotContains(t, withoutNote, "note")

		before, err := source.GetChunkHash(ctx, metadata, diff.IDRange{Min: 1, Max: 1})
		require.NoError(t, err)
		after, err := source.GetChunkHash(
			ctx, &diff.Table{Name: table, Columns: withoutNote}, diff.IDRange{Min: 1, Max: 1})
		require.NoError(t, err)

		require.NotEqual(t, before.Hash, after.Hash)
	})
}

// runChecksumContract asserts the relationship between the two queries: the
// chunk checksum has to be the XOR fold of the row checksums it covers. That
// relationship is what lets the tool trust "the hashes match" without pulling
// any rows.
func runChecksumContract(t *testing.T, container *testutil.Database, source diff.Source) {
	ctx := context.Background()
	dialect := container.Name

	t.Run("chunk hash is the fold of the row hashes", func(t *testing.T) {
		table := "contract_rows"
		rows := []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: ptr("n")},
			{ID: 2, Label: "two", Stage: "done", Amount: 20, Payload: "b", Note: nil},
			{ID: 3, Label: "three", Stage: "new", Amount: 30, Payload: "c", Note: ptr("n")},
			{ID: 4, Label: "four", Stage: "done", Amount: 40, Payload: "d", Note: nil},
			{ID: 5, Label: "five", Stage: "new", Amount: 50, Payload: "e", Note: ptr("")},
		}
		buildTable(t, container, dialect, table, rows)
		metadata := tableInfo(t, source, table)
		idRange := diff.IDRange{Min: 1, Max: 5}

		chunk, err := source.GetChunkHash(ctx, metadata, idRange)
		require.NoError(t, err)

		rowHashes, err := source.GetRowsHash(ctx, metadata, idRange)
		require.NoError(t, err)
		require.Len(t, rowHashes, len(rows))

		require.Equal(t, foldHashes(t, rowHashes), chunk.Hash,
			"the chunk hash has to be the XOR fold of the row hashes it covers")
	})

	t.Run("row hashes are 16 hex digits", func(t *testing.T) {
		table := "contract_shape"
		buildTable(t, container, dialect, table, []fixtureRow{
			{ID: 1, Label: "one", Stage: "new", Amount: 10, Payload: "a", Note: nil},
		})
		metadata := tableInfo(t, source, table)

		rowHashes, err := source.GetRowsHash(ctx, metadata, diff.IDRange{Min: 1, Max: 1})
		require.NoError(t, err)

		for id, hash := range rowHashes {
			require.Len(t, hash, 16, "row %d hash %q", id, hash)
			require.Regexp(t, "^[0-9a-f]{16}$", hash, "row %d hash %q", id, hash)
		}
	})
}

// diffTables runs the comparison the binary runs, through the same package, on
// two tables of the same engine.
func diffTables(
	t *testing.T,
	source, target diff.Source,
	sourceTable, targetTable string,
	segmentSize int64,
) []int64 {
	t.Helper()

	// The runner addresses one table name on both sides, which is what the
	// binary does, so the fixtures give both sides the same name.
	table := tableInfo(t, source, sourceTable)
	require.Equal(t, sourceTable, targetTable, "fixtures compare one table name on both sides")

	runner := differ.Runner{
		Source:      source,
		Target:      target,
		Table:       table,
		SegmentSize: segmentSize,
	}

	ids, err := runner.Run(context.Background())
	require.NoError(t, err)

	return ids
}

// foldHashes reproduces the accumulator the dialects compute in SQL: the XOR of
// every 64 bit row hash, rendered as 16 lowercase hex digits.
func foldHashes(t *testing.T, rowHashes map[int64]string) string {
	t.Helper()

	var accumulator uint64
	for id, hash := range rowHashes {
		value, err := parseRowHash(hash)
		require.NoErrorf(t, err, "row %d hash %q", id, hash)
		accumulator ^= value
	}

	return fmt.Sprintf("%016x", accumulator)
}

// parseRowHash reads the 16 hex digits of a row checksum. The width matters:
// strconv rejects a longer string, where fmt.Sscanf silently truncated it.
func parseRowHash(hash string) (uint64, error) {
	if len(hash) != 16 {
		return 0, fmt.Errorf("expected 16 hex digits, got %d in %q", len(hash), hash)
	}

	return strconv.ParseUint(hash, 16, 64)
}

func buildTable(
	t *testing.T,
	container *testutil.Database,
	dialect, table string,
	rows []fixtureRow,
) {
	t.Helper()

	container.Exec(t, tableSchema(dialect, table))
	if len(rows) > 0 {
		container.Exec(t, insertStatement(dialect, table, rows))
	}
}

// tableSchema returns the same logical table expressed in each dialect. One
// schema for all three is what makes the results comparable.
func tableSchema(dialect, table string) string {
	identifier := quoteIdentifier(dialect, table)

	switch dialect {
	case "postgres":
		return fmt.Sprintf(`CREATE TABLE %s (
			id      BIGSERIAL PRIMARY KEY,
			label   TEXT,
			stage   TEXT,
			amount  INT,
			payload TEXT,
			note    TEXT
		)`, identifier)
	case "mysql":
		return fmt.Sprintf(`CREATE TABLE %s (
			id      BIGINT AUTO_INCREMENT PRIMARY KEY,
			label   VARCHAR(255),
			stage   VARCHAR(64),
			amount  INT,
			payload TEXT,
			note    TEXT
		)`, identifier)
	default:
		return fmt.Sprintf(`CREATE TABLE %s (
			id      UInt64,
			label   Nullable(String),
			stage   Nullable(String),
			amount  Nullable(Int64),
			payload Nullable(String),
			note    Nullable(String)
		) ENGINE = MergeTree() ORDER BY id`, identifier)
	}
}

// quoteIdentifier quotes an identifier the way the engine under test expects.
// MySQL reads double quotes as string delimiters unless ANSI_QUOTES is set.
func quoteIdentifier(dialect, name string) string {
	if dialect == "mysql" {
		return "`" + strings.ReplaceAll(name, "`", "``") + "`"
	}

	return testutil.QuoteIdentifier(name)
}

func insertStatement(dialect, table string, rows []fixtureRow) string {
	values := make([]string, len(rows))
	for i, row := range rows {
		values[i] = "(" + row.literals(dialect) + ")"
	}

	statement := ""
	for i, value := range values {
		if i > 0 {
			statement += ", "
		}
		statement += value
	}

	return fmt.Sprintf(
		"INSERT INTO %s (id, label, stage, amount, payload, note) VALUES %s",
		quoteIdentifier(dialect, table), statement)
}

// updateStatement changes one column of one row. ClickHouse has no UPDATE, so
// the equivalent is a synchronous mutation followed by OPTIMIZE.
func updateStatement(dialect, table string, id int64, column, value string) string {
	identifier := quoteIdentifier(dialect, table)
	column = quoteIdentifier(dialect, column)
	literal := testutil.QuoteString(value)

	if dialect == "clickhouse" {
		return fmt.Sprintf(
			"ALTER TABLE %s UPDATE %s = toNullable(%s) WHERE id = %d; OPTIMIZE TABLE %s FINAL",
			identifier, column, literal, id, identifier)
	}

	return fmt.Sprintf("UPDATE %s SET %s = %s WHERE id = %d", identifier, column, literal, id)
}

// tableInfo reads the compared columns of one table, using the same call the
// binary makes.
func tableInfo(t *testing.T, source diff.Source, table string) *diff.Table {
	t.Helper()

	columns, err := diff.GetColumnNames(context.Background(), source, table, nil, nil)
	require.NoError(t, err)

	return &diff.Table{Name: table, Columns: columns}
}

func hashOfRow(t *testing.T, source diff.Source, table string, id int64) string {
	t.Helper()

	metadata := tableInfo(t, source, table)
	hashes, err := source.GetRowsHash(context.Background(), metadata, diff.IDRange{Min: id, Max: id})
	require.NoError(t, err)
	require.Contains(t, hashes, id)

	return hashes[id]
}

func openSource(t *testing.T, dialect, dsn string) diff.Source {
	t.Helper()

	db, err := sql.Open(driverFor(dialect), dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })

	var source diff.Source
	switch dialect {
	case "postgres":
		source = pg.NewDiffSource(db)
	case "mysql":
		source = mysql.NewDiffSource(db)
	default:
		source = clickhouse.NewDiffSource(db)
	}
	require.NoError(t, source.Ping(dialect))

	return source
}

func driverFor(dialect string) string {
	switch dialect {
	case "postgres":
		return "postgres"
	case "mysql":
		return "mysql"
	default:
		return "clickhouse"
	}
}

func ptr(value string) *string { return &value }

// TestGoldenRowHash pins the row checksum to a value computed in Go rather than
// to whatever the database produced.
//
// Every other checksum assertion in this file is self-consistency: it compares a
// dialect against its own output, so a dialect that folds the wrong bytes, drops
// a bit, or uses a different digest entirely still passes. This test is the one
// that can fail when the SQL is consistently wrong. An integer column is used
// because every engine spells an integer the same way as text, which keeps the
// expected value identical across all three.
func TestGoldenRowHash(t *testing.T) {
	if testing.Short() {
		t.Skip("golden checksum tests need containers")
	}

	const (
		table = "golden_row_hash"
		id    = int64(7)
		value = int64(42)
	)

	// The digest the dialects are supposed to compute, built here in Go:
	// md5 over the NULL bitmap ('1', the value is not NULL) followed by the MD5
	// of each column's text, read as its first 8 bytes.
	want := goldenRowHash(t,
		[]string{"id", "value"},
		[]string{"1", "1"},
		[]string{fmt.Sprintf("%d", id), fmt.Sprintf("%d", value)},
	)

	for _, backend := range testutil.Backends() {
		t.Run(backend.Name, func(t *testing.T) {
			container := backend.Start(t)
			source := openSource(t, backend.Name, container.DSN)

			container.Exec(t, fmt.Sprintf(`CREATE TABLE %s (
				id    %s,
				value %s
			)%s`, quoteIdentifier(backend.Name, table),
				integerType(backend.Name), integerType(backend.Name),
				tableEngine(backend.Name)))
			container.Exec(t, fmt.Sprintf(
				"INSERT INTO %s (id, value) VALUES (%d, %d)",
				quoteIdentifier(backend.Name, table), id, value))

			require.Equal(t, want, hashOfRow(t, source, table, id),
				"the database checksum has to match the one computed here")
		})
	}
}

// goldenRowHash builds the expected row checksum from the values, the way
// docs/how-it-works.md describes it.
func goldenRowHash(t *testing.T, columns, bitmap, values []string) string {
	t.Helper()

	require.Len(t, values, len(columns))

	digests := make([]string, len(values))
	for i, value := range values {
		sum := md5.Sum([]byte(value))
		digests[i] = hex.EncodeToString(sum[:])
	}

	joined := strings.Join(bitmap, "") + strings.Join(digests, "")
	sum := md5.Sum([]byte(joined))

	return hex.EncodeToString(sum[:8])
}

// tableEngine is what ClickHouse needs to build a table; the other two dialects
// take no storage clause at all.
func tableEngine(dialect string) string {
	if dialect == "clickhouse" {
		return " ENGINE = MergeTree() ORDER BY id"
	}

	return ""
}

// integerType is a signed integer column in each dialect, chosen so that all
// three render the same value as the same text.
func integerType(dialect string) string {
	if dialect == "clickhouse" {
		return "Int64"
	}

	return "BIGINT"
}
