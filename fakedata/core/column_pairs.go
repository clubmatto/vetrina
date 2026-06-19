package core

import (
	"strings"
)

var prefixes = []string{"start_", "begin_", "end_", "finish_"}
var suffixes = []string{"_from", "_to", "_until"}
var midWords = []string{
	"start", "begin", "end", "finish",
	"_from", "_to", "_until",
	"departure", "arrival",
	"opening", "closing",
	"opened", "closed",
	"created", "updated",
}

func findBase(name string) string {
	lower := strings.ToLower(name)

	for _, p := range prefixes {
		if _, ok := strings.CutPrefix(lower, p); ok {
			return name[len(p):]
		}
	}

	for _, s := range suffixes {
		if _, ok := strings.CutSuffix(lower, s); ok {
			return name[:len(name)-len(s)]
		}
	}

	for _, w := range midWords {
		if strings.Contains(lower, w) {
			return strings.Replace(lower, w, "", 1)
		}
	}

	return ""
}

func isStartVariant(name string) bool {
	lower := strings.ToLower(name)

	return strings.Contains(lower, "start") ||
		strings.Contains(lower, "begin") ||
		strings.Contains(lower, "departure") ||
		strings.Contains(lower, "opening") ||
		strings.Contains(lower, "opened") ||
		strings.Contains(lower, "created") ||
		strings.HasSuffix(lower, "_from")
}

func isEndVariant(name string) bool {
	lower := strings.ToLower(name)

	return strings.Contains(lower, "end") ||
		strings.Contains(lower, "finish") ||
		strings.Contains(lower, "arrival") ||
		strings.Contains(lower, "closing") ||
		strings.Contains(lower, "closed") ||
		strings.Contains(lower, "updated") ||
		strings.HasSuffix(lower, "_to") ||
		strings.HasSuffix(lower, "_until")
}

func findColumnPairs(columnNames []string) map[string]string {
	pairs := make(map[string]string)

	type colInfo struct {
		name string
		base string
	}

	var startCols, endCols []colInfo

	for _, col := range columnNames {
		base := findBase(col)
		if base == "" {
			continue
		}

		if isStartVariant(col) {
			startCols = append(startCols, colInfo{name: col, base: base})
		}
		if isEndVariant(col) {
			endCols = append(endCols, colInfo{name: col, base: base})
		}
	}

	for _, start := range startCols {
		for _, end := range endCols {
			if strings.EqualFold(start.base, end.base) {
				pairs[start.name] = end.name

				break
			}
		}
	}

	return pairs
}

type ColumnPairConfig struct {
	Pairs    map[string]string
	ColIndex map[string]int
}

func buildColumnPairConfig(colNames []string) ColumnPairConfig {
	pairs := findColumnPairs(colNames)
	colIndex := make(map[string]int)
	for i, name := range colNames {
		colIndex[name] = i
	}

	return ColumnPairConfig{Pairs: pairs, ColIndex: colIndex}
}

func ensureOrderedPairs(row []string, config ColumnPairConfig) []string {
	if len(config.Pairs) == 0 {
		return row
	}

	for primary, dependent := range config.Pairs {
		primaryIdx, primaryOk := config.ColIndex[primary]
		dependentIdx, dependentOk := config.ColIndex[dependent]

		if !primaryOk || !dependentOk {
			continue
		}

		primaryVal := row[primaryIdx]
		dependentVal := row[dependentIdx]

		if primaryVal == "" || dependentVal == "" {
			continue
		}

		if dependentVal < primaryVal {
			row[primaryIdx] = dependentVal
			row[dependentIdx] = primaryVal
		}
	}

	return row
}
