// Package sqlbuild holds the small pieces of SQL every dialect builds the same
// way: identifier quoting and the primary key range predicate.
package sqlbuild

import (
	"fmt"
	"strings"
)

// Identifier quotes a table or column name so the dialects can keep the
// caller's spelling.
//
// Quoting is not a security boundary here: db-diff runs with the credentials
// the operator already gave it, so a table name is not an injection vector. It
// is a correctness boundary. Names with spaces, mixed case, or reserved words
// otherwise produce a syntax error or quietly address the wrong object, and
// neither reads well as a diff failure.
//
// Double quotes are the SQL standard and what Postgres and ClickHouse read.
// MySQL reads them as string delimiters unless ANSI_QUOTES is set, so it uses
// backticks instead.
func Identifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// MySQLIdentifier quotes a name for MySQL, which does not read double quoted
// identifiers by default.
func MySQLIdentifier(name string) string {
	return "`" + strings.ReplaceAll(name, "`", "``") + "`"
}

// Literal quotes a string value for dialects that need one inline, such as the
// information_schema lookups.
func Literal(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}

// RangePredicate is the inclusive primary key range every checksum query
// filters on. It is spelled the same way in all three dialects.
func RangePredicate(minID, maxID int64) string {
	return fmt.Sprintf("id >= %d AND id <= %d", minID, maxID)
}
