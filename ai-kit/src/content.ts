import { readdirSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export type ContentType = "commands" | "rules" | "skills";

export interface ContentFile {
  type: ContentType;
  name: string;
  content: string;
}

export interface RootFile {
  name: string;
  content: string;
}

export interface AgentsFile {
  name: string;
  content: string;
}

export interface CommandConfig {
  template: string;
  description: string;
}

function parseFrontmatter(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return result;

  const frontmatter = match[1];
  for (const line of frontmatter.split("\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    result[key] = value;
  }
  return result;
}

export function getCommandConfig(): Record<string, CommandConfig> {
  const commandsDir = join(__dirname, "..", "src", "commands");
  const config: Record<string, CommandConfig> = {};

  try {
    const files = readdirSync(commandsDir);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;
      const filePath = join(commandsDir, file);
      const content = readFileSync(filePath, "utf-8");
      const frontmatter = parseFrontmatter(content);
      const name = file.replace(/\.md$/, "");
      const body = content.replace(/^---[\s\S]*?---\n/, "").trim();
      config[name] = {
        description: frontmatter.description || "",
        template: body,
      };
    }
  } catch {
    return config;
  }

  return config;
}

function getFiles(dir: string, type: ContentType): ContentFile[] {
  if (!readdirSync(dir, { withFileTypes: true }).length) {
    return [];
  }

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return getFiles(path, type);
    }
    if (entry.name.endsWith(".md")) {
      return [
        {
          type,
          name: entry.name,
          content: readFileSync(path, "utf-8"),
        },
      ];
    }
    return [];
  });
}

export function getContentFiles(): ContentFile[] {
  return [
    ...getFiles(join(__dirname, "..", "src", "commands"), "commands"),
    ...getFiles(join(__dirname, "..", "src", "rules"), "rules"),
    ...getFiles(join(__dirname, "..", "src", "skills"), "skills"),
  ];
}

export function getRootFiles(): RootFile[] {
  const rootDir = join(__dirname, "..", "src", "agents");

  try {
    return readdirSync(rootDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => ({
        name: entry.name,
        content: readFileSync(join(rootDir, entry.name), "utf-8"),
      }));
  } catch {
    return [];
  }
}

export function getAgentsFile(): AgentsFile | null {
  const agentsDir = join(__dirname, "..", "src", "agents");
  const sourcePath = join(agentsDir, "monorepo.md");

  try {
    return {
      name: "AGENTS.md",
      content: readFileSync(sourcePath, "utf-8"),
    };
  } catch {
    return null;
  }
}
