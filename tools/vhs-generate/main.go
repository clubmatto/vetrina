package main

import (
	"bytes"
	"flag"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
	"sync"
)

// assetsDir is relative to the git repo root. If the repo structure changes,
// this needs to stay in sync with the actual VHS assets location.
const assetsDir = "assets/vhs"

type genTask struct {
	demo  string
	theme string
	gif   bool
}

func main() {
	repoRoot := getRepoRoot()

	var (
		theme    string
		list     bool
		help     bool
		tapeFile string
	)
	flag.StringVar(&theme, "t", "all", "theme: dark, light, or all")
	flag.StringVar(&theme, "theme", "all", "theme: dark, light, or all")
	flag.BoolVar(&list, "l", false, "list available projects")
	flag.BoolVar(&list, "list", false, "list available projects")
	flag.BoolVar(&help, "h", false, "show help")
	flag.StringVar(&tapeFile, "tape", "", "path to self-contained tape file (one-shot, no config split)")
	flag.Usage = func() {
		fmt.Fprintf(os.Stderr, `Usage: go run -C tools/vhs-generate . [OPTIONS] <PROJECT> [DEMO...]

Generate demo tapes using VHS.

Arguments:
  PROJECT     Project directory (e.g., fakedata)

Options:
  -t, --theme THEME    Generate only for theme: dark, light, or all (default: all)
  -l, --list           List available projects
      --tape FILE      One-shot: pipe a self-contained tape directly to VHS
  -h, --help           Show this help

Examples:
  go run -C tools/vhs-generate . fakedata               # All fakedata demos, both themes
  go run -C tools/vhs-generate . -t light fakedata      # Light theme only
  go run -C tools/vhs-generate . fakedata basic         # Specific demo, both themes
  go run -C tools/vhs-generate . --tape my-clip.tape    # One-shot recording
`)
	}
	flag.Parse()

	if help {
		flag.Usage()
		os.Exit(0)
	}

	if list {
		listProjects(filepath.Join(repoRoot, assetsDir))
		return
	}

	if _, err := exec.LookPath("vhs"); err != nil {
		fmt.Fprintln(os.Stderr, "Error: vhs not found. Install with: brew install vhs")
		os.Exit(1)
	}

	if tapeFile != "" {
		runTape(tapeFile)
		return
	}

	if theme != "all" && theme != "dark" && theme != "light" {
		fmt.Fprintf(os.Stderr, "Error: invalid theme %q. Must be: dark, light, or all\n", theme)
		os.Exit(1)
	}

	args := flag.Args()
	if len(args) == 0 {
		fmt.Fprintln(os.Stderr, "Error: no project specified")
		listProjects(filepath.Join(repoRoot, assetsDir))
		os.Exit(1)
	}

	project := args[0]
	demos := args[1:]

	vhsDir := filepath.Join(repoRoot, assetsDir)
	projectDir := filepath.Join(vhsDir, project)
	if fi, err := os.Stat(projectDir); err != nil || !fi.IsDir() {
		fmt.Fprintf(os.Stderr, "Error: project directory not found: %s\n", projectDir)
		os.Exit(1)
	}

	allDemos := discoverDemos(projectDir)
	if len(allDemos) == 0 {
		fmt.Fprintf(os.Stderr, "Error: no demos found in %s\n", projectDir)
		os.Exit(1)
	}

	if len(demos) == 0 {
		demos = allDemos
	}

	demoSet := make(map[string]bool, len(allDemos))
	for _, d := range allDemos {
		demoSet[d] = true
	}
	for _, d := range demos {
		if !demoSet[d] {
			fmt.Fprintf(os.Stderr, "Error: demo %q not found in project %s\n", d, project)
			fmt.Fprintf(os.Stderr, "Available demos: %v\n", allDemos)
			os.Exit(1)
		}
	}

	gifDemos := parseGifsTxt(projectDir)

	var themes []string
	if theme == "all" {
		themes = []string{"dark", "light"}
	} else {
		themes = []string{theme}
	}

	for _, th := range themes {
		themeFile := filepath.Join(vhsDir, fmt.Sprintf("config-%s.tape", th))
		if _, err := os.Stat(themeFile); err != nil {
			fmt.Fprintf(os.Stderr, "Error: theme config not found: %s\n", themeFile)
			os.Exit(1)
		}
	}

	reqFile := filepath.Join(projectDir, "requirements.sh")
	hasHooks := false
	if _, err := os.Stat(reqFile); err == nil {
		hasHooks = true
		if err := callHook(reqFile, "setup", projectDir, demos...); err != nil {
			fmt.Fprintf(os.Stderr, "Error: setup hook failed: %v\n", err)
			os.Exit(1)
		}
	}

	tasksByDemo := make(map[string][]genTask)
	for _, demo := range demos {
		for _, th := range themes {
			tasksByDemo[demo] = append(tasksByDemo[demo], genTask{demo: demo, theme: th})
			if gifDemos[demo] {
				tasksByDemo[demo] = append(tasksByDemo[demo], genTask{demo: demo, theme: th, gif: true})
			}
		}
	}

	var (
		wg   sync.WaitGroup
		mu   sync.Mutex
		errs []string
		sem  = make(chan struct{}, 4)
	)

	for _, tasks := range tasksByDemo {
		wg.Add(1)
		go func(tasks []genTask) {
			defer wg.Done()
			for _, t := range tasks {
				sem <- struct{}{}
				err := generateTask(vhsDir, projectDir, t, hasHooks, reqFile)
				<-sem
				if err != nil {
					mu.Lock()
					errs = append(errs, err.Error())
					mu.Unlock()
				}
			}
		}(tasks)
	}
	wg.Wait()

	if hasHooks {
		if err := callHook(reqFile, "cleanup", projectDir, demos...); err != nil {
			fmt.Fprintf(os.Stderr, "Error: cleanup hook failed: %v\n", err)
		}
	}

	if len(errs) > 0 {
		fmt.Fprintf(os.Stderr, "\n%d generation error(s):\n", len(errs))
		for _, e := range errs {
			fmt.Fprintf(os.Stderr, "  - %s\n", e)
		}
		os.Exit(1)
	}

	fmt.Println("\nDone! Tapes generated in", projectDir)
}

func getRepoRoot() string {
	out, err := exec.Command("git", "rev-parse", "--show-toplevel").CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: not in a git repository: %s\n", strings.TrimSpace(string(out)))
		os.Exit(1)
	}
	return strings.TrimSpace(string(out))
}

func listProjects(vhsDir string) {
	entries, err := os.ReadDir(vhsDir)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: reading %s: %v\n", vhsDir, err)
		os.Exit(1)
	}

	fmt.Println("Available projects:")
	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}
		demos := discoverDemos(filepath.Join(vhsDir, entry.Name()))
		if len(demos) > 0 {
			fmt.Printf("  - %s\n", entry.Name())
		}
	}
}

func discoverDemos(projectDir string) []string {
	pattern := filepath.Join(projectDir, "*.tape")
	matches, err := filepath.Glob(pattern)
	if err != nil {
		return nil
	}
	var demos []string
	for _, match := range matches {
		name := strings.TrimSuffix(filepath.Base(match), ".tape")
		if !strings.HasPrefix(name, "config") {
			demos = append(demos, name)
		}
	}
	sort.Strings(demos)
	return demos
}

func parseGifsTxt(projectDir string) map[string]bool {
	gifs := make(map[string]bool)
	data, err := os.ReadFile(filepath.Join(projectDir, "gifs.txt"))
	if err != nil {
		return gifs
	}
	for _, line := range strings.Split(string(data), "\n") {
		line = strings.TrimSpace(line)
		if idx := strings.IndexByte(line, '#'); idx >= 0 {
			line = strings.TrimSpace(line[:idx])
		}
		if line != "" {
			gifs[line] = true
		}
	}
	return gifs
}

func callHook(reqFile, hook, projectDir string, args ...string) error {
	quoted := make([]string, 0, 1+len(args))
	quoted = append(quoted, fmt.Sprintf("%q", projectDir))
	for _, a := range args {
		quoted = append(quoted, fmt.Sprintf("%q", a))
	}
	cmdStr := fmt.Sprintf(
		`source %q 2>/dev/null; if [[ "$(type -t %s)" == "function" ]]; then %s %s; fi`,
		reqFile, hook, hook, strings.Join(quoted, " "),
	)
	cmd := exec.Command("bash", "-c", cmdStr)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func generateTask(vhsDir, projectDir string, t genTask, hasHooks bool, reqFile string) error {
	ext := ".mp4"
	if t.gif {
		ext = ".gif"
	}
	outputFile := fmt.Sprintf("%s-%s%s", t.demo, t.theme, ext)

	tapeFile := filepath.Join(projectDir, t.demo+".tape")
	if _, err := os.Stat(tapeFile); err != nil {
		return fmt.Errorf("%s: tape file not found", outputFile)
	}

	baseConfig := filepath.Join(vhsDir, "config.tape")
	if _, err := os.Stat(baseConfig); err != nil {
		return fmt.Errorf("%s: base config not found", outputFile)
	}

	themeConfig := filepath.Join(vhsDir, fmt.Sprintf("config-%s.tape", t.theme))
	if _, err := os.Stat(themeConfig); err != nil {
		return fmt.Errorf("%s: theme config not found", outputFile)
	}

	if hasHooks {
		if err := callHook(reqFile, "before_each", projectDir, t.demo, t.theme); err != nil {
			return fmt.Errorf("%s: before_each hook failed", outputFile)
		}
	}

	fmt.Printf("Generating %s...\n", outputFile)

	var buf bytes.Buffer
	fmt.Fprintf(&buf, "Output %s\n", outputFile)
	if err := appendFile(&buf, baseConfig); err != nil {
		return fmt.Errorf("%s: reading base config: %w", outputFile, err)
	}
	buf.WriteString("\n")
	if err := appendFile(&buf, themeConfig); err != nil {
		return fmt.Errorf("%s: reading theme config: %w", outputFile, err)
	}
	buf.WriteString("\n")
	if err := appendFile(&buf, tapeFile); err != nil {
		return fmt.Errorf("%s: reading tape file: %w", outputFile, err)
	}

	cmd := exec.Command("vhs")
	cmd.Dir = projectDir
	cmd.Stdin = &buf
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		return fmt.Errorf("%s: vhs failed", outputFile)
	}

	fmt.Printf("  -> %s/%s\n", projectDir, outputFile)

	if hasHooks {
		if err := callHook(reqFile, "after_each", projectDir, t.demo, t.theme); err != nil {
			return fmt.Errorf("%s: after_each hook failed", outputFile)
		}
	}

	return nil
}

func appendFile(buf *bytes.Buffer, path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		return err
	}
	buf.Write(data)
	return nil
}

func runTape(path string) {
	absPath, err := filepath.Abs(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: cannot resolve tape path %q: %v\n", path, err)
		os.Exit(1)
	}

	if _, err := os.Stat(absPath); err != nil {
		fmt.Fprintf(os.Stderr, "Error: tape file not found: %s\n", absPath)
		os.Exit(1)
	}

	fmt.Printf("Generating %s...\n", absPath)

	data, err := os.ReadFile(absPath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: reading tape file: %v\n", err)
		os.Exit(1)
	}

	dir := filepath.Dir(absPath)

	cmd := exec.Command("vhs")
	cmd.Dir = dir
	cmd.Stdin = bytes.NewReader(data)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "Error: vhs failed: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("  -> done")
}
