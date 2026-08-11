package core_test

import (
	"strconv"
	"strings"
	"testing"

	"matto.club/vetrina/fakedata/core"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestColumnParams(t *testing.T) {
	tests := []struct {
		name    string
		col     string
		check   func(string) bool
		wantErr bool
	}{
		// int
		{
			"int: valid range",
			"int:1,10",
			matchRange(1, 10),
			false,
		},
		{
			"int: negative range",
			"int:-10,-1",
			matchRange(-10, -1),
			false,
		},
		{
			"int: same min and max",
			"int:5,5",
			matchRange(5, 5),
			false,
		},
		{
			"int: empty options uses defaults",
			"int:",
			func(s string) bool { return matchRange(0, 1000)(s) },
			false,
		},
		{
			"int: trailing comma uses default max",
			"int:5,",
			func(s string) bool {
				n, err := strconv.Atoi(s)
				if err != nil {
					return false
				}

				return n >= 5
			},
			false,
		},
		{
			"int: min greater than max",
			"int:100,10",
			nil,
			true,
		},
		{
			"int: non-numeric",
			"int:abc,10",
			nil,
			true,
		},

		// date
		{
			"date: range",
			"date:2016-01-01,2016-12-31",
			isDate,
			false,
		},
		{
			"date: single date uses now as end",
			"date:2016-01-01,",
			isDate,
			false,
		},
		{
			"date: default last year",
			"date:",
			isDate,
			false,
		},
		{
			"date: start after end",
			"date:2020-01-01,2019-01-01",
			nil,
			true,
		},
		{
			"date: column named after a generator keeps column:generator:options",
			"date:date:2020-01-01,2020-12-31",
			isDate,
			false,
		},
		{
			"date: invalid format",
			"date:not-a-date",
			nil,
			true,
		},

		// datetime
		{
			"datetime: default",
			"datetime:",
			isDatetime,
			false,
		},
		{
			"datetime: range",
			"datetime:2016-01-01,2016-12-31",
			isDatetime,
			false,
		},
		{
			"datetime: invalid",
			"datetime:not-a-date",
			nil,
			true,
		},

		// timestamp
		{
			"timestamp: default",
			"timestamp:",
			isTimestamp,
			false,
		},
		{
			"timestamp: range",
			"timestamp:2016-01-01,2016-12-31",
			isTimestamp,
			false,
		},
		{
			"timestamp: invalid",
			"timestamp:not-a-date",
			nil,
			true,
		},

		// float
		{
			"float: explicit naming with precision:scale",
			"f:float:5,2",
			matchDecimalDigits(2),
			false,
		},
		{
			"float: default",
			"n:float:",
			isNumber,
			false,
		},
		{
			"float: precision:scale 6:4",
			"n:float:6,4",
			matchDecimalDigits(4),
			false,
		},

		// enum
		{
			"enum: custom values",
			"enum:alice,bob,charlie",
			isEnum("alice", "bob", "charlie"),
			false,
		},
		{
			"enum: default values",
			"enum:",
			isEnum("foo", "bar", "baz"),
			false,
		},

		// phone_number
		{
			"phone_number: 8 digits",
			"phone_number:8",
			isAllDigits,
			false,
		},
		{
			"phone_number: 10 digits",
			"phone_number:10",
			isAllDigits,
			false,
		},
		{
			"phone_number: 12 digits",
			"phone_number:12",
			isAllDigits,
			false,
		},
		{
			"phone_number: too few digits",
			"phone_number:5",
			nil,
			true,
		},
		{
			"phone_number: too many digits",
			"phone_number:13",
			nil,
			true,
		},
		{
			"phone_number: non-numeric",
			"phone_number:abc",
			nil,
			true,
		},

		// file
		{
			"file: empty path",
			"file:",
			nil,
			true,
		},
		{
			"file: nonexistent",
			"file:/nonexistent/path",
			nil,
			true,
		},

		// distinct
		{
			"distinct: valid pool of uuids",
			"distinct:10:uuidv4",
			uuidv4Invariant,
			false,
		},
		{
			"distinct: inner generator with options",
			"distinct:10:date:2020-01-01,2020-12-31",
			isDate,
			false,
		},
		{
			"distinct: empty options",
			"distinct:",
			nil,
			true,
		},
		{
			"distinct: missing inner generator",
			"distinct:10",
			nil,
			true,
		},
		{
			"distinct: non-numeric count",
			"distinct:abc:uuidv4",
			nil,
			true,
		},
		{
			"distinct: zero count",
			"distinct:0:uuidv4",
			nil,
			true,
		},
		{
			"distinct: negative count",
			"distinct:-5:uuidv4",
			nil,
			true,
		},
		{
			"distinct: unknown inner generator",
			"distinct:10:nosuchgen",
			nil,
			true,
		},
		{
			"distinct: invalid inner options",
			"distinct:10:float:bad,2",
			nil,
			true,
		},
		{
			"distinct: count exceeds inner domain",
			"distinct:100:boolean",
			nil,
			true,
		},

		// unknown generator
		{
			"unknown generator",
			"nosuchgen:1,10",
			nil,
			true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			cols, err := core.NewColumns(testReg, []string{tt.col})

			if tt.wantErr {
				assert.Error(t, err, "expected error for %q", tt.col)

				return
			}

			require.NoError(t, err, "NewColumns(%q) failed", tt.col)

			row, err := cols.GenerateRow()
			require.NoError(t, err)

			require.True(t, tt.check(row[0]), "got %q, check failed for %q", row[0], tt.col)
		})
	}
}

func matchRange(lo, hi int) func(string) bool {
	return func(s string) bool {
		n, err := strconv.Atoi(s)
		if err != nil {
			return false
		}

		return n >= lo && n <= hi
	}
}

func isDate(s string) bool {
	return len(s) == 10 && s[4] == '-' && s[7] == '-'
}

func isDatetime(s string) bool {
	return len(s) == 19 &&
		s[4] == '-' && s[7] == '-' &&
		s[10] == ' ' &&
		s[13] == ':' && s[16] == ':'
}

func isTimestamp(s string) bool {
	return len(s) > 20 &&
		s[4] == '-' && s[7] == '-' &&
		s[10] == 'T' &&
		strings.Contains(s, ":")
}

func matchDecimalDigits(n int) func(string) bool {
	return func(s string) bool {
		dot := strings.IndexByte(s, '.')
		if dot < 0 {
			return false
		}

		return len(s)-dot-1 == n
	}
}

func isNumber(s string) bool {
	_, err := strconv.ParseFloat(s, 64)

	return err == nil
}

func isEnum(values ...string) func(string) bool {
	set := make(map[string]bool, len(values))
	for _, v := range values {
		set[v] = true
	}

	return func(s string) bool { return set[s] }
}

func isAllDigits(s string) bool {
	for _, c := range s {
		if c < '0' || c > '9' {
			return false
		}
	}

	return true
}
