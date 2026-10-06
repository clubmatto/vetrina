package integration_test

import (
	"database/sql"
	"fmt"
	"strings"
	"testing"

	"github.com/stretchr/testify/require"

	"matto.club/vetrina/db-diff/testutil"
)

// TestBinaryValuesAreDistinguished covers a false negative that shipped in
// MySQL: the dialect rendered every column with CAST(x AS CHAR), which decodes
// through the connection character set, and bytes that cannot be decoded became
// the empty string. X'DEADBEEF' and X'DEADBEE0' both hashed as MD5(”), so two
// tables differing in a BLOB column compared equal and the diff reported no
// differences.
//
// The property is not MySQL specific — bytes must be distinguished on every
// engine — so this runs against all three. Each uses one container and two
// databases rather than two containers, to keep the suite affordable.
func TestBinaryValuesAreDistinguished(t *testing.T) {
	if testing.Short() {
		t.Skip("binary value tests need containers")
	}

	for _, backend := range testutil.Backends() {
		t.Run(backend.Name, func(t *testing.T) {
			source := backend.Start(t)
			target := createSecondDatabase(t, source, backend.Name)

			sourceDiff := openSource(t, backend.Name, source.DSN)
			targetDiff := openSource(t, backend.Name, target.DSN)

			// Each case replaces the contents of one table on each side.
			cases := []struct {
				name       string
				sourceBlob string
				targetBlob string
				sourceTag  string
				targetTag  string
				sourceText string
				targetText string
				wantIDs    []int64
			}{
				{
					name:       "identical bytes are no difference",
					sourceBlob: "DEADBEEF", targetBlob: "DEADBEEF",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "same", targetText: "same",
					wantIDs: nil,
				},
				{
					// The exact case that shipped broken: one nibble apart.
					name:       "bytes differing in the last nibble are reported",
					sourceBlob: "DEADBEEF", targetBlob: "DEADBEE0",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "same", targetText: "same",
					wantIDs: []int64{1},
				},
				{
					// Both rendered as the empty string before the fix.
					name:       "empty bytes and non empty bytes are reported",
					sourceBlob: "", targetBlob: "FF",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "same", targetText: "same",
					wantIDs: []int64{1},
				},
				{
					// Undecodable bytes against decodable ones: both used to
					// collapse, and one of them to the empty string.
					name:       "undecodable bytes against ascii bytes are reported",
					sourceBlob: "68656C6C6F", targetBlob: "FFFE",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "same", targetText: "same",
					wantIDs: []int64{1},
				},
				{
					name:       "binary tag column differences are reported",
					sourceBlob: "DEADBEEF", targetBlob: "DEADBEEF",
					sourceTag: "00FF", targetTag: "00FE",
					sourceText: "same", targetText: "same",
					wantIDs: []int64{1},
				},
				{
					// Guards the text path: the fix must not have broken it.
					name:       "text differences are still reported",
					sourceBlob: "DEADBEEF", targetBlob: "DEADBEEF",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "one", targetText: "two",
					wantIDs: []int64{1},
				},
				{
					name:       "identical rows including text are no difference",
					sourceBlob: "DEADBEEF", targetBlob: "DEADBEEF",
					sourceTag: "00FF", targetTag: "00FF",
					sourceText: "café", targetText: "café",
					wantIDs: nil,
				},
			}

			for i, tc := range cases {
				t.Run(tc.name, func(t *testing.T) {
					table := fmt.Sprintf("bin_%d", i)
					source.Exec(t, binarySchema(backend.Name, table))
					target.Exec(t, binarySchema(backend.Name, table))

					source.Exec(t, binaryInsert(backend.Name, table, tc.sourceBlob, tc.sourceTag, tc.sourceText))
					target.Exec(t, binaryInsert(backend.Name, table, tc.targetBlob, tc.targetTag, tc.targetText))

					got := diffTables(t, sourceDiff, targetDiff, table, table, 10000)

					require.Len(t, got, len(tc.wantIDs), "differing ids: %v", got)
					for j, want := range tc.wantIDs {
						require.Equal(t, want, got[j])
					}
				})
			}
		})
	}
}

// createSecondDatabase makes a second database inside the same container and
// returns a handle to it. A diff needs two databases; they need not be two
// servers, and one container keeps the suite affordable.
func createSecondDatabase(t *testing.T, container *testutil.Database, dialect string) *testutil.Database {
	t.Helper()

	container.Exec(t, "CREATE DATABASE dbdiff_alt")

	altDSN := strings.Replace(container.DSN, "/dbdiff", "/dbdiff_alt", 1)
	require.NotEqual(t, container.DSN, altDSN, "the DSN must have named a database to swap")

	conn, err := sql.Open(driverFor(dialect), altDSN)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	return &testutil.Database{Name: dialect, DSN: altDSN, Conn: conn}
}

func binarySchema(dialect, table string) string {
	identifier := quoteIdentifier(dialect, table)
	switch dialect {
	case "postgres":
		return fmt.Sprintf(`CREATE TABLE %s (
			id      BIGINT PRIMARY KEY,
			payload BYTEA,
			tag     BYTEA,
			label   TEXT
		)`, identifier)
	case "mysql":
		return fmt.Sprintf(`CREATE TABLE %s (
			id      BIGINT PRIMARY KEY,
			payload BLOB,
			tag     VARBINARY(16),
			label   VARCHAR(64)
		)`, identifier)
	default:
		return fmt.Sprintf(`CREATE TABLE %s (
			id      UInt64,
			payload String,
			tag     String,
			label   String
		) ENGINE = MergeTree() ORDER BY id`, identifier)
	}
}

// binaryInsert builds one row. The byte strings are hex so the fixture can be
// written once and spelled per engine.
func binaryInsert(dialect, table, blobHex, tagHex, label string) string {
	bytes := func(hex string) string {
		switch dialect {
		case "postgres":
			return fmt.Sprintf("'\\x%s'::bytea", hex)
		case "mysql":
			return fmt.Sprintf("X'%s'", hex)
		default:
			return fmt.Sprintf("unhex('%s')", hex)
		}
	}

	labelLiteral := testutil.QuoteString(label)
	if dialect == "clickhouse" {
		labelLiteral = "toNullable(" + labelLiteral + ")"
	}

	return fmt.Sprintf(
		"INSERT INTO %s (id, payload, tag, label) VALUES (1, %s, %s, %s)",
		quoteIdentifier(dialect, table), bytes(blobHex), bytes(tagHex), labelLiteral)
}
