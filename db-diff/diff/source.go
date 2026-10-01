package diff

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
)

// BaseSource implements Source for every dialect. Dialects only provide the SQL
// and the result scanning, everything else lives here so all three databases
// share one code path.
type BaseSource struct {
	Conn    *sql.DB
	Dialect Dialect
}

func (s *BaseSource) GetColumnNames(ctx context.Context, tableName string) ([]string, error) {
	query := s.Dialect.GetColumnNamesSQL(tableName)
	rows, err := s.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("query columns of %s: %w", tableName, err)
	}
	defer rows.Close()

	var columns []string
	for rows.Next() {
		col, err := s.Dialect.ScanColumnName(rows)
		if err != nil {
			return nil, fmt.Errorf("scan column of %s: %w", tableName, err)
		}
		columns = append(columns, col)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read columns of %s: %w", tableName, err)
	}
	if len(columns) == 0 {
		return nil, fmt.Errorf("table %s does not exist, or has no columns", tableName)
	}

	return columns, nil
}

func (s *BaseSource) GetMinMax(ctx context.Context, tableName string) (int64, int64, bool, error) {
	query := s.Dialect.GetMinMaxSQL(tableName)

	var minID, maxID sql.NullInt64
	var count int64
	err := s.Conn.QueryRowContext(ctx, query).Scan(&minID, &maxID, &count)
	if err != nil {
		return 0, 0, false, fmt.Errorf("query primary key bounds of %s: %w", tableName, err)
	}
	if count == 0 {
		return 0, 0, true, nil
	}
	if !minID.Valid || !maxID.Valid {
		return 0, 0, false, fmt.Errorf("table %s has %d rows but no primary key bounds", tableName, count)
	}

	return minID.Int64, maxID.Int64, false, nil
}

func (s *BaseSource) GetChunkHash(ctx context.Context, table *Table, idRange IDRange) (*ChunkHash, error) {
	query := s.Dialect.GetChunkHashSQL(table.Name, table.Columns, idRange)

	var hash sql.NullString
	err := s.Conn.QueryRowContext(ctx, query).Scan(&hash)
	if err != nil {
		return nil, fmt.Errorf("hash %s rows %d..%d: %w", table.Name, idRange.Min, idRange.Max, err)
	}
	if !hash.Valid {
		// An empty range folds to no accumulator at all. Normalize that to the
		// all zero fold so two empty ranges compare equal.
		return &ChunkHash{Hash: zeroHash}, nil
	}

	return &ChunkHash{Hash: normalizeHash(hash.String)}, nil
}

func (s *BaseSource) GetRowsHash(ctx context.Context, table *Table, idRange IDRange) (map[int64]string, error) {
	query := s.Dialect.GetRowsHashSQL(table.Name, table.Columns, idRange)
	rows, err := s.Conn.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("hash rows of %s in %d..%d: %w", table.Name, idRange.Min, idRange.Max, err)
	}
	defer rows.Close()

	rowHashes := make(map[int64]string)
	for rows.Next() {
		var id int64
		var hash string
		if err := rows.Scan(&id, &hash); err != nil {
			return nil, fmt.Errorf("scan hashed row of %s: %w", table.Name, err)
		}
		rowHashes[id] = normalizeHash(hash)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read hashed rows of %s: %w", table.Name, err)
	}

	return rowHashes, nil
}

func (s *BaseSource) Ping(name string) error {
	if err := s.Conn.Ping(); err != nil {
		return fmt.Errorf("ping %s: %w", name, err)
	}

	return nil
}

func (s *BaseSource) Close() error {
	return s.Conn.Close()
}

const zeroHash = "0000000000000000"

// normalizeHash makes hex checksums comparable across drivers: Postgres pads
// numbers it renders as hex, MySQL uppercases them, ClickHouse does neither.
// Every dialect zero pads to 16 digits in SQL, so the comparison is a plain
// string comparison on the lowercased value.
//
// The width is not corrected here on purpose. A checksum of the wrong width
// means a dialect stopped padding, and two differently padded renderings of the
// same fold would compare unequal: a false positive that reads as a data
// problem. Leaving it alone lets that surface as the bug it is.
func normalizeHash(hash string) string {
	return strings.ToLower(strings.TrimSpace(hash))
}
