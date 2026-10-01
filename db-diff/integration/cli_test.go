package integration_test

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"matto.club/vetrina/db-diff/testutil"
)

// binaryPath is the db-diff binary under test, built once for the package.
var binaryPath string

func TestMain(m *testing.M) {
	dir, err := os.MkdirTemp("", "db-diff-cli")
	if err != nil {
		fmt.Fprintf(os.Stderr, "could not create temp dir: %v\n", err)
		os.Exit(1)
	}
	defer os.RemoveAll(dir)

	binaryPath = filepath.Join(dir, "db-diff")
	build := exec.Command("go", "build", "-o", binaryPath, "matto.club/vetrina/db-diff")
	build.Stderr = os.Stderr
	if err := build.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "could not build db-diff: %v\n", err)
		os.Exit(1)
	}

	os.Exit(m.Run())
}

// runBinary runs db-diff and returns its stdout, stderr and exit code.
func runBinary(t *testing.T, args ...string) (string, string, int) {
	t.Helper()

	cmd := exec.Command(binaryPath, args...)
	var stdout, stderr strings.Builder
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()

	code := 0
	if err != nil {
		var exitErr *exec.ExitError
		if !asExitError(err, &exitErr) {
			require.NoErrorf(t, err, "running %v", args)
		}
		code = exitErr.ExitCode()
	}

	return stdout.String(), stderr.String(), code
}

func asExitError(err error, target **exec.ExitError) bool {
	exitErr, ok := err.(*exec.ExitError)
	if ok {
		*target = exitErr
	}

	return ok
}

// TestCLI runs the built binary against real engines. The conformance suite
// covers the diff logic; these tests cover the contract the binary offers its
// users: the flags, the exit codes, and the output.
func TestCLI(t *testing.T) {
	if testing.Short() {
		t.Skip("CLI tests need containers")
	}

	t.Run("version and usage do not need a database", func(t *testing.T) {
		stdout, _, code := runBinary(t, "--version")
		require.Equal(t, 0, code)
		require.Contains(t, stdout, "db-diff")

		stdout, _, code = runBinary(t, "--help")
		require.Equal(t, 0, code)
		require.Contains(t, stdout, "Usage:")
		require.Contains(t, stdout, "segment-size")

		_, stderr, code := runBinary(t)
		require.Equal(t, 2, code, "missing required flags is a failure, not a clean run")
		require.Contains(t, stderr, "required")
	})

	t.Run("an unknown dialect is rejected", func(t *testing.T) {
		_, stderr, code := runBinary(t, "--source=not-a-dsn", "--target=not-a-dsn", "--table=t")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "cannot tell the dialect")
	})

	t.Run("comparing across engines is refused", func(t *testing.T) {
		_, stderr, code := runBinary(t,
			"--source=postgres://u:p@127.0.0.1:1/db",
			"--target=u:p@tcp(127.0.0.1:3306)/db",
			"--table=t")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "must run the same engine")
	})

	t.Run("include and exclude cannot be combined", func(t *testing.T) {
		_, stderr, code := runBinary(t,
			"--source=postgres://u:p@127.0.0.1:1/db", "--target=postgres://u:p@127.0.0.1:1/db",
			"--table=t", "--include=a", "--exclude=b")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "cannot be used together")
	})

	t.Run("a segment size of zero is rejected", func(t *testing.T) {
		_, stderr, code := runBinary(t,
			"--source=postgres://u:p@127.0.0.1:1/db", "--target=postgres://u:p@127.0.0.1:1/db",
			"--table=t", "--segment-size=0")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "greater than zero")
	})
}

// TestCLIAgainstPostgres exercises the happy paths, which need two databases
// holding the same table.
func TestCLIAgainstPostgres(t *testing.T) {
	if testing.Short() {
		t.Skip("CLI tests need containers")
	}

	source := startPostgres(t)
	target := startPostgres(t)

	schema := `CREATE TABLE bookmark (
		id     BIGSERIAL PRIMARY KEY,
		url    TEXT NOT NULL,
		title  TEXT NOT NULL,
		unread BOOLEAN NOT NULL DEFAULT true,
		note   TEXT
	)`
	source.Exec(t, schema)
	target.Exec(t, schema)

	rows := `INSERT INTO bookmark (url, title, unread, note) VALUES
		('https://example.com', 'Example', true, NULL),
		('https://example.com/2', 'Example 2', false, 'a note'),
		('https://example.com/3', 'Example 3', true, '')`
	source.Exec(t, rows)
	target.Exec(t, rows)

	args := func(extra ...string) []string {
		base := []string{"--source=" + source.DSN, "--target=" + target.DSN, "--table=bookmark"}

		return append(base, extra...)
	}

	t.Run("identical tables exit clean", func(t *testing.T) {
		stdout, stderr, code := runBinary(t, args()...)
		require.Equal(t, 0, code, "stderr: %s", stderr)
		require.Contains(t, stdout, "no differences in bookmark")
	})

	t.Run("a changed row exits with the diff code", func(t *testing.T) {
		target.Exec(t, "UPDATE bookmark SET title = 'Changed' WHERE id = 2")

		stdout, stderr, code := runBinary(t, args()...)
		require.Equal(t, 1, code, "stderr: %s", stderr)
		require.Contains(t, stdout, "1 differing rows in bookmark")
		require.Contains(t, stdout, "\n2\n")

		target.Exec(t, "UPDATE bookmark SET title = 'Example 2' WHERE id = 2")
	})

	t.Run("a row missing from the target is reported", func(t *testing.T) {
		target.Exec(t, "DELETE FROM bookmark WHERE id = 3")

		stdout, _, code := runBinary(t, args()...)
		require.Equal(t, 1, code)
		require.Contains(t, stdout, "\n3\n")

		target.Exec(t,
			"INSERT INTO bookmark (id, url, title, unread, note)"+
				" VALUES (3, 'https://example.com/3', 'Example 3', true, '')")
	})

	t.Run("a row missing from the source is reported", func(t *testing.T) {
		target.Exec(t,
			"INSERT INTO bookmark (id, url, title, unread, note)"+
				" VALUES (4, 'https://example.com/4', 'Example 4', true, NULL)")

		stdout, _, code := runBinary(t, args()...)
		require.Equal(t, 1, code)
		require.Contains(t, stdout, "\n4\n")

		target.Exec(t, "DELETE FROM bookmark WHERE id = 4")
	})

	t.Run("exclude drops a column from the comparison", func(t *testing.T) {
		target.Exec(t, "UPDATE bookmark SET note = 'different' WHERE id = 1")

		_, _, code := runBinary(t, args()...)
		require.Equal(t, 1, code)

		_, _, code = runBinary(t, args("--exclude=note")...)
		require.Equal(t, 0, code, "the changed column was excluded")

		target.Exec(t, "UPDATE bookmark SET note = NULL WHERE id = 1")
	})

	t.Run("include restricts the comparison", func(t *testing.T) {
		target.Exec(t, "UPDATE bookmark SET title = 'Changed' WHERE id = 1")

		_, _, code := runBinary(t, args("--include=url,unread")...)
		require.Equal(t, 0, code, "title was not part of the comparison")

		_, _, code = runBinary(t, args("--include=title")...)
		require.Equal(t, 1, code)

		target.Exec(t, "UPDATE bookmark SET title = 'Example' WHERE id = 1")
	})

	t.Run("a column that does not exist is an error", func(t *testing.T) {
		_, stderr, code := runBinary(t, args("--exclude=nope")...)
		require.Equal(t, 2, code)
		require.Contains(t, stderr, `has no column "nope"`)

		_, stderr, code = runBinary(t, args("--include=nope")...)
		require.Equal(t, 2, code)
		require.Contains(t, stderr, `has no column "nope"`)
	})

	t.Run("a missing table is an error", func(t *testing.T) {
		_, stderr, code := runBinary(t,
			"--source="+source.DSN, "--target="+target.DSN, "--table=does_not_exist")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "does not exist")
	})

	t.Run("a smaller segment size finds the same rows", func(t *testing.T) {
		target.Exec(t, "UPDATE bookmark SET title = 'Changed' WHERE id = 3")

		stdout, _, code := runBinary(t, args("--segment-size=1")...)
		require.Equal(t, 1, code)
		require.Contains(t, stdout, "\n3\n")

		target.Exec(t, "UPDATE bookmark SET title = 'Example 3' WHERE id = 3")
	})

	t.Run("empty tables match", func(t *testing.T) {
		source.Exec(t, "CREATE TABLE empty_bookmark (id BIGSERIAL PRIMARY KEY, url TEXT)")
		target.Exec(t, "CREATE TABLE empty_bookmark (id BIGSERIAL PRIMARY KEY, url TEXT)")

		stdout, _, code := runBinary(t,
			"--source="+source.DSN, "--target="+target.DSN, "--table=empty_bookmark")
		require.Equal(t, 0, code)
		require.Contains(t, stdout, "no differences in empty_bookmark")
	})

	t.Run("an empty source with rows in the target is a difference", func(t *testing.T) {
		source.Exec(t, "CREATE TABLE one_sided (id BIGSERIAL PRIMARY KEY, url TEXT)")
		target.Exec(t, "CREATE TABLE one_sided (id BIGSERIAL PRIMARY KEY, url TEXT)")
		target.Exec(t, "INSERT INTO one_sided (url) VALUES ('only-here')")

		stdout, _, code := runBinary(t,
			"--source="+source.DSN, "--target="+target.DSN, "--table=one_sided")
		require.Equal(t, 1, code)
		require.Contains(t, stdout, "1 differing rows in one_sided")
	})

	t.Run("swapping source and target reports the same rows", func(t *testing.T) {
		// The comparison has to be symmetry_check. An earlier version only walked
		// the source's own key range, so a target-only row outside that range
		// was invisible and the answer depended on which side was the source.
		source.Exec(t, "CREATE TABLE symmetry_check (id BIGSERIAL PRIMARY KEY, v TEXT)")
		target.Exec(t, "CREATE TABLE symmetry_check (id BIGSERIAL PRIMARY KEY, v TEXT)")
		source.Exec(t, "INSERT INTO symmetry_check (id, v) VALUES (5, 'five'), (6, 'six')")
		target.Exec(t, "INSERT INTO symmetry_check (id, v) VALUES (1, 'one'), (5, 'five'), (6, 'six'), (99, 'ninety-nine')")

		forward, _, code := runBinary(t,
			"--source="+source.DSN, "--target="+target.DSN, "--table=symmetry_check")
		require.Equal(t, 1, code)
		require.Contains(t, forward, "\n1\n")
		require.Contains(t, forward, "\n99\n")

		backward, _, code := runBinary(t,
			"--source="+target.DSN, "--target="+source.DSN, "--table=symmetry_check")
		require.Equal(t, 1, code)
		require.Equal(t, forward, backward, "both directions report the same rows")
	})

	t.Run("a different column layout is rejected", func(t *testing.T) {
		source.Exec(t, "CREATE TABLE layout (id BIGSERIAL PRIMARY KEY, a TEXT, b TEXT)")
		target.Exec(t, "CREATE TABLE layout (id BIGSERIAL PRIMARY KEY, b TEXT, a TEXT)")

		_, stderr, code := runBinary(t,
			"--source="+source.DSN, "--target="+target.DSN, "--table=layout")
		require.Equal(t, 2, code)
		require.Contains(t, stderr, "same columns in the same order")
	})
}

func startPostgres(t *testing.T) *testutil.Database {
	t.Helper()

	for _, backend := range testutil.Backends() {
		if backend.Name == "postgres" {
			return backend.Start(t)
		}
	}

	t.Fatal("no postgres backend")

	return nil
}
