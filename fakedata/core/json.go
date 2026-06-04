package core

import (
	"fmt"
	"strings"
)

const (
	boolTrue         = 1
	maxBoolCases     = 2
	maxJSONPairs     = 3
	maxJSONKeyIdx    = 3
	maxJSONVal       = 100
	maxNameIdx       = 3
	maxCount         = 1000
	minArrayLen      = 1
	maxArrayLen      = 4
	maxJSONBArrayLen = 4
	maxPGArrayIntVal = 8
)

var jsonKeys = []string{"foo", "bar", "baz"}
var jsonNames = []string{"item", "product", "entry"}

func jsonGenerator(r *Registry) string {
	pairIdx := r.rng.IntN(maxJSONPairs)
	switch pairIdx {
	case 0:
		keyIdx := r.rng.IntN(maxJSONKeyIdx)
		val := r.rng.IntN(maxJSONVal)

		return fmt.Sprintf(`{"key": "%s", "value": %d}`, jsonKeys[keyIdx], val)
	case 1:
		id := uuidv4()
		active := r.rng.IntN(maxBoolCases) == boolTrue

		return fmt.Sprintf(`{"id": "%s", "active": %t}`, id, active)
	default:
		nameIdx := r.rng.IntN(maxNameIdx)
		count := r.rng.IntN(maxCount)
		ratio := r.rng.Float64()

		return fmt.Sprintf(`{"name": "%s", "count": %d, "ratio": %.2f}`,
			jsonNames[nameIdx], count, ratio)
	}
}

func pgArrayInt(r *Registry) string {
	length := r.rng.IntN(maxArrayLen) + minArrayLen
	var elems []string
	for i := 0; i < length; i++ {
		elems = append(elems, fmt.Sprintf("%d", r.rng.IntN(maxPGArrayIntVal)))
	}

	return "{" + strings.Join(elems, ",") + "}"
}

func jsonbArray(r *Registry) string {
	length := r.rng.IntN(maxJSONBArrayLen)
	var elems []string
	for i := 0; i < length; i++ {
		active := r.rng.IntN(maxBoolCases) == boolTrue
		elems = append(elems, fmt.Sprintf(`{"id": %d, "active": %v}`, r.rng.IntN(maxJSONVal), active))
	}
	if length == 0 {
		return "[]"
	}

	return fmt.Sprintf("[%s]", strings.Join(elems, ","))
}

func pgArrayText(r *Registry) string {
	n := r.rng.IntN(maxArrayLen) + minArrayLen
	var elems []string
	words := []string{"foo", "bar", "baz", "qux", "quux", "corge", "grault", "garply"}
	for i := 0; i < n; i++ {
		elems = append(elems, fmt.Sprintf(`"%s"`, words[r.rng.IntN(len(words))]))
	}

	return "{" + strings.Join(elems, ",") + "}"
}

func registerJSON(r *Registry) {
	r.Register(Generator{Name: "json", Desc: "JSON object", Func: func() string { return jsonGenerator(r) }})
	r.Register(Generator{Name: "jsonb_array", Desc: "JSONB array", Func: func() string { return jsonbArray(r) }})
	r.Register(Generator{Name: "pg_array_int", Desc: "hidden", Func: func() string { return pgArrayInt(r) }, Hidden: true})
	r.Register(Generator{Name: "pg_array_text", Desc: "hidden",
		Func: func() string { return pgArrayText(r) }, Hidden: true})
}
