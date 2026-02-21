import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import {
  getAgentsFile,
  getCommandConfig,
  getContentFiles,
  getRootFiles,
} from "../content.js";
import { readManifest, writeManifest } from "../manifest.js";
import { processTemplate } from "../template.js";
import { log } from "../output.js";
import { Logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..", "..", "..");

export interface SourceDirs {
  rules: string;
  skills: string;
  agents: string;
  commands: string;
}

const defaultSourceDirs: SourceDirs = {
  rules: join(rootDir, "src", "rules"),
  skills: join(rootDir, "src", "skills"),
  agents: join(rootDir, "src", "agents"),
  commands: join(rootDir, "src", "commands"),
};

interface SyncOptions {
  skipOpencode?: boolean;
}

export async function sync(
  cwd: string,
  version: string,
  options: SyncOptions,
  logger: Logger = log,
  sourceDirs: SourceDirs = defaultSourceDirs,
): Promise<void> {
  const manifest = readManifest(cwd);
  logger.logo(version);

  if (!manifest) {
    logger.action("Initializing ai-kit...");
    const count = await doSync(cwd, version, options, logger, sourceDirs);
    logger.final(`ai-kit initialized (${count} files)`);
    return;
  }

  if (manifest.version === version) {
    logger.success(`Already at latest version (${version})`);
    return;
  }

  logger.action(`Updating from ${manifest.version} to ${version}...`);
  const count = await doSync(cwd, version, options, logger, sourceDirs);
  logger.final(`Updated to ${version} (${count} files)`);
}

async function doSync(
  cwd: string,
  version: string,
  options: SyncOptions,
  logger: Logger,
  sourceDirs: SourceDirs,
): Promise<number> {
  const aiDir = join(cwd, ".agents");

  if (!existsSync(aiDir)) {
    mkdirSync(aiDir, { recursive: true });
  }

  const contentFiles = getContentFiles(sourceDirs.rules, sourceDirs.skills);
  const rootFiles = getRootFiles(sourceDirs.agents);
  const agentsFile = getAgentsFile(sourceDirs.agents);

  const rules = contentFiles.filter((f) => f.type === "rules");
  const skills = contentFiles.filter((f) => f.type === "skills");

  let count = 0;

  if (rules.length > 0) {
    logger.section("rules");
    for (const file of rules) {
      const targetDir = join(aiDir, file.type);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = join(targetDir, file.name);
      const parentDir = dirname(targetPath);
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      writeFileSync(targetPath, processTemplate(file.content));
      logger.success(`${file.type}/${file.name}`);
      count++;
    }
  }

  if (skills.length > 0) {
    logger.section("skills");
    for (const file of skills) {
      const targetDir = join(aiDir, file.type);
      if (!existsSync(targetDir)) {
        mkdirSync(targetDir, { recursive: true });
      }
      const targetPath = join(targetDir, file.name);
      const parentDir = dirname(targetPath);
      if (!existsSync(parentDir)) {
        mkdirSync(parentDir, { recursive: true });
      }
      writeFileSync(targetPath, processTemplate(file.content));
      logger.success(`${file.type}/${file.name}`);
      count++;
    }
  }

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    const commandConfig = getCommandConfig(sourceDirs.commands);
    if (rootFiles.length > 0) {
      logger.section("root files");
      for (const file of rootFiles) {
        let content = file.content;
        if (
          file.name === "opencode.json" &&
          Object.keys(commandConfig).length > 0
        ) {
          const config = JSON.parse(content);
          config.command = commandConfig;
          content = JSON.stringify(config, null, 2) + "\n";
        }
        const targetPath = join(cwd, file.name);
        writeFileSync(targetPath, content);
        logger.success(`${file.name}`);
        installedRootFiles.push(file.name);
        count++;
      }
    }
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, processTemplate(agentsFile.content));
    logger.success(`${agentsFile.name}`);
    count++;
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles,
  });

  return count;
}
