// Command db-diff compares one table across two databases and reports the
// primary keys of the rows that differ.
package main

import (
	"os"

	"matto.club/vetrina/db-diff/cli"
)

// version is stamped at build time with -ldflags.
var version = "dev"

func main() {
	// The command line lives in cli so a downstream layer can embed it. See
	// cli.Options.DialectFor for the seam.
	os.Exit(cli.RunFromArgs(version, cli.Options{}))
}
