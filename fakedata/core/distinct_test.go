package core_test

import (
	"testing"

	"matto.club/vetrina/fakedata/core"
	"github.com/stretchr/testify/require"
)

func TestDistinctPoolSemantics(t *testing.T) {
	cols, err := core.NewColumns(testReg, []string{"distinct:25:uuidv4"})
	require.NoError(t, err)

	const samples = 1000
	seen := make(map[string]struct{})
	for i := 0; i < samples; i++ {
		row, err := cols.GenerateRow()
		require.NoError(t, err)
		require.True(t, uuidv4Invariant(row[0]), "got %q, not a uuidv4", row[0])
		seen[row[0]] = struct{}{}
	}

	require.Len(t, seen, 25, "expected exactly 25 distinct values across %d samples", samples)
}

func TestDistinctEveryPoolValueSampled(t *testing.T) {
	const (
		poolSize  = 20
		samples   = 2000
		minCount  = 1
	)

	cols, err := core.NewColumns(testReg, []string{"distinct:20:uuidv4"})
	require.NoError(t, err)

	seen := make(map[string]int)
	for i := 0; i < samples; i++ {
		row, err := cols.GenerateRow()
		require.NoError(t, err)
		seen[row[0]]++
	}

	require.Len(t, seen, poolSize, "expected every pool value to be sampled")
	for _, count := range seen {
		require.GreaterOrEqual(t, count, minCount)
	}
}

func TestDistinctDeterministicWithSeed(t *testing.T) {
	first := generateDistinctRows(t, 42)
	second := generateDistinctRows(t, 42)

	require.Equal(t, first, second)
}

func generateDistinctRows(t *testing.T, seed int64) []string {
	t.Helper()

	reg := core.NewRegistry()
	reg.Seed(seed)

	cols, err := core.NewColumns(reg, []string{"distinct:10:int:1,1000000"})
	require.NoError(t, err)

	rows := make([]string, 50)
	for i := range rows {
		row, err := cols.GenerateRow()
		require.NoError(t, err)
		rows[i] = row[0]
	}

	return rows
}
