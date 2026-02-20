import { readdirSync, readFileSync } from "fs";
import { join } from "path";

type ContentType = "commands" | "rules" | "skills";

interface ContentFile {
  type: ContentType;
  name: string;
  content: string;
}

interface RootFile {
  name: string;
  content: string;
}

interface AgentsFile {
  name: string;
  content: string;
}

interface CommandConfig {
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
    result[key] = line.slice(colonIndex + 1).trim();
  }
  return result;
}

export function getCommandConfig(
  commandsDir: string,
): Record<string, CommandConfig> {
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

function getFiles(
  dir: string,
  type: ContentType,
  baseDir?: string,
): ContentFile[] {
  if (!readdirSync(dir, { withFileTypes: true }).length) {
    return [];
  }

  const base = baseDir || dir;

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    const relativePath = path.slice(base.length + 1);
    if (entry.isDirectory()) {
      return getFiles(path, type, base);
    }
    if (entry.name.endsWith(".md")) {
      return [
        {
          type,
          name: relativePath,
          content: readFileSync(path, "utf-8"),
        },
      ];
    }
    return [];
  });
}

export function getContentFiles(
  rulesDir: string,
  skillsDir: string,
): ContentFile[] {
  return [...getFiles(rulesDir, "rules"), ...getFiles(skillsDir, "skills")];
}

export function getRootFiles(agentsDir: string): RootFile[] {
  try {
    return readdirSync(agentsDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
      .map((entry) => ({
        name: entry.name,
        content: readFileSync(join(agentsDir, entry.name), "utf-8"),
      }));
  } catch {
    return [];
  }
}

export function getAgentsFile(agentsDir: string): AgentsFile | null {
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
