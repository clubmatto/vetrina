package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"

	"matto.club/vetrina/fakedata/cli"
	"matto.club/vetrina/fakedata/output"
)

var version = "main"

func main() {
	output.Init(isTTY(os.Stdout))

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	cli.Run(version, ctx)
}

func isTTY(f *os.File) bool {
	stat, err := f.Stat()
	if err != nil {
		return false
	}

	return (stat.Mode() & os.ModeCharDevice) != 0
}
