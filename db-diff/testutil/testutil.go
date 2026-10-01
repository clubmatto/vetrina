// Package testutil provides the container backed fixtures the db-diff tests
// run against. It is internal so the fixtures stay in lockstep with the
// dialects they exercise.
package testutil

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"testing"
	"time"

	_ "github.com/ClickHouse/clickhouse-go/v2"
	ch "github.com/ClickHouse/clickhouse-go/v2"
	_ "github.com/go-sql-driver/mysql"
	_ "github.com/lib/pq"
	"github.com/stretchr/testify/require"
	"github.com/testcontainers/testcontainers-go"
	testch "github.com/testcontainers/testcontainers-go/modules/clickhouse"
	testmysql "github.com/testcontainers/testcontainers-go/modules/mysql"
	"github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"
)

const (
	// postgresReadyLogs is how many times Postgres logs "ready to accept
	// connections" during a normal startup.
	postgresReadyLogs = 2
	// containerStartupTimeout is how long a container may take to come up.
	containerStartupTimeout = 60 * time.Second
	// syncMutations makes ClickHouse apply a mutation before the next query
	// runs, so the diff cannot race it.
	syncMutations = 2
)

// Database is one engine instance the tests can talk to directly, for fixtures
// and assertions that do not go through the diff sources.
type Database struct {
	// Name is the dialect name, as the diff.Dialect implementations use it.
	Name string
	// DSN is the connection string handed to the binary and to sql.Open.
	DSN  string
	Conn *sql.DB
}

// Exec runs statements in order and fails the test on the first error. A single
// string holding several ; separated statements is split, because the drivers
// reject multi-statement queries.
func (d *Database) Exec(t *testing.T, statements ...string) {
	t.Helper()
	for _, statement := range statements {
		for _, single := range strings.Split(statement, ";") {
			single = strings.TrimSpace(single)
			if single == "" {
				continue
			}
			if _, err := d.Conn.Exec(single); err != nil {
				require.NoErrorf(t, err, "exec failed: %s", single)
			}
		}
	}
}

// ExecQuery runs a query in the raw engine and returns every row as strings. A
// NULL comes back as the literal "<null>" so assertions can tell it apart from
// the empty string.
func (d *Database) ExecQuery(t *testing.T, query string) [][]string {
	t.Helper()

	rows, err := d.Conn.Query(query)
	require.NoError(t, err)
	defer rows.Close()

	columns, err := rows.Columns()
	require.NoError(t, err)

	var result [][]string
	for rows.Next() {
		values := make([]sql.NullString, len(columns))
		scans := make([]any, len(columns))
		for i := range values {
			scans[i] = &values[i]
		}
		require.NoError(t, rows.Scan(scans...))

		row := make([]string, len(columns))
		for i, value := range values {
			if value.Valid {
				row[i] = value.String
			} else {
				row[i] = "<null>"
			}
		}
		result = append(result, row)
	}
	require.NoError(t, rows.Err())

	return result
}

// Backend starts a container running one engine and returns a connection to it.
// Every call returns a fresh container, so a test that needs a source and a
// target calls it twice.
type Backend struct {
	Name  string
	Start func(t *testing.T) *Database
}

// Backends returns one entry for every dialect db-diff supports.
func Backends() []Backend {
	return []Backend{
		{Name: "postgres", Start: startPostgres},
		{Name: "mysql", Start: startMySQL},
		{Name: "clickhouse", Start: startClickHouse},
	}
}

func startPostgres(t *testing.T) *Database {
	t.Helper()

	ctx := context.Background()
	container, err := postgres.Run(
		ctx,
		"postgres:17-alpine",
		postgres.WithDatabase("dbdiff"),
		postgres.WithUsername("postgres"),
		postgres.WithPassword("secret"),
		testcontainers.WithWaitStrategy(
			wait.ForLog("database system is ready to accept connections").
				WithOccurrence(postgresReadyLogs).
				WithStartupTimeout(containerStartupTimeout)),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })

	dsn, err := container.ConnectionString(ctx, "sslmode=disable")
	require.NoError(t, err)

	conn, err := sql.Open("postgres", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	return &Database{Name: "postgres", DSN: dsn, Conn: conn}
}

func startMySQL(t *testing.T) *Database {
	t.Helper()

	ctx := context.Background()
	container, err := testmysql.Run(ctx, "mysql:8",
		testmysql.WithUsername("root"),
		testmysql.WithPassword("secret"),
		testmysql.WithDatabase("dbdiff"),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })

	host, err := container.Host(ctx)
	require.NoError(t, err)
	port, err := container.MappedPort(ctx, "3306")
	require.NoError(t, err)

	dsn := fmt.Sprintf("root:secret@tcp(%s:%s)/dbdiff?parseTime=true", host, port.Port())
	conn, err := sql.Open("mysql", dsn)
	require.NoError(t, err)
	t.Cleanup(func() { _ = conn.Close() })

	return &Database{Name: "mysql", DSN: dsn, Conn: conn}
}

func startClickHouse(t *testing.T) *Database {
	t.Helper()

	ctx := context.Background()
	container, err := testch.Run(ctx, "clickhouse/clickhouse-server:24.8",
		testch.WithUsername("default"),
		testch.WithPassword("secret"),
		testch.WithDatabase("dbdiff"),
	)
	require.NoError(t, err)
	t.Cleanup(func() { _ = container.Terminate(context.Background()) })

	host, err := container.Host(ctx)
	require.NoError(t, err)
	port, err := container.MappedPort(ctx, "9000")
	require.NoError(t, err)
	addr := fmt.Sprintf("%s:%s", host, port.Port())

	conn := ch.OpenDB(&ch.Options{
		Addr: []string{addr},
		Auth: ch.Auth{Database: "dbdiff", Username: "default", Password: "secret"},
		// Mutations have to be visible by the time the next query runs, which
		// the diff would otherwise race against.
		Settings: ch.Settings{"mutations_sync": syncMutations},
	})
	require.NoError(t, conn.PingContext(ctx))
	t.Cleanup(func() { _ = conn.Close() })

	dsn := fmt.Sprintf("clickhouse://default:secret@%s/dbdiff", addr)

	return &Database{Name: "clickhouse", DSN: dsn, Conn: conn}
}

// QuoteIdentifier quotes a table or column name for the engine under test.
func QuoteIdentifier(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// QuoteString quotes a string literal for the engine under test.
func QuoteString(value string) string {
	return "'" + strings.ReplaceAll(value, "'", "''") + "'"
}
