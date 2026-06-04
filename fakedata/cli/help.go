package cli

import (
	"bytes"
	"fmt"
	"os"

	"matto.club/vetrina/fakedata/core"
	"matto.club/vetrina/fakedata/output"
)

const generatorHelpPadding = 2

func generatorsHelp(generators core.Generators) string {
	maxInt := 0

	for _, gen := range generators {
		name := gen.Name
		if gen.IsCustom() {
			name = gen.Name + "*"
		}

		if len(name) > maxInt {
			maxInt = len(name)
		}
	}

	buffer := &bytes.Buffer{}
	pattern := fmt.Sprintf("%%-%ds%%s\n", maxInt+generatorHelpPadding)

	for _, gen := range generators {
		name := gen.Name
		if gen.IsCustom() {
			name = gen.Name + "*"
		}

		_, _ = fmt.Fprintf(buffer, pattern, name, gen.Desc)
	}

	return buffer.String()
}

func showGeneratorHelp(g *core.Generator) {
	output.Printf("Description: %s\n\n", g.Desc)

	if g.IsCustom() {
		showCustomGeneratorHelp(g)

		return
	}

	output.Print("Example:\n\n")

	for i := 0; i < 5; i++ {
		output.Println(g.Func())
	}
}

func showCustomGeneratorHelp(g *core.Generator) {
	exampleParams := map[string]string{
		"int":          "0,100",
		"date":         "2020-01-01,2024-12-31",
		"enum":         "apple,banana,cherry",
		"phone_number": "10",
	}
	if params, ok := exampleParams[g.Name]; ok {
		output.Printf("Usage: %s:%s\n\nExample:\n\n", g.Name, params)

		fn, err := g.CustomFunc(params)
		if err != nil {
			output.Printf("could not generate example: %v", err)
			os.Exit(1)
		}

		for i := 0; i < 5; i++ {
			output.Println(fn())
		}

		return
	}

	output.Print("Example:\n\n")

	for i := 0; i < 5; i++ {
		fn, err := g.CustomFunc("")
		if err != nil {
			output.Printf("could not generate example: %v", err)
			os.Exit(1)
		}

		output.Println(fn())
	}
}
