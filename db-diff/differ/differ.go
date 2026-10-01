// Package differ holds the comparison itself: given two sources and a table, it
// walks the primary key range in segments and reads row by row only where the
// checksums disagree.
//
// It lives in a package rather than in main() so the tests can drive the same
// code the binary runs. An earlier version of this walk existed twice, once in
// the binary and once copied into the test suite, and the copy is what let a
// coverage bug survive: both copies only ever walked the source's own range.
package differ

import (
	"context"
	"sort"

	"matto.club/vetrina/db-diff/diff"
)

// DefaultSegmentSize is how many primary keys one checksum query covers.
const DefaultSegmentSize int64 = 10000

// Runner compares one table between two databases.
type Runner struct {
	// Source and Target are the two databases. Both have to speak the same
	// dialect: the checksum only agrees across sides when it is computed the
	// same way.
	Source diff.Source
	Target diff.Source
	// Table is the table to compare, present on both sides under the same name.
	Table *diff.Table
	// SegmentSize is how many primary keys one checksum covers.
	SegmentSize int64
}

// Run returns the primary keys of every row that differs, sorted ascending.
func (r Runner) Run(ctx context.Context) ([]int64, error) {
	sourceMin, sourceMax, sourceEmpty, err := r.Source.GetMinMax(ctx, r.Table.Name)
	if err != nil {
		return nil, err
	}
	targetMin, targetMax, targetEmpty, err := r.Target.GetMinMax(ctx, r.Table.Name)
	if err != nil {
		return nil, err
	}

	if sourceEmpty && targetEmpty {
		return nil, nil
	}

	// The walk covers both ranges, not just the source's. An id the source
	// happens to sit above or below still belongs to the comparison, and
	// walking only [sourceMin, sourceMax] would never put it in a predicate, so
	// a row the target holds outside that window would never be reported. It
	// also keeps the answer symmetric: swapping source and target has to
	// produce the same set of differing ids.
	//
	// An empty side has no bounds to contribute, so the other side's bounds
	// stand in and every row of the non empty side is compared against nothing.
	walkMin, walkMax := bounds(sourceMin, sourceMax, sourceEmpty, targetMin, targetMax, targetEmpty)

	return r.segments(ctx, walkMin, walkMax)
}

// bounds returns the primary key range the walk has to cover.
func bounds(
	sourceMin, sourceMax int64,
	sourceEmpty bool,
	targetMin, targetMax int64,
	targetEmpty bool,
) (int64, int64) {
	switch {
	case sourceEmpty:
		return targetMin, targetMax
	case targetEmpty:
		return sourceMin, sourceMax
	default:
		return min(sourceMin, targetMin), max(sourceMax, targetMax)
	}
}

func (r Runner) segments(ctx context.Context, minID, maxID int64) ([]int64, error) {
	segmentSize := r.SegmentSize
	if segmentSize <= 0 {
		segmentSize = DefaultSegmentSize
	}

	ids := make([]int64, 0)
	for start := minID; start <= maxID; {
		// Clamping the end to maxID is what keeps the loop finite. Left
		// unclamped, start + segmentSize - 1 wraps past the end of an int64
		// near the top of the range: the segment then matches nothing, both
		// checksums come back as the zero fold, and the segment is skipped.
		end := maxID
		if maxID-start >= segmentSize-1 {
			end = start + segmentSize - 1
		}

		idRange := diff.IDRange{Min: start, Max: end}

		differ, err := r.segmentsDiffer(ctx, idRange)
		if err != nil {
			return nil, err
		}
		if differ {
			segmentIDs, err := diff.CompareRows(ctx, r.Source, r.Target, r.Table, r.Table, idRange)
			if err != nil {
				return nil, err
			}
			ids = append(ids, segmentIDs...)
		}

		// The loop ends on end rather than on end + 1. The range ends at the
		// largest int64, where end + 1 wraps negative: the condition would stay
		// true and the walk would never finish.
		if end == maxID {
			break
		}

		start = end + 1
	}

	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })

	return ids, nil
}

func (r Runner) segmentsDiffer(ctx context.Context, idRange diff.IDRange) (bool, error) {
	sourceHash, err := r.Source.GetChunkHash(ctx, r.Table, idRange)
	if err != nil {
		return false, err
	}
	targetHash, err := r.Target.GetChunkHash(ctx, r.Table, idRange)
	if err != nil {
		return false, err
	}

	return sourceHash.Hash != targetHash.Hash, nil
}
