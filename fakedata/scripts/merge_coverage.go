package main

import (
	"bufio"
	"fmt"
	"os"
	"strconv"
	"strings"
)

type entry struct {
	max int
}

func processLine(line string, coverage map[string]*entry) {
	if strings.HasPrefix(line, "mode:") {
		return
	}
	parts := strings.Fields(line)
	const minFields = 3
	if len(parts) < minFields {
		return
	}
	key := parts[0]
	count, err := strconv.Atoi(parts[2])
	if err != nil {
		return
	}

	if _, ok := coverage[key]; !ok {
		coverage[key] = &entry{max: count}
	} else if count > coverage[key].max {
		coverage[key].max = count
	}
}

func main() {
	coverage := make(map[string]*entry)

	for _, f := range os.Args[1:] {
		file, err := os.Open(f)
		if err != nil {
			continue
		}
		scanner := bufio.NewScanner(file)
		for scanner.Scan() {
			processLine(scanner.Text(), coverage)
		}
		file.Close()
	}

	total := 0
	covered := 0
	for _, e := range coverage {
		total++
		if e.max > 0 {
			covered++
		}
	}
	const percentMultiplier = 100
	fmt.Printf("Combined coverage: %d/%d (%.1f%%)\n", covered, total, float64(covered)/float64(total)*percentMultiplier)
}