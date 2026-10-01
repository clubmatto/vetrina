package diff

import (
	"context"
	"database/sql"
)

// ChunkHash is the checksum of every row within an ID range.
//
// Hash is a hex encoded 64 bit accumulator, produced by folding the 64 bit
// prefix of each row's MD5 digest. Two chunks hash to the same value only if
// their row digests fold to the same accumulator (see docs/how-it-works.md for
// the collision analysis).
type ChunkHash struct {
	Hash string
}

// IDRange is an inclusive range of primary key values. Ranges are expressed on
// an int64 primary key, which is the only key type db-diff supports today.
type IDRange struct {
	Min int64
	Max int64
}

// Table is a table on one side of the comparison, together with the columns the
// comparison folds.
//
// The name and the columns travel together on purpose. The checksum queries
// read the table name from the Table they are handed, so a caller that reuses
// one side's metadata for the other side would quietly hash the first table
// twice and report no differences at all.
type Table struct {
	// Name is the table to query.
	Name string
	// Columns are the compared columns, sorted, as returned by GetColumnNames.
	Columns []string
}

// MetadataReader reads the structural information needed to build diff queries.
type MetadataReader interface {
	// GetColumnNames returns the names of every column of the table, in the
	// order the database reports them.
	GetColumnNames(ctx context.Context, tableName string) ([]string, error)

	// GetMinMax returns the inclusive primary key bounds of the table and
	// whether the table has any rows at all.
	//
	// Emptiness is reported separately rather than inferred from NULL bounds:
	// a non-nullable column type never yields NULL, so ClickHouse returns 0
	// for MIN and MAX of an empty table and the bounds alone cannot tell that
	// apart from a table whose only row has id 0.
	GetMinMax(ctx context.Context, tableName string) (minID, maxID int64, empty bool, err error)

	Ping(name string) error
	Close() error
}

// HashReader runs the checksum queries.
type HashReader interface {
	// GetChunkHash returns the fold of every row hash in idRange.
	GetChunkHash(ctx context.Context, table *Table, idRange IDRange) (*ChunkHash, error)

	// GetRowsHash returns the row hash of every row in idRange, keyed by
	// primary key. It is only called on ranges that already differ, so the
	// number of rows it pulls is bounded by the segment size.
	GetRowsHash(ctx context.Context, table *Table, idRange IDRange) (map[int64]string, error)
}

// Source is everything db-diff needs from one database.
type Source interface {
	MetadataReader
	HashReader
}

// Dialect renders the database specific SQL, and scans database specific result
// shapes.
//
// The SQL it returns has to satisfy one contract, which the dialect
// implementations share and the conformance tests enforce: two rows hash to the
// same value if and only if they hold the same values in the selected columns,
// and the value of GetChunkHashSQL equals the fold of the GetRowsHashSQL values
// it covers.
type Dialect interface {
	GetColumnNamesSQL(tableName string) string
	ScanColumnName(rows *sql.Rows) (string, error)
	GetMinMaxSQL(tableName string) string

	// GetChunkHashSQL selects a single row holding the hex encoded 64 bit
	// checksum of every row of the table in idRange.
	GetChunkHashSQL(tableName string, columns []string, idRange IDRange) string

	// GetRowsHashSQL selects (id, hash) for every row of the table in idRange,
	// where hash is the row's checksum as a 64 bit integer.
	GetRowsHashSQL(tableName string, columns []string, idRange IDRange) string
}
