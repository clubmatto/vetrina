package integration_test

import (
	"fmt"
	"os/exec"
	"testing"

	"matto.club/vetrina/fakedata/testutil"
	"github.com/stretchr/testify/assert"
)

type templateTestCase struct {
	tmpl    string
	golden  string
	wantErr bool
}

var testCases = []templateTestCase{
	{"simple.tmpl", "simple-template.golden", false},
	{"loop.tmpl", "loop.golden", false},
	{"loop-with-index.tmpl", "loop-with-index.golden", false},
	{"broken.tmpl", "broken-template.golden", true},
	{"unknown-function.tmpl", "unknown-function.golden", true},
}

func TestTemplatesWithCLIArgs(t *testing.T) {
	for _, tt := range testCases {
		t.Run(tt.tmpl, func(t *testing.T) {
			output, err := runBinary("--template", fmt.Sprintf("testutil/fixtures/%s", tt.tmpl))
			verifyOutput(t, tt, output, err)
		})
	}
}

func TestTemplatesWithPipe(t *testing.T) {
	for _, tt := range testCases {
		t.Run(tt.tmpl, func(t *testing.T) {
			fixture := testutil.NewFixture(t, tt.tmpl)
			cmd := exec.Command(binaryPath)
			cmd.Stdin = fixture.AsFile()
			cmd.Env = append(cmd.Env, "GOCOVERDIR=.coverdata")
			output, err := cmd.CombinedOutput()
			verifyOutput(t, tt, output, err)
		})
	}
}

func verifyOutput(t *testing.T, tt templateTestCase, output []byte, err error) {
	if tt.wantErr {
		assert.Error(t, err)
	} else {
		assert.NoError(t, err)
	}

	golden := testutil.NewGoldenFile(t, tt.golden)
	actual := string(output)

	if *update {
		golden.Write(actual)
	}

	expected := golden.Load()

	assert.Equal(t, expected, actual, "diff: %v", testutil.Diff(expected, actual))
}
