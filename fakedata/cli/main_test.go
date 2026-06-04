package cli_test

import (
	"os"
	"testing"

	"matto.club/vetrina/fakedata/core"
)

var testReg *core.Registry

func TestMain(m *testing.M) {
	testReg = core.NewRegistry()
	os.Exit(m.Run())
}
