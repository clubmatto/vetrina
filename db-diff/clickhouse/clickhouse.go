// Package clickhouse implements the ClickHouse dialect.
package clickhouse

import (
	"database/sql"
	"fmt"
	"strings"

	"matto.club/vetrina/db-diff/diff"
	"matto.club/vetrina/db-diff/sqlbuild"
)

// DiffSource is a diff.Source backed by a ClickHouse connection.
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

// Dialect renders ClickHouse SQL.
//
// The checksum contract (see diff.Dialect) is implemented with MD5, which
// returns a FixedString(16) that reinterpretAsUInt64 reads as the top half of
// the digest, and groupBitXor, the bitwise XOR aggregate. An earlier version
// folded rows by concatenating every digest with arrayStringConcat, which
// allocated a string proportional to the segment size on the server; XOR keeps
// the accumulator at one machine word.
type Dialect struct{}

func (d *Dialect) GetColumnNamesSQL(tableName string) string {
	return fmt.Sprintf(
		`SELECT name FROM system.columns
		 WHERE table = %s AND database = currentDatabase()
		 ORDER BY position`,
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
	return fmt.Sprintf(
		`SELECT LPAD(lower(hex(ifNull(groupBitXor(%s), 0))), 16, '0')
		 FROM %s WHERE %s`,
		rowHashNumericExpr(columns), sqlbuild.Identifier(tableName), sqlbuild.RangePredicate(idRange.Min, idRange.Max))
}

func (d *Dialect) GetRowsHashSQL(tableName string, columns []string, idRange diff.IDRange) string {
	return fmt.Sprintf(
		`SELECT id, %s FROM %s WHERE %s`,
		rowHashExpr(columns), sqlbuild.Identifier(tableName), sqlbuild.RangePredicate(idRange.Min, idRange.Max))
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
// The row checksum is the first 16 hex digits of the digest, lowercased, which
// is the same value Postgres and MySQL produce for the same row. Reading those
// bytes as an integer with reinterpretAsUInt64 would instead byte reverse them:
// ClickHouse stores integers little endian, so the hex it prints back is the
// reverse of what the other two dialects print.
func rowHashExpr(columns []string) string {
	return fmt.Sprintf(
		"lower(substring(hex(MD5(arrayStringConcat([%s], ''))), 1, 16))",
		strings.Join(rowHashParts(columns), ","))
}

// rowHashNumericExpr is rowHashExpr as the integer the fold aggregates.
//
// reverse() is what keeps the fold consistent with the row checksum. ClickHouse
// stores integers little endian, so unhex reads the 8 digest bytes as a little
// endian integer and the groupBitXor that aggregates it hands back a hex string
// whose bytes are reversed relative to the digest. Reversing on the way in
// cancels that out, so the fold of the row checksums is the row checksums.
func rowHashNumericExpr(columns []string) string {
	return fmt.Sprintf("reinterpretAsUInt64(reverse(unhex(%s)))", rowHashExpr(columns))
}

// rowHashParts renders the NULL bitmap followed by one digest per column, the
// input every dialect hashes for a row.
func rowHashParts(columns []string) []string {
	parts := make([]string, len(columns))
	bitmap := make([]string, len(columns))
	for i, column := range columns {
		identifier := sqlbuild.Identifier(column)
		parts[i] = fmt.Sprintf("lower(hex(MD5(ifNull(toString(%s), ''))))", identifier)
		bitmap[i] = fmt.Sprintf("if(isNull(%s), '0', '1')", identifier)
	}

	return append(bitmap, parts...)
}
