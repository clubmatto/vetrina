package core

import (
	"fmt"
	"math"
	"os"
	"strconv"
	"strings"
)

const (
	distinctParts                 = 2
	distinctMinCount              = 1
	distinctMaxAttemptsMultiplier = 100
)

func boolean(r *Registry) string {
	const booleanChoiceCount = 2

	result := r.rng.IntN(booleanChoiceCount) == 1

	return fmt.Sprintf("%t", result)
}

func integer(r *Registry, options string) (func() string, error) {
	minInt := 0
	maxInt := 1000

	var low, high string

	intRange := strings.Split(options, ",")
	low = intRange[0]

	if len(intRange) > 1 {
		high = intRange[1]
	}

	if len(low) > 0 {
		m, err := strconv.Atoi(low)
		if err != nil {
			return nil, fmt.Errorf("could not convert min: %v", err)
		}

		minInt = m

		if len(high) > 0 {
			m, err = strconv.Atoi(high)
			if err != nil {
				return nil, fmt.Errorf("could not convert max: %v", err)
			}

			maxInt = m
		}
	}

	if minInt > maxInt {
		return nil, fmt.Errorf("max(%d) is smaller than min(%d)", maxInt, minInt)
	}

	return func() string {
		n := minInt + r.rng.IntN(maxInt+1-minInt)

		return strconv.Itoa(n)
	}, nil
}

func file(r *Registry, path string) (func() string, error) {
	if path == "" {
		return nil, fmt.Errorf("no file path given")
	}

	filePath := strings.Trim(path, "'\"")

	f, err := os.ReadFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("could not read file %s: %v", filePath, err)
	}

	content := strings.Split(strings.Trim(string(f), "\n"), "\n")
	list := r.withList(content)

	return func() string { return list() }, nil
}

func enum(r *Registry, options string) (func() string, error) {
	list := []string{"foo", "bar", "baz"}
	if options != "" {
		list = strings.Split(options, ",")
	}

	return r.withList(list), nil
}

func distinct(r *Registry, options string) (func() string, error) {
	parts := strings.SplitN(options, ":", distinctParts)
	if len(parts) != distinctParts || parts[0] == "" || parts[1] == "" {
		return nil, fmt.Errorf("expected count:generator[:options], got: %s", options)
	}

	count, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, fmt.Errorf("could not convert count: %v", err)
	}
	if count < distinctMinCount {
		return nil, fmt.Errorf("count must be at least %d, got: %d", distinctMinCount, count)
	}

	innerParts := strings.SplitN(parts[1], ":", distinctParts)
	innerKey := innerParts[0]
	innerOptions := ""
	if len(innerParts) > distinctParts-1 {
		innerOptions = innerParts[1]
	}

	inner, err := r.ExtractFunc(innerKey, innerOptions)
	if err != nil {
		return nil, fmt.Errorf("could not build inner generator %q: %v", innerKey, err)
	}

	pool, err := buildDistinctPool(r, inner, count, innerKey)
	if err != nil {
		return nil, err
	}

	return r.withList(pool), nil
}

func buildDistinctPool(r *Registry, inner func() string, count int, innerKey string) ([]string, error) {
	seen := make(map[string]struct{}, count)
	pool := make([]string, 0, count)
	maxAttempts := count * distinctMaxAttemptsMultiplier

	for attempts := 0; len(pool) < count && attempts < maxAttempts; attempts++ {
		v := inner()
		if _, ok := seen[v]; ok {
			continue
		}
		seen[v] = struct{}{}
		pool = append(pool, v)
	}

	if len(pool) < count {
		return nil, fmt.Errorf(
			"could not generate %d distinct values from %q after %d attempts", count, innerKey, maxAttempts)
	}

	return pool, nil
}

func floatWithOptions(r *Registry, options string) (func() string, error) {
	if options == "" {
		return func() string {
			v := strconv.FormatFloat(r.rng.NormFloat64()*1000, 'f', 4, 64)

			return v
		}, nil
	}

	const (
		floatOptionParts = 2
		sigmaDivisor     = 4
	)

	parts := strings.Split(options, ",")
	if len(parts) != floatOptionParts {
		return nil, fmt.Errorf("expected precision,scale format, got: %s", options)
	}

	precision, err := strconv.Atoi(parts[0])
	if err != nil {
		return nil, err
	}
	scale, err := strconv.Atoi(parts[1])
	if err != nil {
		return nil, err
	}

	maxVal := math.Pow10(precision-scale) - math.Pow10(-scale)
	sigma := maxVal / sigmaDivisor

	return func() string {
		v := r.rng.NormFloat64() * sigma
		if v > maxVal {
			v = maxVal
		}
		if v < -maxVal {
			v = -maxVal
		}
		formatted := strconv.FormatFloat(v, 'f', scale, 64)

		return formatted
	}, nil
}

func registerTypes(r *Registry) {
	r.Register(Generator{Name: "boolean", Desc: "true or false", Func: func() string { return boolean(r) }})
	r.Register(Generator{Name: "enum", Desc: "value from an enum. By default, the enum is foo,bar,baz. " +
		"It accepts a list of comma-separated values", CustomFunc: func(options string) (func() string, error) {
		return enum(r, options)
	}})
	r.Register(Generator{Name: "file", Desc: "value from a file (relative or absolute path). " +
		"File must contain one value per line", CustomFunc: func(options string) (func() string, error) {
		return file(r, options)
	}})
	r.Register(Generator{Name: "distinct", Desc: "value sampled from a pool of N distinct values produced by an " +
		"inner generator. Accepts count:generator[:options], e.g. distinct:50000:uuidv4",
		CustomFunc: func(options string) (func() string, error) {
			return distinct(r, options)
		}})
	r.Register(Generator{Name: "float", Desc: "decimal number", CustomFunc: func(options string) (func() string, error) {
		return floatWithOptions(r, options)
	}})
	r.Register(Generator{Name: "int", Desc: "positive integer between 1 and 1000",
		CustomFunc: func(options string) (func() string, error) {
			return integer(r, options)
		}})
}
