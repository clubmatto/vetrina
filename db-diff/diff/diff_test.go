package diff

import (
	"context"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// fakeSource is an in-memory Source. It only implements what the selection and
// comparison logic reads, so the unit tests stay fast and free of containers.
type fakeSource struct {
	columns  []string
	rows     map[int64]string
	minID    int64
	maxID    int64
	isEmpty  bool
	chunk    string
	queryErr error
}

func (f *fakeSource) GetColumnNames(context.Context, string) ([]string, error) {
	if f.queryErr != nil {
		return nil, f.queryErr
	}

	return f.columns, nil
}

func (f *fakeSource) GetMinMax(context.Context, string) (int64, int64, bool, error) {
	if f.queryErr != nil {
		return 0, 0, false, f.queryErr
	}

	return f.minID, f.maxID, f.isEmpty, nil
}

func (f *fakeSource) Ping(string) error { return nil }
func (f *fakeSource) Close() error      { return nil }

func (f *fakeSource) GetChunkHash(context.Context, *Table, IDRange) (*ChunkHash, error) {
	return &ChunkHash{Hash: f.chunk}, nil
}

func (f *fakeSource) GetRowsHash(context.Context, *Table, IDRange) (map[int64]string, error) {
	if f.queryErr != nil {
		return nil, f.queryErr
	}

	return f.rows, nil
}

func TestGetColumnNames(t *testing.T) {
	// The source reports columns in schema order, and that order has to survive
	// the selection: the digest folds columns in the order it is given.
	source := &fakeSource{columns: []string{"id", "url", "title", "unread"}}

	tests := []struct {
		name     string
		included []string
		excluded []string
		want     []string
		wantErr  string
	}{
		{
			name: "no selection compares every column in schema order",
			want: []string{"id", "url", "title", "unread"},
		},
		{
			name:     "include keeps the order the user asked for",
			included: []string{"title", "id"},
			want:     []string{"title", "id"},
		},
		{
			name:     "exclude removes the named column and keeps the rest in order",
			excluded: []string{"title"},
			want:     []string{"id", "url", "unread"},
		},
		{
			name:     "an included column that does not exist is an error",
			included: []string{"nope"},
			wantErr:  `table bookmark has no column "nope"`,
		},
		{
			name:     "an excluded column that does not exist is an error",
			excluded: []string{"nope"},
			wantErr:  `table bookmark has no column "nope"`,
		},
		{
			name:     "excluding every column is an error",
			excluded: []string{"id", "url", "title", "unread"},
			wantErr:  "no columns left to compare on table bookmark",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := GetColumnNames(context.Background(), source, "bookmark", tt.included, tt.excluded)

			if tt.wantErr != "" {
				require.EqualError(t, err, tt.wantErr)

				return
			}

			require.NoError(t, err)
			assert.Equal(t, tt.want, got)
		})
	}
}

func TestValidateSameColumns(t *testing.T) {
	tests := []struct {
		name     string
		selected []string
		target   []string
		wantErr  string
	}{
		{
			name:     "identical layouts pass",
			selected: []string{"id", "url", "title"},
			target:   []string{"id", "url", "title"},
		},
		{
			name:     "a target with extra columns passes",
			selected: []string{"id", "url"},
			target:   []string{"id", "url", "title", "unread"},
		},
		{
			name:     "a target missing a selected column is an error",
			selected: []string{"id", "url", "note"},
			target:   []string{"id", "url"},
			wantErr:  "table bookmark is missing column(s) note on the target",
		},
		{
			name:     "a different column order is an error",
			selected: []string{"id", "url", "title"},
			target:   []string{"id", "title", "url"},
			wantErr: "tables bookmark and bookmark do not have the same columns in the same order: " +
				"[id url title] vs [id title url]",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := ValidateSameColumns("bookmark", "bookmark", tt.selected, tt.target)

			if tt.wantErr != "" {
				require.EqualError(t, err, tt.wantErr)

				return
			}

			require.NoError(t, err)
		})
	}
}

func TestCompareRows(t *testing.T) {
	tests := []struct {
		name   string
		source map[int64]string
		target map[int64]string
		want   []int64
	}{
		{
			name:   "identical rows differ nowhere",
			source: map[int64]string{1: "a", 2: "b"},
			target: map[int64]string{1: "a", 2: "b"},
			want:   []int64{},
		},
		{
			name:   "a changed value is reported",
			source: map[int64]string{1: "a", 2: "b"},
			target: map[int64]string{1: "a", 2: "c"},
			want:   []int64{2},
		},
		{
			name:   "a row only the target holds is reported",
			source: map[int64]string{1: "a"},
			target: map[int64]string{1: "a", 2: "b"},
			want:   []int64{2},
		},
		{
			// This is the case an implementation that iterates the target
			// alone cannot see.
			name:   "a row only the source holds is reported",
			source: map[int64]string{1: "a", 2: "b"},
			target: map[int64]string{1: "a"},
			want:   []int64{2},
		},
		{
			name:   "both sides have rows the other lacks",
			source: map[int64]string{1: "a", 3: "c"},
			target: map[int64]string{1: "a", 2: "b"},
			want:   []int64{2, 3},
		},
		{
			name:   "an empty source reports every target row",
			source: map[int64]string{},
			target: map[int64]string{1: "a", 2: "b"},
			want:   []int64{1, 2},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			source := &fakeSource{rows: tt.source}
			target := &fakeSource{rows: tt.target}
			table := &Table{Name: "bookmark", Columns: []string{"id"}}

			got, err := CompareRows(context.Background(), source, target, table, table, IDRange{Min: 1, Max: 10})
			require.NoError(t, err)

			assert.Equal(t, tt.want, got, "ids are sorted and deduplicated")
		})
	}
}

func TestCompareRowsPropagatesErrors(t *testing.T) {
	table := &Table{Name: "bookmark", Columns: []string{"id"}}
	failing := &fakeSource{queryErr: assert.AnError}

	_, err := CompareRows(context.Background(), failing, &fakeSource{}, table, table, IDRange{Min: 1, Max: 1})
	require.ErrorIs(t, err, assert.AnError)

	_, err = CompareRows(context.Background(), &fakeSource{}, failing, table, table, IDRange{Min: 1, Max: 1})
	require.ErrorIs(t, err, assert.AnError)
}
