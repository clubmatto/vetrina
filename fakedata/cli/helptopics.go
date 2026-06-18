package cli

import (
	"embed"
	"io/fs"
	"path"
	"strings"

	"matto.club/vetrina/fakedata/output"
)

//go:embed helpdata/*.md
var helpTopicFS embed.FS

func AvailableTopics() []string {
	entries, err := fs.ReadDir(helpTopicFS, "helpdata")
	if err != nil {
		return nil
	}

	names := make([]string, 0, len(entries))
	for _, e := range entries {
		name := strings.TrimSuffix(e.Name(), ".md")
		names = append(names, name)
	}

	return names
}

func PrintHelpTopic(topic string) bool {
	content, err := helpTopicFS.ReadFile(path.Join("helpdata", topic+".md"))
	if err != nil {
		return false
	}

	output.Print(renderTopic(string(content)))

	return true
}

func renderTopic(content string) string {
	var buf strings.Builder
	lines := strings.Split(content, "\n")

	inCodeBlock := false
	for _, line := range lines {
		trimmed := strings.TrimSpace(line)

		if strings.HasPrefix(trimmed, "```") {
			inCodeBlock = !inCodeBlock

			continue
		}

		if inCodeBlock {
			buf.WriteString(output.Dim.Render(line))
			buf.WriteString("\n")

			continue
		}

		switch {
		case strings.HasPrefix(trimmed, "## "):
			renderSection(&buf, line, trimmed[3:], output.Bold)
		case strings.HasPrefix(trimmed, "# "):
			renderSection(&buf, line, trimmed[2:], output.SectionHeader)
		default:
			buf.WriteString(line)
			buf.WriteString("\n")
		}
	}

	return buf.String()
}

type topicStyler interface {
	Render(parts ...string) string
}

func renderSection(buf *strings.Builder, line, text string, style topicStyler) {
	indent := line[:strings.Index(line, text)]
	buf.WriteString(indent)
	buf.WriteString(style.Render(text))
	buf.WriteString("\n\n")
}
