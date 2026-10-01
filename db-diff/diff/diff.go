package diff

import (
	"context"
	"fmt"
	"slices"
	"sort"
	"strings"
)

// GetColumnNames returns the columns that take part in the comparison, in the
// order the database reports them.
//
// The order is preserved because the row digest folds the columns in the order
// it is given, so two databases that lay the same columns out differently
// produce different digests for identical data. Callers compare the two
// column lists and report a mismatch rather than let that show up as every row
// having changed.
//
// includedColumns, when non empty, restricts the result to those columns.
// Otherwise every column is compared, minus excludedColumns.
//
// A name that does not exist in the table is an error rather than a silent
// no-op: a typo in --include otherwise produces a comparison the user did not
// ask for, and a typo in --exclude silently reintroduces the noise they were
// trying to remove.
func GetColumnNames(
	ctx context.Context,
	db Source,
	tableName string,
	includedColumns []string,
	excludedColumns []string,
) ([]string, error) {
	columns, err := db.GetColumnNames(ctx, tableName)
	if err != nil {
		return nil, err
	}

	available := make(map[string]bool, len(columns))
	for _, column := range columns {
		available[column] = true
	}

	switch {
	case len(includedColumns) > 0:
		return selectIncluded(tableName, includedColumns, available)
	case len(excludedColumns) > 0:
		return selectExcluded(tableName, columns, excludedColumns, available)
	default:
		return columns, nil
	}
}

// selectIncluded keeps the requested columns in the requested order, so the
// digest folds exactly what the user asked for.
func selectIncluded(tableName string, included []string, available map[string]bool) ([]string, error) {
	selected := make([]string, 0, len(included))
	for _, column := range included {
		if !available[column] {
			return nil, fmt.Errorf("table %s has no column %q", tableName, column)
		}
		selected = append(selected, column)
	}

	return selected, nil
}

// selectExcluded drops the requested columns and keeps the rest in schema order.
func selectExcluded(
	tableName string,
	columns, excluded []string,
	available map[string]bool,
) ([]string, error) {
	drop := make(map[string]bool, len(excluded))
	for _, column := range excluded {
		if !available[column] {
			return nil, fmt.Errorf("table %s has no column %q", tableName, column)
		}
		drop[column] = true
	}

	selected := make([]string, 0, len(columns))
	for _, column := range columns {
		if !drop[column] {
			selected = append(selected, column)
		}
	}
	if len(selected) == 0 {
		return nil, fmt.Errorf("no columns left to compare on table %s", tableName)
	}

	return selected, nil
}

// ValidateSameColumns reports an error unless the target exposes every column
// taking part in the comparison, in the order the source folds them.
//
// The selected columns are a subset of the table when --include or --exclude is
// in play, so a target that holds extra columns is fine. What is not fine is a
// target missing a selected column, or laying the same columns out in a
// different order: the digest folds columns in the order it is given, so a
// different order would report every row as changed instead of naming the
// schema problem.
func ValidateSameColumns(sourceName, targetName string, selected, targetColumns []string) error {
	available := make(map[string]bool, len(targetColumns))
	for _, column := range targetColumns {
		available[column] = true
	}

	var missing []string
	for _, column := range selected {
		if !available[column] {
			missing = append(missing, column)
		}
	}
	if len(missing) > 0 {
		return fmt.Errorf("table %s is missing column(s) %s on the target",
			targetName, strings.Join(missing, ", "))
	}

	projected := make([]string, 0, len(selected))
	for _, column := range targetColumns {
		if slices.Contains(selected, column) {
			projected = append(projected, column)
		}
	}
	if !slices.Equal(selected, projected) {
		return fmt.Errorf(
			"tables %s and %s do not have the same columns in the same order: %v vs %v",
			sourceName, targetName, selected, projected)
	}

	return nil
}

// CompareRows returns the primary keys of every row in idRange that differs
// between the two tables, sorted ascending.
//
// A row differs when it is missing on either side, or when it is present on
// both sides with different values in the compared columns. Ranges that hash
// equal never reach this function, so the number of rows pulled from the
// databases is bounded by the segment size.
func CompareRows(
	ctx context.Context,
	sourceDB, targetDB Source,
	source, target *Table,
	idRange IDRange,
) ([]int64, error) {
	sourceRowHashes, err := sourceDB.GetRowsHash(ctx, source, idRange)
	if err != nil {
		return nil, err
	}

	targetRowHashes, err := targetDB.GetRowsHash(ctx, target, idRange)
	if err != nil {
		return nil, err
	}

	// A row differs when it is missing on one side, and a set union rather than
	// an iteration over one side is what makes that symmetric. Iterating over
	// the target alone silently drops rows that only exist in the source.
	ids := make([]int64, 0)
	for id, sourceHash := range sourceRowHashes {
		if targetHash, ok := targetRowHashes[id]; !ok || sourceHash != targetHash {
			ids = append(ids, id)
		}
	}
	for id := range targetRowHashes {
		if _, ok := sourceRowHashes[id]; !ok {
			ids = append(ids, id)
		}
	}

	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	return ids, nil
}
