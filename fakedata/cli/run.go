package cli

import (
	"context"
	"os"
	"strings"

	"matto.club/vetrina/fakedata/core"
	"matto.club/vetrina/fakedata/output"
	flag "github.com/spf13/pflag"
)

func Run(version string, ctx context.Context) {
	cfg, args := ParseFlags()
	reg := core.NewRegistry()
	if cfg.Seed != 0 {
		reg.Seed(cfg.Seed)
	}
	RunCLIMode(reg, version, cfg, args, ctx)
}

func RunCLIMode(reg *core.Registry, version string, cfg Config, args []string, ctx context.Context) {
	if handleHelpSubcommand(args) {
		return
	}

	if handleUtilityFlags(reg, version, cfg, args) {
		return
	}

	runColumnMode(reg, args, cfg, ctx)
}

func handleUtilityFlags(reg *core.Registry, version string, cfg Config, args []string) bool {
	if cfg.Help {
		flag.Usage()
		os.Exit(0)
	}

	if cfg.ShowVersion {
		output.Println(version)
		os.Exit(0)
	}

	if cfg.Completion != "" {
		completion, err := getCompletionFunc(reg, cfg.Completion)
		if err != nil {
			output.Println(err)
		}

		output.Printf("%s\n", completion)
		os.Exit(0)
	}

	generatorsList := reg.NewGenerators()

	if cfg.ListGenerators {
		output.Print(generatorsHelp(generatorsList.Visible()))
		os.Exit(0)
	}

	if cfg.Generator != "" {
		g := generatorsList.FindByName(cfg.Generator)
		if g == nil {
			output.Printf("no generator named %q\n", cfg.Generator)
			os.Exit(1)
		}
		showGeneratorHelp(g)
		os.Exit(0)
	}

	if tmpl := findTemplate(cfg.Template); tmpl != "" {
		if err := reg.ExecuteTemplate(tmpl, cfg.Limit, cfg.Stream); err != nil {
			output.Println(err)
			os.Exit(1)
		}

		return true
	}

	return false
}

func handleHelpSubcommand(args []string) bool {
	if len(args) == 0 || args[0] != "help" {
		return false
	}

	if len(args) > 1 {
		if !PrintHelpTopic(args[1]) {
			output.Printf("no help topic %q\n", args[1])
			os.Exit(1)
		}
		os.Exit(0)
	}

	output.Println("Available topics: " + strings.Join(AvailableTopics(), ", "))
	output.Println("Use `fakedata help <topic>` for details.")
	os.Exit(0)

	return true
}

func runColumnMode(reg *core.Registry, args []string, cfg Config, ctx context.Context) {
	if len(args) == 0 {
		flag.Usage()
		os.Exit(0)
	}

	columns, err := core.NewColumns(reg, args)
	if err != nil {
		output.Printf("%v\n\n", err)
		flag.Usage()
		os.Exit(1)
	}

	formatter := resolveFormatter(cfg.Format, cfg.Separator)
	emitRows(columns, formatter, cfg.Header, cfg.Limit, cfg.Stream, ctx)
}
