// Package pg implements the Postgres dialect.
package pg

import (
	"database/sql"
	"fmt"
	"strings"

	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/sqlbuild"
)

// DiffSource is a diff.Source backed by a Postgres connection.
type DiffSource struct {
	*diff.BaseSource
}

func NewDiffSource(db *sql.DB) *DiffSource {
	return &DiffSource{
		BaseSource: &diff.BaseSource{
			Conn:    db,
			Dialect: &Dialect{},
		},
	}
}

// Dialect renders Postgres SQL.
//
// The checksum contract (see diff.Dialect) is implemented with md5(), which
// Postgres has in core, and bigint bitwise XOR, which is an aggregate Postgres
// provides as #. The fold works on the top 16 hex digits of the row digest.
type Dialect struct{}

func (d *Dialect) GetColumnNamesSQL(tableName string) string {
	return fmt.Sprintf(
		`SELECT column_name FROM information_schema.columns
		 WHERE table_name = %s AND table_schema = current_schema()
		 ORDER BY ordinal_position`,
		sqlbuild.Literal(tableName))
}

func (d *Dialect) ScanColumnName(rows *sql.Rows) (string, error) {
	var field string

	err := rows.Scan(&field)

	return field, err
}

func (d *Dialect) GetMinMaxSQL(tableName string) string {
	return fmt.Sprintf("SELECT MIN(id), MAX(id), COUNT(*) FROM %s", sqlbuild.Identifier(tableName))
}

func (d *Dialect) GetChunkHashSQL(tableName string, columns []string, idRange diff.IDRange) string {
	return ChunkHashSQL(tableName, NativeColumns(columns), idRange)
}

func (d *Dialect) GetRowsHashSQL(tableName string, columns []string, idRange diff.IDRange) string {
	return RowsHashSQL(tableName, NativeColumns(columns), idRange)
}

// ChunkHashSQL builds the query that folds a range into one checksum, from
// column expressions.
func ChunkHashSQL(tableName string, columns []diff.ColumnExpr, idRange diff.IDRange) string {
	// bit_xor returns bigint, so an all NULL segment folds to NULL, which the
	// unsigned conversion turns into NULL as well. COALESCE brings it back to
	// the zero fold an empty range compares equal to.
	fold := fmt.Sprintf("COALESCE(bit_xor(%s), 0)", RowHashExpr(columns))

	return fmt.Sprintf(
		"SELECT lpad(%s, 16, '0') FROM %s WHERE %s",
		unsignedHexExpr(fold), sqlbuild.Identifier(tableName), sqlbuild.RangePredicate(idRange.Min, idRange.Max))
}

// RowsHashSQL builds the query that returns one checksum per row, from column
// expressions.
func RowsHashSQL(tableName string, columns []diff.ColumnExpr, idRange diff.IDRange) string {
	return fmt.Sprintf(
		"SELECT id, lpad(%s, 16, '0') FROM %s WHERE %s",
		unsignedHexExpr(RowHashExpr(columns)),
		sqlbuild.Identifier(tableName),
		sqlbuild.RangePredicate(idRange.Min, idRange.Max))
}

// NativeExpr is the engine's own rendering of a column, which is what a same
// engine comparison hashes.
func NativeExpr(column string) string {
	return fmt.Sprintf("%s::text", sqlbuild.Identifier(column))
}

// NativeColumns pairs each column with the engine's own rendering of it.
func NativeColumns(columns []string) []diff.ColumnExpr {
	exprs := make([]diff.ColumnExpr, len(columns))
	for i, column := range columns {
		exprs[i] = diff.ColumnExpr{Name: column, Value: NativeExpr(column)}
	}

	return exprs
}

// unsignedHexExpr renders a signed bigint as hex with the same bit pattern,
// zero padded to 16 digits.
//
// Postgres has no unsigned integers: reading the first 8 bytes of a digest as a
// bigint yields a negative number for half of all digests, and 2^64 does not
// fit in a bigint, so the widening has to go through numeric.
//
// The two argument mod() is the whole trick. The % operator takes its sign from
// the dividend, so (-2^63 + k) % 2^63 is 2^63 - k rather than 2^64 - k: bit 63
// disappears, every checksum starts with 0 through 7, and the accumulator is
// silently 63 bits wide. mod(x, 2^64) has the sign of the modulus instead, and
// its result is always in [0, 2^64), which is the unsigned form. The ::bigint
// that follows keeps the bit pattern, not the decimal value.
func unsignedHexExpr(signed string) string {
	return fmt.Sprintf(
		"to_hex(mod((%s)::numeric, 18446744073709551616)::bigint)", signed)
}

// RowHashExpr hashes each column on its own and folds the digests together.
//
// Hashing each column separately removes the delimiter ambiguity of joining
// values first: a digest is always 32 hex characters, so two different rows
// cannot produce the same concatenation by moving a delimiter around.
//
// The NULL bitmap sits in front of the digests and is what keeps a NULL
// distinct from the empty string. Without it both render as the empty string, so
// a column that is NULL on one side and empty on the other would look equal,
// which is one of the replication artifacts this tool exists to find. The bitmap
// is one fixed width character per column, so it cannot collide with a digest.
//
// The bitmap is built from the column name rather than from Value, because a
// rendering may map NULL to a value of its own.
func RowHashExpr(columns []diff.ColumnExpr) string {
	parts := make([]string, len(columns))
	bitmap := make([]string, len(columns))
	for i, column := range columns {
		identifier := sqlbuild.Identifier(column.Name)
		parts[i] = fmt.Sprintf("md5(COALESCE(%s, ''))", column.Value)
		bitmap[i] = fmt.Sprintf("CASE WHEN %s IS NULL THEN '0' ELSE '1' END", identifier)
	}

	return fmt.Sprintf(
		`('x' || substring(md5(concat(%s, %s)), 1, 16))::bit(64)::bigint`,
		strings.Join(bitmap, " || "), strings.Join(parts, " || "))
}
