package cli

import (
	"fmt"
	"strings"

	"github.com/charmbracelet/bubbles/list"
	tea "github.com/charmbracelet/bubbletea"
	"github.com/charmbracelet/lipgloss"
	"golang.org/x/text/cases"
	"golang.org/x/text/language"

	"matto.club/vetrina/fakedata/core"
)

const (
	sampleCount     = 5
	listWidthRatio  = 30
	percentageRatio = 100
	minPanelWidth   = 30
	panelGap        = 2
	defaultWidth    = 80
	detailPadLeft   = 2
	detailPadRight  = 1
)

var (
	detailTitle   = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("15")).Underline(true)
	sectionStyle  = lipgloss.NewStyle().Bold(true).Foreground(lipgloss.Color("12"))
	sampleStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("7"))
	metaStyle     = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	footerStyle   = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
	separatorLine = lipgloss.NewStyle().Foreground(lipgloss.Color("8"))
)

type generatorItem struct {
	gen     core.Generator
	samples []string
}

func (i generatorItem) Title() string       { return i.gen.Name }
func (i generatorItem) Description() string { return i.gen.Desc }
func (i generatorItem) FilterValue() string { return i.gen.Name }

type browseModel struct {
	list  list.Model
	width int
	ready bool
}

func templateName(name string) string {
	c := cases.Title(language.English)
	s := strings.ReplaceAll(name, ".", " ")
	s = strings.ReplaceAll(s, "_", " ")

	return strings.ReplaceAll(c.String(s), " ", "")
}

func generateSamples(gen core.Generator) []string {
	samples := make([]string, 0, sampleCount)
	if gen.IsCustom() {
		generateCustomSamples(gen, &samples)
	} else {
		for i := 0; i < sampleCount; i++ {
			samples = append(samples, gen.Func())
		}
	}

	return samples
}

func generateCustomSamples(gen core.Generator, samples *[]string) {
	exampleParams := map[string]string{
		"int":          "0,100",
		"date":         "2020-01-01,2024-12-31",
		"datetime":     "2020-01-01,2024-12-31",
		"timestamp":    "2020-01-01,2024-12-31",
		"enum":         "apple,banana,cherry",
		"phone_number": "10",
		"float":        "6:2",
	}
	params := ""
	if p, ok := exampleParams[gen.Name]; ok {
		params = p
	}
	fn, err := gen.CustomFunc(params)
	if err == nil && fn != nil {
		for i := 0; i < sampleCount; i++ {
			*samples = append(*samples, fn())
		}
	}
}

func newBrowseModel(reg *core.Registry) browseModel {
	gens := reg.NewGenerators().Visible()
	items := make([]list.Item, len(gens))
	for i, g := range gens {
		items[i] = generatorItem{
			gen:     g,
			samples: generateSamples(g),
		}
	}

	d := list.NewDefaultDelegate()
	d.SetSpacing(0)
	d.ShowDescription = false
	d.Styles.NormalTitle = d.Styles.NormalTitle.Bold(true).Foreground(lipgloss.Color("12"))
	d.Styles.SelectedTitle = d.Styles.SelectedTitle.
		Bold(true).
		Foreground(lipgloss.Color("0")).
		Background(lipgloss.Color("11")).
		PaddingRight(1)
	d.Styles.DimmedTitle = d.Styles.DimmedTitle.Foreground(lipgloss.Color("8"))
	d.Styles.FilterMatch = lipgloss.NewStyle().
		Bold(true).
		Foreground(lipgloss.Color("0")).
		Background(lipgloss.Color("11"))

	l := list.New(items, d, 0, 0)
	l.Title = " / to search"
	l.SetShowHelp(false)
	l.SetShowStatusBar(true)
	l.SetShowPagination(false)
	l.SetFilteringEnabled(true)

	return browseModel{
		list:  l,
		width: defaultWidth,
	}
}

func (m browseModel) Init() tea.Cmd {
	return nil
}

func (m browseModel) Update(msg tea.Msg) (tea.Model, tea.Cmd) {
	switch msg := msg.(type) {
	case tea.WindowSizeMsg:
		m.width = msg.Width
		m.ready = true

		listWidth := m.width * listWidthRatio / percentageRatio
		if listWidth < minPanelWidth {
			listWidth = minPanelWidth
		}

		m.list.SetSize(listWidth, msg.Height-1)

		return m, nil
	}

	var cmd tea.Cmd
	m.list, cmd = m.list.Update(msg)

	return m, cmd
}

func (m browseModel) View() string {
	if !m.ready {
		return "\n  Loading..."
	}

	listWidth := m.width * listWidthRatio / percentageRatio
	if listWidth < minPanelWidth {
		listWidth = minPanelWidth
	}
	detailWidth := m.width - listWidth - panelGap
	if detailWidth < minPanelWidth {
		detailWidth = minPanelWidth
	}

	listPanel := lipgloss.NewStyle().Width(listWidth).Render(m.list.View())
	detailPanel := m.renderDetail(detailWidth)

	body := lipgloss.JoinHorizontal(
		lipgloss.Top,
		listPanel,
		separatorLine.Render("│"),
		detailPanel,
	)

	footer := footerStyle.Render("  / search · ↑↓ navigate · q quit")
	footerLine := lipgloss.NewStyle().Padding(0, 1).Render(footer)

	return fmt.Sprintf("%s\n%s\n", body, footerLine)
}

func (m browseModel) renderDetail(width int) string {
	filterVal := m.list.FilterInput.Value()

	if filterVal != "" && m.list.SelectedItem() == nil {
		return metaStyle.Render(fmt.Sprintf("filter: %s (no matches)", filterVal))
	}

	var b strings.Builder
	if filterVal != "" {
		b.WriteString(metaStyle.Render(fmt.Sprintf("filter: %s", filterVal)))
		b.WriteString("\n\n")
	}

	item := m.list.SelectedItem()
	if item == nil {
		b.WriteString(metaStyle.Render("press / to search generators"))

		return lipgloss.NewStyle().Width(width).Padding(0, detailPadRight, 0, detailPadLeft).Render(b.String())
	}

	gi, ok := item.(generatorItem)
	if !ok {
		return ""
	}

	gen := gi.gen

	b.WriteString(detailTitle.Render(gen.Name))
	b.WriteString("\n")
	b.WriteString(gen.Desc)
	b.WriteString("\n\n")

	b.WriteString(sectionStyle.Render("template"))
	b.WriteString(fmt.Sprintf("  {{%s}}\n", templateName(gen.Name)))

	b.WriteString("\n")
	b.WriteString(sectionStyle.Render("example"))
	for _, s := range gi.samples {
		b.WriteString("\n")
		b.WriteString(sampleStyle.Render("  " + s))
	}
	b.WriteString("\n\n")

	b.WriteString(sectionStyle.Render("usage"))
	b.WriteString(fmt.Sprintf("\n  fakedata %s", gen.Name))
	if gen.IsCustom() {
		exampleParams := map[string]string{
			"int":          "0,100",
			"date":         "2020-01-01,2024-12-31",
			"datetime":     "2020-01-01,2024-12-31",
			"timestamp":    "2020-01-01,2024-12-31",
			"enum":         "apple,banana,cherry",
			"phone_number": "10",
			"float":        "6:2",
		}
		if params, ok := exampleParams[gen.Name]; ok {
			b.WriteString(fmt.Sprintf("\n  fakedata %s:%s", gen.Name, params))
		}
	}

	return lipgloss.NewStyle().Width(width).Padding(0, detailPadRight, 0, detailPadLeft).Render(b.String())
}

func runBrowse(reg *core.Registry) {
	m := newBrowseModel(reg)
	p := tea.NewProgram(m, tea.WithAltScreen())
	if _, err := p.Run(); err != nil {
		panic(err)
	}
}
