// Package mysql implements the MySQL dialect.
package mysql

import (
	"database/sql"
	"fmt"
	"strings"

	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/sqlbuild"
)

// DiffSource is a diff.Source backed by a MySQL connection.
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

// Dialect renders MySQL SQL.
//
// The checksum contract (see diff.Dialect) is implemented with MD5(), which
// MySQL has in core, and BIT_XOR, which is the bitwise XOR aggregate. The fold
// works on the top 16 hex digits of the row digest.
type Dialect struct{}

func (d *Dialect) GetColumnNamesSQL(tableName string) string {
	return fmt.Sprintf(
		`SELECT column_name FROM information_schema.columns
		 WHERE table_name = %s AND table_schema = DATABASE()
		 ORDER BY ordinal_position`,
		sqlbuild.Literal(tableName))
}

// ScanColumnName reads the column_name column of the information_schema query
// built by GetColumnNamesSQL.
func (d *Dialect) ScanColumnName(rows *sql.Rows) (string, error) {
	var field string

	err := rows.Scan(&field)

	return field, err
}

func (d *Dialect) GetMinMaxSQL(tableName string) string {
	return fmt.Sprintf("SELECT MIN(id), MAX(id), COUNT(*) FROM %s", sqlbuild.MySQLIdentifier(tableName))
}

func (d *Dialect) GetChunkHashSQL(tableName string, columns []string, idRange diff.IDRange) string {
	return fmt.Sprintf(
		// BIT_XOR already folds to 0 over no rows, and wrapping it in
		// COALESCE(..., 0) makes MySQL coerce the unsigned result to signed,
		// clamping every fold with the top bit set to 7FFFFFFFFFFFFFFF.
		`SELECT LPAD(HEX(BIT_XOR(%s)), 16, '0')
		 FROM %s WHERE %s`,
		rowHashExpr(columns), sqlbuild.MySQLIdentifier(tableName), sqlbuild.RangePredicate(idRange.Min, idRange.Max))
}

func (d *Dialect) GetRowsHashSQL(tableName string, columns []string, idRange diff.IDRange) string {
	return fmt.Sprintf(
		`SELECT id, LPAD(HEX(%s), 16, '0')
		 FROM %s WHERE %s`,
		rowHashExpr(columns), sqlbuild.MySQLIdentifier(tableName), sqlbuild.RangePredicate(idRange.Min, idRange.Max))
}

// rowHashExpr hashes each column on its own and folds the digests together.
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
// The column digest casts to BINARY, not CHAR. CAST(x AS CHAR) decodes the
// value through the connection character set, and bytes that cannot be decoded
// become the empty string: X'DEADBEEF' and X'DEADBEE0' both hash as MD5(”), so
// two tables that differ in a BLOB, BINARY or VARBINARY column compare equal and
// the diff reports no differences. CAST(x AS BINARY) takes the stored bytes
// instead, which distinguishes them. For text the two are the same bytes, so
// this changes nothing for VARCHAR and TEXT.
func rowHashExpr(columns []string) string {
	parts := make([]string, len(columns))
	bitmap := make([]string, len(columns))
	for i, column := range columns {
		identifier := sqlbuild.MySQLIdentifier(column)
		parts[i] = fmt.Sprintf("MD5(COALESCE(CAST(%s AS BINARY), ''))", identifier)
		bitmap[i] = fmt.Sprintf("IF(%s IS NULL, '0', '1')", identifier)
	}

	// CONCAT, not CONCAT_WS: CONCAT_WS skips the NULL argument a bitmap
	// expression can legitimately return for a column, which would shift every
	// later value one slot to the left.
	//
	// CONV returns a decimal string. Without the cast, BIT_XOR and HEX read its
	// ASCII bytes rather than the number it spells, which silently produces a
	// checksum of the wrong thing.
	return fmt.Sprintf(
		"CAST(CONV(SUBSTRING(MD5(CONCAT(%s)), 1, 16), 16, 10) AS UNSIGNED)",
		strings.Join(append(bitmap, parts...), ", "))
}
