package cli

import (
	"bytes"
	"fmt"
	"os"

	"matto.club/vetrina/fakedata/core"
	"matto.club/vetrina/fakedata/output"
)

var optionSignatures = map[string]string{
	"int":          "min,max",
	"float":        "precision:scale",
	"enum":         "val1,val2,val3,...",
	"file":         "path",
	"phone_number": "digits",
	"date":         "YYYY-MM-DD,YYYY-MM-DD",
	"datetime":     "YYYY-MM-DD,YYYY-MM-DD",
	"timestamp":    "YYYY-MM-DD,YYYY-MM-DD",
}

func formatGeneratorName(gen core.Generator) string {
	if !gen.IsCustom() {
		return gen.Name
	}

	sig, ok := optionSignatures[gen.Name]
	if !ok {
		return gen.Name + " [...]"
	}

	return gen.Name + " [" + sig + "]"
}

const generatorHelpPadding = 2

func generatorsHelp(generators core.Generators) string {
	maxInt := 0

	for _, gen := range generators {
		name := formatGeneratorName(gen)

		if len(name) > maxInt {
			maxInt = len(name)
		}
	}

	buffer := &bytes.Buffer{}
	pattern := fmt.Sprintf("%%-%ds%%s\n", maxInt+generatorHelpPadding)

	for _, gen := range generators {
		_, _ = fmt.Fprintf(buffer, pattern, formatGeneratorName(gen), gen.Desc)
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
	sig, ok := optionSignatures[g.Name]
	if ok {
		output.Printf("Arguments: %s\n\n", sig)
	}

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
