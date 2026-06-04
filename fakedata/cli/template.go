package cli

import (
	"io"
	"os"

	"matto.club/vetrina/fakedata/output"
)

func isPipe() bool {
	stat, err := os.Stdin.Stat()
	if err != nil {
		output.Printf("error checking shell pipe: %v", err)
	}

	return (stat.Mode() & os.ModeCharDevice) == 0
}

func findTemplate(path string) string {
	if path != "" {
		tp, err := os.ReadFile(path)
		if err != nil {
			output.Printf("unable to read input: %s", err)
			os.Exit(1)
		}

		return string(tp)
	}

	if isPipe() {
		tp, err := io.ReadAll(os.Stdin)
		if err != nil {
			output.Printf("unable to read input: %s", err)
			os.Exit(1)
		}

		return string(tp)
	}

	return ""
}
