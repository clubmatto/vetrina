package cli

import (
	"bufio"
	"context"
	"os"

	"matto.club/vetrina/fakedata/core"
	"matto.club/vetrina/fakedata/output"
	flag "github.com/spf13/pflag"
)

func resolveFormatter(format, separator string) formatter {
	switch format {
	case "column":
		return newColumnFormatter(separator)
	case "ndjson":
		return newNdjsonFormatter()
	default:
		output.Printf("unknown format: %s\n\n", format)
		flag.Usage()
		os.Exit(1)

		return nil
	}
}

func emitRows(
	columns core.Columns,
	formatter formatter,
	header bool,
	limit int,
	stream bool,
	ctx context.Context,
) {
	fOut := bufio.NewWriter(output.DataWriter())
	defer func() {
		if err := fOut.Flush(); err != nil {
			output.Eprintf("failed to flush buffer: %v\n", err)
		}
	}()

	colNames := make([]string, len(columns))
	for i, col := range columns {
		colNames[i] = col.Name
	}

	if header {
		if err := formatHeader(fOut, formatter, colNames); err != nil {
			output.Eprintf("failed to write header: %v\n", err)

			return
		}
	}

	if stream {
		runStreamLoop(columns, fOut, formatter, colNames, ctx)

		return
	}

	runBatchLoop(columns, fOut, formatter, colNames, limit)
}

func runStreamLoop(
	columns core.Columns,
	fOut *bufio.Writer,
	formatter formatter,
	colNames []string,
	ctx context.Context,
) {
	for {
		select {
		case <-ctx.Done():
			_ = fOut.Flush()

			return
		default:
		}

		row, err := columns.GenerateRow()
		if err != nil {
			output.Eprintf("failed to generate row: %v\n", err)

			continue
		}

		if err = formatRow(fOut, formatter, colNames, row); err != nil {
			output.Eprintf("failed to write row: %v\n", err)

			continue
		}
	}
}

func runBatchLoop(
	columns core.Columns,
	fOut *bufio.Writer,
	formatter formatter,
	colNames []string,
	limit int,
) {
	for i := 0; i < limit; i++ {
		row, err := columns.GenerateRow()
		if err != nil {
			output.Eprintf("failed to generate row: %v\n", err)

			return
		}

		if err = formatRow(fOut, formatter, colNames, row); err != nil {
			output.Eprintf("failed to write row: %v\n", err)

			return
		}
	}
}
