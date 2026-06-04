package integration_test

import (
	"regexp"
	"strings"
	"testing"

	"matto.club/vetrina/fakedata/testutil"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestCLI(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		golden  string
		wantErr bool
	}{
		{
			"no arguments",
			[]string{},
			"help.golden",
			false,
		},
		{
			"default format",
			[]string{"int:42,42", "enum:foo,foo"},
			"default-format.golden",
			false,
		},
		{
			"default format with header",
			[]string{"--header", "int:42,42", "enum:foo,foo"},
			"default-format-with-header.golden",
			false,
		},
		{
			"unknown generators",
			[]string{"madeupgenerator", "anothermadeupgenerator"},
			"unknown-generators.golden",
			true,
		},
		{
			"default format with limit short",
			[]string{"-n=5", "int:42,42", "enum:foo,foo"},
			"default-format-with-limit.golden",
			false,
		},
		{
			"default format with limit",
			[]string{"--rows=5", "int:42,42", "enum:foo,foo"},
			"default-format-with-limit.golden",
			false,
		},
		{
			"csv format short",
			[]string{"-s=,", "int:42,42", "enum:foo,foo"},
			"csv-format.golden",
			false,
		},
		{
			"csv format",
			[]string{"--separator=,", "int:42,42", "enum:foo,foo"},
			"csv-format.golden",
			false,
		},
		{
			"tab format",
			[]string{"--separator=\t", "int:42,42", "enum:foo,foo"},
			"tab-format.golden",
			false,
		},
		{
			"unknown format",
			[]string{"-f=no-format", "int:42,42", "enum:foo,foo"},
			"unknown-format.golden",
			true,
		},
		{
			"one column",
			[]string{"--seed=1", "email"},
			"one-column.golden",
			false,
		},
		{
			"two columns",
			[]string{"--seed=1", "email", "domain_name"},
			"two-columns.golden",
			false,
		},
		{
			"two columns one fails",
			[]string{"email", "domain_name", "unsupportedgenerator"},
			"two-columns-one-fails.golden",
			true,
		},
		{
			"named column",
			[]string{"--seed=1", "login:email"},
			"named-column.golden",
			false,
		},
		{
			"named column unsupported generator",
			[]string{"login:notagen"},
			"named-column-unsupported.golden",
			true,
		},
		{
			"disambiguated generator with options",
			[]string{"--seed=1", "int:10,20"},
			"disambiguated.golden",
			false,
		},
		{
			"named field with generator and options",
			[]string{"--seed=1", "count:int:10,20"},
			"named-field-with-options.golden",
			false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := runBinary(tt.args...)
			if tt.wantErr {
				assert.Error(t, err, "expected error but got none")
			} else {
				assert.NoError(t, err, "unexpected error: %s", output)
			}

			actual := testutil.StripANSICodes(string(output))

			golden := testutil.NewGoldenFile(t, tt.golden)

			if *update {
				golden.Write(actual)
			}

			expected := golden.Load()

			assert.Equal(t, expected, actual, "diff: %v", testutil.Diff(expected, actual))
		})
	}
}

func TestGeneratorDescription(t *testing.T) {
	tests := []struct {
		name string
		args []string
	}{
		{"simple generator", []string{"-g", "first_name"}},
		{"custom generator", []string{"-g", "int"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := runBinary(tt.args...)
			require.NoError(t, err, "test run returned an error: %s", output)

			actual := string(output)

			assert.Regexp(t, "Description:", actual)
		})
	}
}

func TestGeneratorsFlag(t *testing.T) {
	output, err := runBinary("-G")
	require.NoError(t, err, "test run returned an error: %s", output)

	actual := string(output)

	assert.Regexp(t, "email", actual)
}

func TestCompletionFlag(t *testing.T) {
	tests := []struct {
		name           string
		shell          string
		wantOutput     string
		dontWantOutput string
	}{
		{"bash", "bash", "_fakedata()", ""},
		{"zsh", "zsh", "_fakedata ()", ""},
		{"fish", "fish", "complete -c fakedata", ""},
		{"unknown shell", "csh", "shell csh not supported", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := runBinary("-C", tt.shell)
			require.NoError(t, err, "unexpected error: %s", output)

			if tt.wantOutput != "" {
				assert.Regexp(t, tt.wantOutput, string(output))
			}

			if tt.dontWantOutput != "" {
				assert.NotRegexp(t, tt.dontWantOutput, string(output))
			}
		})
	}
}

func TestVersionFlag(t *testing.T) {
	output, err := runBinary("-v")
	require.NoError(t, err, "test run returned an error: %s", output)

	actual := strings.TrimSpace(string(output))
	assert.Equal(t, "main", actual)
}

func TestNdjsonFormat(t *testing.T) {
	output, err := runBinary("-f", "ndjson", "-n=3", "int:42,42", "enum:foo,bar")
	require.NoError(t, err, "test run returned an error: %s", output)

	actual := string(output)
	for i, line := range regexp.MustCompile(`\n`).Split(actual, -1) {
		if line == "" {
			continue
		}

		matched, err := regexp.MatchString(`^\{"enum":"(foo|bar)","int":"[0-9]+"\}$`, line)
		require.NoError(t, err, "could not match line %d", i)
		assert.True(t, matched, "line %d: expected ndjson output, but got: %s", i, line)
	}
}

func TestFileGenerator(t *testing.T) {
	tests := []struct {
		name    string
		args    []string
		golden  string
		wantErr bool
	}{
		{"no file", []string{"file"}, "path-empty.golden", true},
		{"file does not exist", []string{`file:'this file does not exist.txt'`}, "file-does-not-exist.golden", true},
		{"file exists", []string{`file:testutil/fixtures/file.txt`}, "file-exist.golden", false},
		{"file exists with quotes", []string{`file:'testutil/fixtures/file.txt'`}, "file-exist.golden", false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			output, err := runBinary(tt.args...)
			if tt.wantErr {
				assert.Error(t, err, "expected error but got none")
			} else {
				assert.NoError(t, err, "unexpected error: %s", output)
			}

			golden := testutil.NewGoldenFile(t, tt.golden)
			actual := testutil.StripANSICodes(string(output))

			if *update {
				golden.Write(actual)
			}

			expected := golden.Load()

			assert.Equal(t, expected, actual, "diff: %v", testutil.Diff(expected, actual))
		})
	}
}
