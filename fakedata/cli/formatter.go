package cli

import (
	"encoding/json"
	"strings"
)

type formatter interface {
	format(columnNames []string, values []string) (string, error)
}

type columnFormatter struct {
	Separator string
}

func newColumnFormatter(sep string) *columnFormatter {
	return &columnFormatter{Separator: sep}
}

func (f *columnFormatter) format(columnNames []string, values []string) (string, error) {
	return strings.Join(values, f.Separator), nil
}

type ndjsonFormatter struct {
}

func newNdjsonFormatter() *ndjsonFormatter {
	return &ndjsonFormatter{}
}

func (f *ndjsonFormatter) format(columnNames []string, values []string) (string, error) {
	data := make(map[string]string, len(columnNames))
	for i, name := range columnNames {
		data[name] = values[i]
	}

	v, err := json.Marshal(data)
	if err != nil {
		return "", err
	}

	return string(v), nil
}
