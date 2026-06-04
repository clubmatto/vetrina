package output

import "charm.land/lipgloss/v2"

var (
	Success = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Bold(true)
	Error   = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Bold(true)
	Warning = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Bold(true)
	Info    = lipgloss.NewStyle().Foreground(lipgloss.Color("12"))
	Spinner = lipgloss.NewStyle().Foreground(lipgloss.Color("12"))
	Dim     = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	Bold    = lipgloss.NewStyle().Bold(true)
	Inline  = lipgloss.NewStyle().Inline(true)
)

var (
	TreePrefix  = lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Inline(true)
	TreeConnect = lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Inline(true)
)

var (
	CheckMark   = lipgloss.NewStyle().Foreground(lipgloss.Color("10")).Inline(true)
	CrossMark   = lipgloss.NewStyle().Foreground(lipgloss.Color("9")).Inline(true)
	WarningMark = lipgloss.NewStyle().Foreground(lipgloss.Color("11")).Inline(true)
	ArrowMark   = lipgloss.NewStyle().Foreground(lipgloss.Color("12")).Inline(true)
)

var (
	SpinnerFrames = []string{
		"⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏",
	}
)

func SpinnerFrame(i int) string {
	return SpinnerFrames[i%len(SpinnerFrames)]
}

var (
	tablePaddingVertical   = 1
	tablePaddingHorizontal = 2

	TableStyle = lipgloss.NewStyle().
			Border(lipgloss.RoundedBorder()).
			BorderForeground(lipgloss.Color("8")).
			Padding(tablePaddingVertical, tablePaddingHorizontal)

	TableHeaderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("15")).
				Bold(true)

	TableCellStyle = lipgloss.NewStyle().
			Foreground(lipgloss.Color("12"))

	TableBorderStyle = lipgloss.NewStyle().
				Foreground(lipgloss.Color("8"))
)

var (
	SectionHeader = lipgloss.NewStyle().
			Foreground(lipgloss.Color("15")).
			Bold(true).
			Underline(true)

	FlagName = lipgloss.NewStyle().
			Foreground(lipgloss.Color("12"))

	FlagShorthand = lipgloss.NewStyle().
			Foreground(lipgloss.Color("11"))

	FlagType = lipgloss.NewStyle().
			Foreground(lipgloss.Color("8"))

	FlagUsage = lipgloss.NewStyle().
			Foreground(lipgloss.Color("7"))

	FlagDefault = lipgloss.NewStyle().
			Foreground(lipgloss.Color("8"))

	GeneratorName  = lipgloss.NewStyle().Foreground(lipgloss.Color("12")).Inline(true)
	GeneratorDesc  = lipgloss.NewStyle().Foreground(lipgloss.Color("7")).Inline(true)
	GeneratorExtra = lipgloss.NewStyle().Foreground(lipgloss.Color("8")).Inline(true)

	UsageExample = lipgloss.NewStyle().
			Foreground(lipgloss.Color("12"))
)
