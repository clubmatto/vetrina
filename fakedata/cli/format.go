package cli

import (
	"fmt"
	"io"
)

func formatRow(w io.Writer, formatter formatter, columnNames []string, row []string) error {
	formatted, err := formatter.format(columnNames, row)
	if err != nil {
		return err
	}

	_, err = fmt.Fprintf(w, "%s\n", formatted)

	return err
}

func formatHeader(w io.Writer, formatter formatter, header []string) error {
	formatted, err := formatter.format(header, header)
	if err != nil {
		return err
	}

	_, err = fmt.Fprintf(w, "%s\n", formatted)

	return err
}
