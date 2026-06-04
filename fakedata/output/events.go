package output

import (
	"encoding/json"
	"fmt"
)

type DBEvent struct {
	Stage  string `json:"stage"`
	Table  string `json:"table,omitempty"`
	Status string `json:"status,omitempty"`

	Current int `json:"current,omitempty"`
	Total   int `json:"total,omitempty"`

	Rows       int    `json:"rows,omitempty"`
	DurationMs int64  `json:"duration_ms,omitempty"`
	Reason     string `json:"reason,omitempty"`
	Error      string `json:"error,omitempty"`

	TotalTables  int    `json:"total_tables,omitempty"`
	TotalRows    int    `json:"total_rows,omitempty"`
	FailedTables string `json:"failed_tables,omitempty"`
}

func EmitEvent(event DBEvent) {
	if Default != nil && !Default.IsTTY() {
		data, err := json.Marshal(event)
		if err != nil {
			return
		}
		fmt.Fprintln(Default.stdout, string(data))
	}
}
