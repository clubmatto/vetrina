package cli

import (
	"bytes"
	"testing"

	"github.com/stretchr/testify/assert"
)

// renderUsage is what a user sees for --help, defaults and all.
func renderUsage(t *testing.T, opts Options) string {
	t.Helper()

	var out bytes.Buffer
	var p parsed

	fs := newFlagSet(nil, &out, opts, &p)
	fs.Usage()

	return out.String()
}

func TestUsageFollowsCrossEngine(t *testing.T) {
	tests := []struct {
		name         string
		opts         Options
		wantContains []string
		wantMissing  []string
	}{
		{
			name: "the public tool refuses a cross engine comparison",
			opts: Options{},
			wantContains: []string{
				"Both databases must run the same engine",
				"cross dialect diffs are not supported yet",
			},
		},
		{
			name: "a caller that allows one gets help that says so",
			opts: Options{AllowCrossEngine: true},
			wantContains: []string{
				"may run different engines",
				`db-diff --source "$PG" --target "$MYSQL" --table orders`,
			},
			wantMissing: []string{
				"cross dialect diffs are not supported yet",
				"must run the same engine",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usage := renderUsage(t, tt.opts)

			for _, want := range tt.wantContains {
				assert.Contains(t, usage, want)
			}
			for _, unwanted := range tt.wantMissing {
				assert.NotContains(t, usage, unwanted)
			}

			// The flag list and the exit codes come from the command line
			// itself, so they are there whatever the prose says.
			assert.Contains(t, usage, "-segment-size")
			assert.Contains(t, usage, "could not complete the comparison")
		})
	}
}

func TestUsageOverrideWins(t *testing.T) {
	tests := []struct {
		name string
		opts Options
	}{
		{
			name: "an override replaces the prose on its own",
			opts: Options{UsageHeader: "custom header\n", UsageFooter: "custom footer\n"},
		},
		{
			name: "an override replaces the prose even when cross engine is allowed",
			opts: Options{
				AllowCrossEngine: true,
				UsageHeader:      "custom header\n",
				UsageFooter:      "custom footer\n",
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			usage := renderUsage(t, tt.opts)

			assert.Contains(t, usage, "custom header")
			assert.Contains(t, usage, "custom footer")
			assert.NotContains(t, usage, "DSN formats")
			assert.NotContains(t, usage, "Exit codes")
		})
	}
}
