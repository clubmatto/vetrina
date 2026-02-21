import { mkdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");
const skillsDir = join(rootDir, "src", "skills", "playwright-cli");

const GITHUB_API = "https://api.github.com";
const REPO = "microsoft/playwright-cli";

const args = process.argv.slice(2);
const VERSION = args[0] || "v0.1.1";

interface GitHubFile {
  name: string;
  path: string;
  type: "file" | "dir";
  download_url?: string;
  url?: string;
}

async function fetchJson(url: string): Promise<GitHubFile[]> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "ai-kit",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as GitHubFile[];
}

async function fetchFile(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github.v3.raw",
      "User-Agent": "ai-kit",
    },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function main() {
  console.log(`Fetching playwright-cli skills from ${REPO}@${VERSION}...`);

  const baseUrl = `${GITHUB_API}/repos/${REPO}/contents/skills/playwright-cli?ref=${VERSION}`;
  const files = await fetchJson(baseUrl);

  mkdirSync(skillsDir, { recursive: true });
  mkdirSync(join(skillsDir, "references"), { recursive: true });

  for (const file of files) {
    if (file.type === "dir" && file.name === "references") {
      const refs = await fetchJson(file.url!);
      for (const ref of refs) {
        const content = await fetchFile(ref.download_url!);
        const targetPath = join(skillsDir, "references", ref.name);
        writeFileSync(targetPath, content);
        console.log(`  - references/${ref.name}`);
      }
    } else if (file.type === "file") {
      const content = await fetchFile(file.download_url!);
      const targetPath = join(skillsDir, file.name);
      writeFileSync(targetPath, content);
      console.log(`  - ${file.name}`);
    }
  }

  console.log(`\nDone! Skills written to src/skills/playwright-cli/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
