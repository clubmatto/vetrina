import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import {
  getContentFiles,
  getRootFiles,
  getAgentsFile,
  getCommandConfig,
} from "../content.js";
import { readManifest, writeManifest } from "../manifest.js";
import { processTemplate } from "../template.js";
import { log } from "../output.js";
import { Logger } from "../logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..", "..");

export interface SourceDirs {
  rules: string;
  skills: string;
  agents: string;
  commands: string;
}

const defaultSourceDirs: SourceDirs = {
  rules: join(rootDir, "rules"),
  skills: join(rootDir, "skills"),
  agents: join(rootDir, "agents"),
  commands: join(rootDir, "commands"),
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

  if (!manifest) {
    await doSync(cwd, version, options, logger, sourceDirs);
    logger.final("ai-kit initialized");
    return;
  }

  if (manifest.version === version) {
    logger.success(`Already at latest version (${version})`);
    return;
  }

  logger.action(`Updating from ${manifest.version} to ${version}`);
  await doSync(cwd, version, options, logger, sourceDirs);
  logger.final(`Updated to ${version}`);
}

async function doSync(
  cwd: string,
  version: string,
  options: SyncOptions,
  logger: Logger,
  sourceDirs: SourceDirs,
): Promise<void> {
  const aiDir = join(cwd, ".agents");

  if (!existsSync(aiDir)) {
    mkdirSync(aiDir, { recursive: true });
  }

  const contentFiles = getContentFiles(sourceDirs.rules, sourceDirs.skills);
  const rootFiles = getRootFiles(sourceDirs.agents);
  const agentsFile = getAgentsFile(sourceDirs.agents);

  for (const file of contentFiles) {
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
  }

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    const commandConfig = getCommandConfig(sourceDirs.commands);
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
    }
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, processTemplate(agentsFile.content));
    logger.success(`${agentsFile.name}`);
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles,
  });
}
