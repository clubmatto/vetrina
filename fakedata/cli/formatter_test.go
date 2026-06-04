package cli

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestFormatter(t *testing.T) {
	tests := []struct {
		name        string
		formatter   formatter
		columnNames []string
		values      []string
		want        string
	}{
		{
			"column_space",
			&columnFormatter{Separator: " "},
			[]string{"name", "domain_name"},
			[]string{"Grace Hopper", "example.com"},
			"Grace Hopper example.com",
		},
		{
			"column_csv",
			&columnFormatter{Separator: ","},
			[]string{"name", "domain_name"},
			[]string{"Grace Hopper", "example.com"},
			"Grace Hopper,example.com",
		},
		{
			"column_tab",
			&columnFormatter{Separator: "\t"},
			[]string{"name", "domain_name"},
			[]string{"Grace Hopper", "example.com"},
			"Grace Hopper\texample.com",
		},
		{
			"ndjson",
			&ndjsonFormatter{},
			[]string{"name", "domain_name"},
			[]string{"Grace Hopper", "example.com"},
			"{\"domain_name\":\"example.com\",\"name\":\"Grace Hopper\"}",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.formatter.format(tt.columnNames, tt.values)
			assert.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}
