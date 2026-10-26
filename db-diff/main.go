// Command db-diff compares tables across two databases and reports the
// primary keys of the rows that differ.
package main

import (
	"os"
	"runtime/debug"
	"strings"

	"matto.club/vetrina/db-diff/cli"
)

// devVersion is what a build reports when nothing told it otherwise.
const devVersion = "dev"

// version is stamped at build time with -ldflags.
var version = devVersion

func main() {
	// The command line lives in cli so a downstream layer can embed it. See
	// cli.Options.DialectFor for the seam.
	os.Exit(cli.RunFromArgs(currentVersion(), cli.Options{}))
}

// currentVersion reports the version this build was stamped with, falling back
// to the module version the toolchain recorded.
//
// The fallback exists because `go install matto.club/vetrina/db-diff@latest` is
// a documented install path and cannot pass -ldflags, so without it that binary
// claims to be "dev" and support cannot tell one build from another.
func currentVersion() string {
	info, ok := debug.ReadBuildInfo()
	if !ok {
		return version
	}

	return resolveVersion(version, info.Main.Version)
}

// resolveVersion keeps the stamped version when there is one, and otherwise
// uses the module version. A build from a checkout reports "(devel)" there, so
// the stamped value stands rather than replacing one non-version with another.
func resolveVersion(stamped, module string) string {
	if stamped != devVersion {
		return stamped
	}
	if module == "" || module == "(devel)" {
		return stamped
	}

	// The release tarballs are stamped without the leading v, so a module
	// version keeps the same shape: `db-diff 0.0.4`, whichever way it was
	// installed.
	return strings.TrimPrefix(module, "v")
}
