package main

import (
	"testing"

	"github.com/stretchr/testify/assert"
)

func TestResolveVersion(t *testing.T) {
	tests := []struct {
		name    string
		stamped string
		module  string
		want    string
	}{
		{
			name:    "a stamped version wins over the module version",
			stamped: "0.0.4",
			module:  "v0.0.5",
			want:    "0.0.4",
		},
		{
			name:    "the module version stands in for a dev build",
			stamped: devVersion,
			module:  "v0.0.4",
			want:    "0.0.4",
		},
		{
			name:    "a pseudo version keeps its shape",
			stamped: devVersion,
			module:  "v0.0.0-20261012203646-7afd17515e47",
			want:    "0.0.0-20261012203646-7afd17515e47",
		},
		{
			name:    "a build from a checkout has no module version",
			stamped: devVersion,
			module:  "(devel)",
			want:    devVersion,
		},
		{
			name:    "an empty module version is not a version",
			stamped: devVersion,
			module:  "",
			want:    devVersion,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			assert.Equal(t, tt.want, resolveVersion(tt.stamped, tt.module))
		})
	}
}
