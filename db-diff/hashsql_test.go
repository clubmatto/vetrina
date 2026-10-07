package main

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"

	"matto.club/vetrina/db-diff/clickhouse"
	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/mysql"
	"matto.club/vetrina/db-diff/pg"
)

// TestNativePathMatchesTheExportedBuilders pins the refactor that moved the
// checksum shape behind an exported API. The dialect methods have to produce
// exactly what they produced before, which is what the golden and conformance
// tests cover end to end; this covers it at the string level, where a failure
// says which builder drifted.
func TestNativePathMatchesTheExportedBuilders(t *testing.T) {
	columns := []string{"id", "payload", "note"}
	table := "orders"
	idRange := diff.IDRange{Min: 1, Max: 100}

	engines := []struct {
		name    string
		dialect diff.Dialect
		chunk   func(string, []diff.ColumnExpr, diff.IDRange) string
		rows    func(string, []diff.ColumnExpr, diff.IDRange) string
		native  func([]string) []diff.ColumnExpr
	}{
		{"postgres", &pg.Dialect{}, pg.ChunkHashSQL, pg.RowsHashSQL, pg.NativeColumns},
		{"mysql", &mysql.Dialect{}, mysql.ChunkHashSQL, mysql.RowsHashSQL, mysql.NativeColumns},
		{"clickhouse", &clickhouse.Dialect{}, clickhouse.ChunkHashSQL, clickhouse.RowsHashSQL, clickhouse.NativeColumns},
	}

	for _, engine := range engines {
		t.Run(engine.name, func(t *testing.T) {
			assert.Equal(t,
				engine.dialect.GetChunkHashSQL(table, columns, idRange),
				engine.chunk(table, engine.native(columns), idRange),
				"the chunk query must be unchanged")

			assert.Equal(t,
				engine.dialect.GetRowsHashSQL(table, columns, idRange),
				engine.rows(table, engine.native(columns), idRange),
				"the rows query must be unchanged")
		})
	}
}

// TestValueDoesNotChangeTheNullBitmap pins the reason ColumnExpr carries the
// name separately from the value. A rendering may map NULL to a value of its
// own, so the bitmap has to ask about the column, not about the rendering.
func TestValueDoesNotChangeTheNullBitmap(t *testing.T) {
	// A rendering that never produces NULL, which is exactly the shape a
	// canonical boolean encoding has.
	rendering := []diff.ColumnExpr{{Name: "flag", Value: "SOMETHING(flag)"}}

	engines := []struct {
		name      string
		chunk     func(string, []diff.ColumnExpr, diff.IDRange) string
		nullCheck string
	}{
		{"postgres", pg.ChunkHashSQL, `"flag" IS NULL`},
		{"mysql", mysql.ChunkHashSQL, "`flag` IS NULL"},
		{"clickhouse", clickhouse.ChunkHashSQL, `isNull("flag")`},
	}

	for _, engine := range engines {
		t.Run(engine.name, func(t *testing.T) {
			sql := engine.chunk("t", rendering, diff.IDRange{Min: 1, Max: 2})

			assert.Contains(t, sql, engine.nullCheck,
				"the bitmap must test the column, not the rendering")
			assert.Contains(t, sql, "SOMETHING(flag)",
				"the value expression must be what gets hashed")
		})
	}
}

// TestCallerExpressionsActuallyChangeTheHash is the point of the seam: a caller
// that renders values differently gets a different checksum.
func TestCallerExpressionsActuallyChangeTheHash(t *testing.T) {
	native := pg.ChunkHashSQL("t", pg.NativeColumns([]string{"v"}), diff.IDRange{Min: 1, Max: 2})
	canonical := pg.ChunkHashSQL("t", []diff.ColumnExpr{
		{Name: "v", Value: "trim_scale(v)::text"},
	}, diff.IDRange{Min: 1, Max: 2})

	assert.NotEqual(t, native, canonical, "a different rendering must change the query")
	assert.False(t, strings.Contains(canonical, "md5(COALESCE(\"v\"::text"),
		"the canonical rendering must replace the native one")
}
