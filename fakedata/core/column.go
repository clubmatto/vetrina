package core

import (
	"strings"
)

const (
	specsLenTwo = 2
)

type Column struct {
	Name     string
	Key      string
	Generate func() string
}

type Columns []Column

func NewColumns(reg *Registry, keys []string) (Columns, error) {
	cols := make(Columns, len(keys))

	for i, k := range keys {
		specs := strings.Split(k, ":")

		var name, key, options string

		switch len(specs) {
		case 1:
			name = specs[0]
			key = specs[0]
		case specsLenTwo:
			if reg.IsGenerator(specs[0]) && !reg.IsGenerator(specs[1]) {
				name = specs[0]
				key = specs[0]
				options = specs[1]
			} else {
				name = specs[0]
				key = specs[1]
			}
		default:
			name = specs[0]
			key = specs[1]
			options = strings.Join(specs[2:], ":")
		}

		fn, err := reg.ExtractFunc(key, options)
		if err != nil {
			return cols, err
		}

		cols[i].Name = name
		cols[i].Key = key
		cols[i].Generate = fn
	}

	return cols, nil
}

func (columns Columns) GenerateRow() ([]string, error) {
	values := make([]string, len(columns))
	for i, column := range columns {
		values[i] = column.Generate()
	}

	datePairs := columns.initDatePairs()
	values = ensureValidDatePairs(values, datePairs)

	return values, nil
}

func (columns Columns) GenerateHeader() ([]string, error) {
	values := make([]string, len(columns))
	for i, column := range columns {
		values[i] = column.Name
	}

	return values, nil
}

func (columns Columns) initDatePairs() DatePairConfig {
	colNames := make([]string, len(columns))
	for i, col := range columns {
		colNames[i] = col.Name
	}

	return buildDatePairConfig(colNames)
}
