package cli

import (
	"strings"

	"matto.club/vetrina/fakedata/output"
	flag "github.com/spf13/pflag"
)

const defaultRowLimit = 10

type Config struct {
	Completion     string
	Explore        bool
	Format         string
	Generator      string
	ListGenerators bool
	Header         bool
	Help           bool
	Limit          int
	Separator      string
	Seed           int64
	Stream         bool
	Template       string
	ShowVersion    bool
}

func ParseFlags() (Config, []string) {
	var cfg Config

	registerUtilityFlags(&cfg)
	registerColumnFlags(&cfg)
	registerDiscoveryFlags(&cfg)

	flag.Usage = func() {
		output.Print(`Usage:
  fakedata [options] [column-spec...]

Examples:
  fakedata email:int:1,100 name:full_name        generate 10 rows with two columns
  fakedata -n 5 -f ndjson city country           5 rows in NDJSON format

Column spec syntax: [name:][generator[:args]]
  email                    column "email" using email generator
  int:10,20                column "int" with range 10-20
  login:email              column "login" using email generator
  count:int:10,20          column "count" using int generator, range 10-20

Use ` + "`fakedata --help <topic>`" + ` for detailed help on columns, formats, seeding, streaming, templates.

`)
		printFlagGroup("Utility", "help", "version", "completion")
		printFlagGroup("Column mode", "format", "header", "rows", "separator", "seed", "stream", "template")
		printFlagGroup("Discovery", "explore", "generator", "generators")
	}
	flag.Parse()

	return cfg, flag.Args()
}

func registerUtilityFlags(cfg *Config) {
	flag.BoolVarP(&cfg.Help, "help", "h", false, "show this help; use --help <topic> for detailed guides")
	flag.BoolVarP(&cfg.ShowVersion, "version", "v", false, "show version information")
	flag.StringVarP(&cfg.Completion, "completion", "C", "",
		"print shell completion function (\"bash\", \"zsh\", \"fish\")")
}

func registerColumnFlags(cfg *Config) {
	flag.StringVarP(&cfg.Format, "format", "f", "column", "output format: column|ndjson")
	flag.BoolVarP(&cfg.Header, "header", "H", false, "print a header row with column names")
	flag.IntVarP(&cfg.Limit, "rows", "n", defaultRowLimit, "number of rows to generate")
	flag.StringVarP(&cfg.Separator, "separator", "s", "\t", "field separator for column format")
	flag.Int64Var(&cfg.Seed, "seed", 0, "seed for deterministic random generation")
	flag.BoolVarP(&cfg.Stream, "stream", "S", false, "stream rows indefinitely")
	flag.StringVarP(&cfg.Template, "template", "T", "", "template file to execute")
}

func registerDiscoveryFlags(cfg *Config) {
	flag.BoolVarP(&cfg.Explore, "explore", "e", false, "open the interactive generator browser")
	flag.StringVarP(&cfg.Generator, "generator", "g", "", "show details and examples for a generator")
	flag.BoolVarP(&cfg.ListGenerators, "generators", "G", false, "list available generators")
}

func printFlagGroup(title string, names ...string) {
	output.Println()
	output.Println(output.SectionHeader.Render(title))

	for _, name := range names {
		f := flag.CommandLine.Lookup(name)
		if f == nil {
			continue
		}

		output.Println(formatFlagLine(f))
	}
}

const flagAlignWidth = 30

func formatFlagLine(f *flag.Flag) string {
	var plain strings.Builder
	writeFlagName(&plain, f.Shorthand, f.Name)

	typ := typeName(f.Value.Type())
	if typ != "" {
		plain.WriteString(" ")
		plain.WriteString(typ)
	}

	var styled strings.Builder
	writeStyledFlagName(&styled, f.Shorthand, f.Name, typ)

	usage := formatFlagUsage(f)

	flagLen := plain.Len()
	if flagLen < flagAlignWidth {
		styled.WriteString(strings.Repeat(" ", flagAlignWidth-flagLen))
	}
	styled.WriteString(" ")
	styled.WriteString(output.FlagUsage.Render(usage))

	return styled.String()
}

func writeFlagName(w *strings.Builder, shorthand, name string) {
	if shorthand != "" {
		w.WriteString("  ")
		w.WriteString("-" + shorthand)
		w.WriteString(", ")
	} else {
		w.WriteString("    ")
	}
	w.WriteString("--" + name)
}

func writeStyledFlagName(w *strings.Builder, shorthand, name, typ string) {
	if shorthand != "" {
		w.WriteString("  ")
		w.WriteString(output.FlagShorthand.Render("-" + shorthand))
		w.WriteString(", ")
	} else {
		w.WriteString("    ")
	}
	w.WriteString(output.FlagName.Render("--" + name))

	if typ != "" {
		w.WriteString(" ")
		w.WriteString(output.FlagType.Render(typ))
	}
}

func formatFlagUsage(f *flag.Flag) string {
	usage := f.Usage
	if f.DefValue != "" && f.DefValue != "false" && f.DefValue != "[]" {
		def := f.DefValue
		if def == "\t" {
			def = `"\t"`
		}
		usage += " (default " + def + ")"
	}

	return usage
}

func typeName(t string) string {
	switch t {
	case "bool":
		return ""
	case "float64":
		return "float"
	case "int64":
		return "int"
	case "stringArray":
		return "strings"
	default:
		return t
	}
}


