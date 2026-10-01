package differ

import (
	"context"
	"crypto/md5"
	"encoding/hex"
	"fmt"
	"strconv"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"matto.club/vetrina/db-diff/diff"
)

// fakeSource is an in-memory Source. It filters by the range it is asked about,
// the way a real database does, and folds the checksums of the rows it holds so
// two ranges compare equal exactly when they hold the same rows.
type fakeSource struct {
	name string

	minID   int64
	maxID   int64
	isEmpty bool

	// rows is every row the source holds, keyed by primary key.
	rows map[int64]string

	asked []diff.IDRange
}

func (f *fakeSource) GetColumnNames(context.Context, string) ([]string, error) {
	return []string{"id"}, nil
}

func (f *fakeSource) GetMinMax(context.Context, string) (int64, int64, bool, error) {
	return f.minID, f.maxID, f.isEmpty, nil
}

func (f *fakeSource) Ping(string) error { return nil }
func (f *fakeSource) Close() error      { return nil }

func (f *fakeSource) GetChunkHash(_ context.Context, _ *diff.Table, idRange diff.IDRange) (*diff.ChunkHash, error) {
	f.asked = append(f.asked, idRange)

	var accumulator uint64
	for _, hash := range f.inRange(idRange) {
		value, err := strconv.ParseUint(foldableHash(hash), 16, 64)
		if err != nil {
			return nil, err
		}
		accumulator ^= value
	}

	return &diff.ChunkHash{Hash: fmt.Sprintf("%016x", accumulator)}, nil
}

func (f *fakeSource) GetRowsHash(_ context.Context, _ *diff.Table, idRange diff.IDRange) (map[int64]string, error) {
	return f.inRange(idRange), nil
}

// inRange is the rows a real engine would return for the range.
func (f *fakeSource) inRange(idRange diff.IDRange) map[int64]string {
	rows := make(map[int64]string)
	for id, hash := range f.rows {
		if id >= idRange.Min && id <= idRange.Max {
			rows[id] = hash
		}
	}

	return rows
}

// foldableHash shortens a readable fixture value to something the checksum can
// fold, so the fixtures stay legible.
func foldableHash(value string) string {
	sum := md5.Sum([]byte(value))

	return hex.EncodeToString(sum[:8])
}

func TestRunCoversBothRanges(t *testing.T) {
	tests := []struct {
		name         string
		source       *fakeSource
		target       *fakeSource
		wantSegments []diff.IDRange
	}{
		{
			// Walking only the source's range would never look at id 1, and
			// the target-only row below it would go unreported.
			name: "a target range below the source range is walked",
			source: &fakeSource{
				name: "source", minID: 5, maxID: 6,
				rows: map[int64]string{5: "five", 6: "six"},
			},
			target: &fakeSource{
				name: "target", minID: 1, maxID: 6,
				rows: map[int64]string{1: "one", 5: "five", 6: "six"},
			},
			wantSegments: []diff.IDRange{{Min: 1, Max: 6}},
		},
		{
			name: "a target range above the source range is walked",
			source: &fakeSource{
				name: "source", minID: 1, maxID: 2,
				rows: map[int64]string{1: "one", 2: "two"},
			},
			target: &fakeSource{
				name: "target", minID: 1, maxID: 2,
				rows: map[int64]string{1: "one", 2: "two"},
			},
			wantSegments: []diff.IDRange{{Min: 1, Max: 2}},
		},
		{
			// The two ranges do not overlap at all.
			name: "disjoint ranges cover the union",
			source: &fakeSource{
				name: "source", minID: 1, maxID: 1,
				rows: map[int64]string{1: "one"},
			},
			target: &fakeSource{
				name: "target", minID: 9, maxID: 9,
				rows: map[int64]string{9: "nine"},
			},
			wantSegments: []diff.IDRange{{Min: 1, Max: 9}},
		},
		{
			name: "an empty source walks the target range",
			source: &fakeSource{
				name: "source", isEmpty: true,
			},
			target: &fakeSource{
				name: "target", minID: 3, maxID: 4,
				rows: map[int64]string{3: "three", 4: "four"},
			},
			wantSegments: []diff.IDRange{{Min: 3, Max: 4}},
		},
		{
			name: "an empty target walks the source range",
			source: &fakeSource{
				name: "source", minID: 3, maxID: 4,
				rows: map[int64]string{3: "three", 4: "four"},
			},
			target: &fakeSource{
				name: "target", isEmpty: true,
			},
			wantSegments: []diff.IDRange{{Min: 3, Max: 4}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			runner := Runner{
				Source: tt.source,
				Target: tt.target,
				Table:  &diff.Table{Name: "bookmark", Columns: []string{"id"}},
			}

			_, err := runner.Run(context.Background())
			require.NoError(t, err)

			assert.Equal(t, tt.wantSegments, tt.source.asked, "source ranges")
			assert.Equal(t, tt.wantSegments, tt.target.asked, "target ranges")
		})
	}
}

func TestRunIsSymmetric(t *testing.T) {
	// The same two data sets have to produce the same answer whichever way
	// round they are passed. An asymmetric result means one side's rows were
	// never looked at.
	sourceRows := map[int64]string{5: "five", 6: "six"}
	targetRows := map[int64]string{1: "one", 5: "five", 6: "six", 99: "ninety-nine"}

	forward := Runner{
		Source: &fakeSource{
			name: "a", minID: 5, maxID: 6,
			rows: sourceRows,
		},
		Target: &fakeSource{
			name: "b", minID: 1, maxID: 99,
			rows: targetRows,
		},
		Table: &diff.Table{Name: "t", Columns: []string{"id"}},
	}

	backward := Runner{
		Source: forward.Target,
		Target: forward.Source,
		Table:  forward.Table,
	}

	forwardIDs, err := forward.Run(context.Background())
	require.NoError(t, err)

	backwardIDs, err := backward.Run(context.Background())
	require.NoError(t, err)

	assert.Equal(t, []int64{1, 99}, forwardIDs)
	assert.Equal(t, forwardIDs, backwardIDs)
}

func TestRunSegments(t *testing.T) {
	// A range of seven keys read three at a time has to be covered by exactly
	// three segments, and only the differing ones are read row by row.
	source := &fakeSource{
		name: "source", minID: 1, maxID: 7,
		rows: map[int64]string{1: "a", 2: "b", 3: "c", 4: "d", 5: "e", 6: "f", 7: "g"},
	}
	target := &fakeSource{
		name: "target", minID: 1, maxID: 7,
		rows: map[int64]string{1: "a", 2: "DIFFERENT", 3: "c", 4: "d", 5: "e", 6: "f", 7: "DIFFERENT"},
	}

	runner := Runner{
		Source:      source,
		Target:      target,
		Table:       &diff.Table{Name: "t", Columns: []string{"id"}},
		SegmentSize: 3,
	}

	ids, err := runner.Run(context.Background())
	require.NoError(t, err)

	assert.Equal(t, []int64{2, 7}, ids)
	assert.Equal(t, []diff.IDRange{{Min: 1, Max: 3}, {Min: 4, Max: 6}, {Min: 7, Max: 7}}, source.asked)
}

func TestRunClampsTheLastSegment(t *testing.T) {
	// A range that does not divide evenly must end exactly on maxID, and the
	// segment must never start past it.
	source := &fakeSource{name: "source", minID: 10, maxID: 12, rows: map[int64]string{10: "a"}}
	target := &fakeSource{name: "target", minID: 10, maxID: 12, rows: map[int64]string{10: "a"}}

	runner := Runner{
		Source:      source,
		Target:      target,
		Table:       &diff.Table{Name: "t", Columns: []string{"id"}},
		SegmentSize: 2,
	}

	_, err := runner.Run(context.Background())
	require.NoError(t, err)

	assert.Equal(t, []diff.IDRange{{Min: 10, Max: 11}, {Min: 12, Max: 12}}, source.asked)
}

func TestRunDoesNotOverflowNearTheEndOfTheRange(t *testing.T) {
	// start + segmentSize - 1 overflows an int64 here. Left unclamped, the
	// segment matches nothing, both folds come back as zero, the segment is
	// skipped and the increment wraps negative so the loop never ends.
	const (
		minID int64 = 1<<63 - 5
		maxID int64 = 1<<63 - 1
	)

	source := &fakeSource{name: "source", minID: minID, maxID: maxID, rows: map[int64]string{minID: "a"}}
	target := &fakeSource{name: "target", minID: minID, maxID: maxID, rows: map[int64]string{minID: "a"}}

	// A small segment size keeps the arithmetic in the assertion below inside
	// an int64 while still crossing the boundary.
	runner := Runner{
		Source:      source,
		Target:      target,
		Table:       &diff.Table{Name: "t", Columns: []string{"id"}},
		SegmentSize: 2,
	}

	done := make(chan []int64, 1)
	go func() {
		ids, _ := runner.Run(context.Background())
		done <- ids
	}()

	select {
	case ids := <-done:
		assert.Empty(t, ids)
		// Both segments have to be walked, and the second one has to end on
		// maxID. Ending the loop on end+1 would wrap there and drop the last
		// segment instead of finishing.
		assert.Equal(t, []diff.IDRange{
			{Min: minID, Max: minID + 1},
			{Min: minID + 2, Max: minID + 3},
			{Min: minID + 4, Max: maxID},
		}, source.asked)
	case <-time.After(5 * time.Second):
		t.Fatal("the walk did not finish: the segment bound overflowed")
	}
}

func TestRunEmptyOnBothSides(t *testing.T) {
	source := &fakeSource{name: "source", isEmpty: true}
	target := &fakeSource{name: "target", isEmpty: true}

	runner := Runner{
		Source: source,
		Target: target,
		Table:  &diff.Table{Name: "t", Columns: []string{"id"}},
	}

	ids, err := runner.Run(context.Background())
	require.NoError(t, err)

	assert.Empty(t, ids)
	assert.Empty(t, source.asked, "an empty pair needs no queries at all")
}

func TestRunUsesTheDefaultSegmentSizeWhenUnset(t *testing.T) {
	source := &fakeSource{name: "source", minID: 1, maxID: 1, rows: map[int64]string{1: "a"}}
	target := &fakeSource{name: "target", minID: 1, maxID: 1, rows: map[int64]string{1: "a"}}

	runner := Runner{
		Source: source,
		Target: target,
		Table:  &diff.Table{Name: "t", Columns: []string{"id"}},
	}

	_, err := runner.Run(context.Background())
	require.NoError(t, err)

	require.Len(t, source.asked, 1)
	require.Greater(t, DefaultSegmentSize, int64(1))
	assert.Equal(t, diff.IDRange{Min: 1, Max: 1}, source.asked[0],
		"the last segment is clamped to the highest key, not to the segment size")
}
