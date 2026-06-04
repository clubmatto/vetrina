package main

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"crypto/sha256"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"
)

type config struct {
	tagPrefix string
	tag       string
	repo      string
	token     string
	brewPath  string
}

type target struct {
	goos   string
	goarch string
}

type checksums map[string]string

var info struct {
	repo    string
	project string
	tag     string
	version string
	token   string
}

func main() {
	cfg := parseFlags()
	deriveInfo(cfg)
	repoRoot := getRepoRoot()
	projectDir := filepath.Join(repoRoot, info.project)

	targets := []target{
		{"darwin", "amd64"},
		{"darwin", "arm64"},
		{"linux", "amd64"},
		{"linux", "arm64"},
		{"windows", "amd64"},
		{"windows", "arm64"},
	}

	buildProject(projectDir, info.project, info.version, targets)
	archiveBuilds(projectDir, info.project, info.version, targets)
	checksums := checksumsFile(projectDir, info.project, info.version, targets)
	body := changelog(info.project, repoRoot, info.tag)
	releaseID := createRelease(body)
	uploadArchives(releaseID, projectDir, info.project, info.version, targets)

	if cfg.brewPath != "" {
		generateFormula(info.version, checksums, cfg.brewPath, repoRoot)
		commitFormula(cfg.brewPath, repoRoot)
	}
}

func parseFlags() config {
	var cfg config
	flag.StringVar(&cfg.tagPrefix, "tag-prefix", "", "Tag prefix (e.g. fakedata/)")
	flag.StringVar(&cfg.tag, "tag", "", "Release tag (e.g. fakedata/v0.1.0)")
	flag.StringVar(&cfg.repo, "repo", "", "GitHub repository (e.g. clubmatto/vetrina)")
	flag.StringVar(&cfg.brewPath, "brew", "", "Path to Homebrew formula file")
	flag.Parse()

	if cfg.tagPrefix == "" {
		fmt.Fprintln(os.Stderr, "error: --tag-prefix is required")
		os.Exit(1)
	}
	if cfg.tag == "" {
		fmt.Fprintln(os.Stderr, "error: --tag is required")
		os.Exit(1)
	}
	if cfg.repo == "" {
		fmt.Fprintln(os.Stderr, "error: --repo is required")
		os.Exit(1)
	}
	return cfg
}

func deriveInfo(cfg config) {
	parts := strings.SplitN(cfg.repo, "/", 2)
	if len(parts) != 2 {
		fmt.Fprintf(os.Stderr, "error: invalid --repo: %s\n", cfg.repo)
		os.Exit(1)
	}

	project := strings.TrimRight(cfg.tagPrefix, "/")
	version := strings.TrimPrefix(cfg.tag, cfg.tagPrefix)
	version = strings.TrimPrefix(version, "v")
	token := cfg.token
	if token == "" {
		token = os.Getenv("GITHUB_TOKEN")
	}

	fmt.Printf("tag: %s\n", cfg.tag)
	fmt.Printf("project: %s\n", project)
	fmt.Printf("version: %s\n", version)

	info.repo = cfg.repo
	info.project = project
	info.tag = cfg.tag
	info.version = version
	info.token = token
}

func getRepoRoot() string {
	out, err := exec.Command("git", "rev-parse", "--show-toplevel").CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "error finding repo root: %s\n", strings.TrimSpace(string(out)))
		os.Exit(1)
	}
	return strings.TrimSpace(string(out))
}

func buildProject(dir, project, version string, targets []target) {
	distDir := filepath.Join(dir, "dist")
	os.RemoveAll(distDir)

	ldflags := fmt.Sprintf("-s -w -X main.version=%s", version)

	for _, t := range targets {
		binName := project
		if t.goos == "windows" {
			binName += ".exe"
		}
		outputDir := filepath.Join(distDir, fmt.Sprintf("%s_%s_%s_%s", project, version, t.goos, t.goarch))
		os.MkdirAll(outputDir, 0755)
		outputPath := filepath.Join(outputDir, binName)

		cmd := exec.Command("go", "build", "-trimpath", "-ldflags", ldflags, "-o", outputPath, ".")
		cmd.Dir = dir
		cmd.Env = append(os.Environ(), "GOOS="+t.goos, "GOARCH="+t.goarch)
		cmd.Stdout = os.Stdout
		cmd.Stderr = os.Stderr

		fmt.Printf("building %s_%s_%s...\n", project, t.goos, t.goarch)
		if err := cmd.Run(); err != nil {
			fmt.Fprintf(os.Stderr, "error building %s/%s: %v\n", t.goos, t.goarch, err)
			os.Exit(1)
		}
	}
}

func archiveBuilds(dir, project, version string, targets []target) {
	distDir := filepath.Join(dir, "dist")
	for _, t := range targets {
		srcDir := filepath.Join(distDir, fmt.Sprintf("%s_%s_%s_%s", project, version, t.goos, t.goarch))
		binName := project
		if t.goos == "windows" {
			binName += ".exe"
		}
		srcFile := filepath.Join(srcDir, binName)
		archiveName := fmt.Sprintf("%s_%s_%s_%s", project, version, t.goos, t.goarch)

		fmt.Printf("archiving %s...\n", archiveName)

		if t.goos == "windows" {
			archivePath := filepath.Join(distDir, archiveName+".zip")
			zipFile, err := os.Create(archivePath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error creating zip %s: %v\n", archivePath, err)
				os.Exit(1)
			}
			zw := zip.NewWriter(zipFile)
			fw, err := zw.Create(binName)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error adding file to zip: %v\n", err)
				os.Exit(1)
			}
			writeFileToWriter(fw, srcFile)
			zw.Close()
			zipFile.Close()
		} else {
			archivePath := filepath.Join(distDir, archiveName+".tar.gz")
			tarFile, err := os.Create(archivePath)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error creating tar.gz %s: %v\n", archivePath, err)
				os.Exit(1)
			}
			gw := gzip.NewWriter(tarFile)
			tw := tar.NewWriter(gw)

			fi, err := os.Stat(srcFile)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error stat %s: %v\n", srcFile, err)
				os.Exit(1)
			}

			data, err := os.ReadFile(srcFile)
			if err != nil {
				fmt.Fprintf(os.Stderr, "error reading %s: %v\n", srcFile, err)
				os.Exit(1)
			}

			hdr := &tar.Header{
				Name:     binName,
				Size:     fi.Size(),
				Mode:     0755,
				ModTime:  fi.ModTime(),
				Typeflag: tar.TypeReg,
			}
			if err := tw.WriteHeader(hdr); err != nil {
				fmt.Fprintf(os.Stderr, "error writing tar header: %v\n", err)
				os.Exit(1)
			}
			if _, err := tw.Write(data); err != nil {
				fmt.Fprintf(os.Stderr, "error writing tar data: %v\n", err)
				os.Exit(1)
			}
			tw.Close()
			gw.Close()
			tarFile.Close()
		}

		os.RemoveAll(srcDir)
	}
}

func writeFileToWriter(w io.Writer, path string) {
	data, err := os.ReadFile(path)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", path, err)
		os.Exit(1)
	}
	if _, err := w.Write(data); err != nil {
		fmt.Fprintf(os.Stderr, "error writing data: %v\n", err)
		os.Exit(1)
	}
}

func checksumsFile(dir, project, version string, targets []target) checksums {
	distDir := filepath.Join(dir, "dist")
	cs := make(checksums)
	sb := new(strings.Builder)

	for _, t := range targets {
		ext := ".tar.gz"
		if t.goos == "windows" {
			ext = ".zip"
		}
		archiveName := fmt.Sprintf("%s_%s_%s_%s%s", project, version, t.goos, t.goarch, ext)
		archivePath := filepath.Join(distDir, archiveName)

		data, err := os.ReadFile(archivePath)
		if err != nil {
			fmt.Fprintf(os.Stderr, "error reading %s: %v\n", archivePath, err)
			os.Exit(1)
		}

		hash := fmt.Sprintf("%x", sha256.Sum256(data))
		cs[archiveName] = hash
		fmt.Fprintf(sb, "%s  %s\n", hash, archiveName)
	}

	checkPath := filepath.Join(distDir, fmt.Sprintf("%s_%s_checksums.txt", project, version))
	if err := os.WriteFile(checkPath, []byte(sb.String()), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "error writing checksums: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("checksums written to %s\n", checkPath)
	return cs
}

func changelog(project, repoRoot, currentTag string) string {
	prevTag := previousTag(project, repoRoot)

	var sb strings.Builder
	if prevTag == "" {
		sb.WriteString("Initial release.\n")
		return sb.String()
	}

	paths := []string{
		project + "/",
		".github/workflows/" + project + "-release.yml",
		"brew/" + project + "/",
	}

	args := []string{"log", "--oneline", "--no-decorate", prevTag + ".." + currentTag}
	for _, p := range paths {
		args = append(args, "--", p)
	}

	out, err := exec.Command("git", args...).CombinedOutput()
	if err != nil {
		fmt.Fprintf(os.Stderr, "warning: changelog failed: %s\n", strings.TrimSpace(string(out)))
		return ""
	}

	lines := strings.Split(strings.TrimSpace(string(out)), "\n")
	for _, line := range lines {
		if line == "" {
			continue
		}
		fmt.Fprintf(&sb, "- %s\n", line)
	}
	return strings.TrimSpace(sb.String())
}

func previousTag(project, repoRoot string) string {
	pattern := fmt.Sprintf("%s/v*", project)
	cmd := exec.Command("git", "describe", "--tags", "--abbrev=0", "--match", pattern, "HEAD^")
	cmd.Dir = repoRoot
	out, err := cmd.CombinedOutput()
	if err != nil {
		return ""
	}
	return strings.TrimSpace(string(out))
}

func createRelease(body string) int64 {
	if info.token == "" {
		fmt.Fprintln(os.Stderr, "error: no token provided (use --token or GITHUB_TOKEN env)")
		os.Exit(1)
	}

	payload := map[string]interface{}{
		"tag_name":   info.tag,
		"name":       info.tag,
		"body":       body,
		"prerelease": isPrerelease(info.version),
	}
	data, _ := json.Marshal(payload)

	url := fmt.Sprintf("https://api.github.com/repos/%s/releases", info.repo)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(data))
	req.Header.Set("Authorization", "Bearer "+info.token)
	req.Header.Set("Content-Type", "application/json")

	resp := doRequest(req)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "error creating release: %s %s\n", resp.Status, strings.TrimSpace(string(respBody)))
		os.Exit(1)
	}

	var result struct {
		ID int64 `json:"id"`
	}
	json.NewDecoder(resp.Body).Decode(&result)

	fmt.Printf("release created: %s\n", info.tag)
	return result.ID
}

func isPrerelease(version string) bool {
	return strings.Contains(version, "-") || strings.Contains(version, "beta") || strings.Contains(version, "rc")
}

func uploadArchives(releaseID int64, dir, project, version string, targets []target) {
	distDir := filepath.Join(dir, "dist")

	entries, _ := os.ReadDir(distDir)
	sort.Slice(entries, func(i, j int) bool {
		return entries[i].Name() < entries[j].Name()
	})

	for _, entry := range entries {
		if entry.IsDir() {
			continue
		}
		path := filepath.Join(distDir, entry.Name())
		uploadAsset(releaseID, path, entry.Name())
	}
}

func uploadAsset(releaseID int64, filePath, assetName string) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error reading %s: %v\n", filePath, err)
		os.Exit(1)
	}

	url := fmt.Sprintf("https://uploads.github.com/repos/%s/releases/%d/assets?name=%s",
		info.repo, releaseID, assetName)
	req, _ := http.NewRequest("POST", url, bytes.NewReader(data))
	req.Header.Set("Authorization", "Bearer "+info.token)
	req.Header.Set("Content-Type", "application/octet-stream")

	resp := doRequest(req)
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		respBody, _ := io.ReadAll(resp.Body)
		fmt.Fprintf(os.Stderr, "error uploading %s: %s %s\n", assetName, resp.Status, strings.TrimSpace(string(respBody)))
		os.Exit(1)
	}
	fmt.Printf("uploaded %s\n", assetName)
}

func doRequest(req *http.Request) *http.Response {
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error making request: %v\n", err)
		os.Exit(1)
	}
	return resp
}

func generateFormula(version string, cs checksums, brewPath, repoRoot string) {
	absPath := filepath.Join(repoRoot, brewPath)
	dir := filepath.Dir(absPath)
	os.MkdirAll(dir, 0755)

	urlFor := func(goos, goarch string) string {
		name := fmt.Sprintf("fakedata_%s_%s_%s.tar.gz", version, goos, goarch)
		return fmt.Sprintf("https://github.com/%s/releases/download/%s/%s", info.repo, info.tag, name)
	}

	shaFor := func(goos, goarch string) string {
		name := fmt.Sprintf("fakedata_%s_%s_%s.tar.gz", version, goos, goarch)
		return cs[name]
	}

	var sb strings.Builder
	fmt.Fprintf(&sb, `class Fakedata < Formula
  desc "CLI tool to generate fake data rows for testing and development"
  homepage "https://matto.club/vetrina/fakedata"
  license "MIT"
  version "%s"

  if OS.mac?
    if Hardware::CPU.intel?
      url "%s"
      sha256 "%s"
    elsif Hardware::CPU.arm?
      url "%s"
      sha256 "%s"
    end
  elsif OS.linux?
    if Hardware::CPU.intel?
      url "%s"
      sha256 "%s"
    elsif Hardware::CPU.arm?
      url "%s"
      sha256 "%s"
    end
  end

  def install
    bin.install "fakedata"
  end

  test do
    output = shell_output("#{bin}/fakedata --help")
    assert_match "fakedata", output
  end
end
`,
		version,
		urlFor("darwin", "amd64"), shaFor("darwin", "amd64"),
		urlFor("darwin", "arm64"), shaFor("darwin", "arm64"),
		urlFor("linux", "amd64"), shaFor("linux", "amd64"),
		urlFor("linux", "arm64"), shaFor("linux", "arm64"),
	)

	if err := os.WriteFile(absPath, []byte(sb.String()), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "error writing formula: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("formula written to %s\n", absPath)
}

func commitFormula(brewPath, repoRoot string) {
	runGit(repoRoot, "config", "user.name", "clubmatto-bot")
	runGit(repoRoot, "config", "user.email", "clubmatto-bot@users.noreply.github.com")
	runGit(repoRoot, "add", filepath.Join(repoRoot, brewPath))
	runGit(repoRoot, "commit", "-m", fmt.Sprintf("chore(%s): update brew formula to v%s", info.project, info.version))

	remote := fmt.Sprintf("https://x-access-token:%s@github.com/%s.git", info.token, info.repo)
	runGit(repoRoot, "remote", "set-url", "origin", remote)
	runGit(repoRoot, "push", "origin", "HEAD:main")
}

func runGit(repoRoot string, args ...string) {
	cmd := exec.Command("git", args...)
	cmd.Dir = repoRoot
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	if err := cmd.Run(); err != nil {
		fmt.Fprintf(os.Stderr, "git %s failed: %v\n", strings.Join(args, " "), err)
		os.Exit(1)
	}
}
