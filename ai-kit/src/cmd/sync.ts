import { existsSync, mkdirSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import {
  readAgents,
  getCommandConfig,
  readContent,
  readConfigs,
  SyncItem,
} from "../reader";
import { readManifest, writeManifest } from "../manifest";
import { processTemplate } from "../template";
import { log, SyncStats } from "../output";
import { Logger } from "../logger";

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

  if (manifest && manifest.version === version) {
    logger.success(`Already at latest version (${version})`);
    return;
  }

  logger.welcome();
  const counts = await doSync(cwd, version, options, logger, sourceDirs);
  logger.summary(counts);
}

function writeItem(aiDir: string, file: SyncItem): void {
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
}

async function doSync(
  cwd: string,
  version: string,
  options: SyncOptions,
  logger: Logger,
  sourceDirs: SourceDirs,
): Promise<SyncStats> {
  const aiDir = join(cwd, ".agents");

  if (!existsSync(aiDir)) {
    mkdirSync(aiDir, { recursive: true });
  }

  const contentFiles = readContent(sourceDirs.rules, sourceDirs.skills);
  const rootFiles = readConfigs(sourceDirs.agents);
  const agentsFile = readAgents(sourceDirs.agents);

  const rules = contentFiles.filter((f) => f.type === "rules");

  const stats: SyncStats = { rules: 0, skills: 0, commands: 0 };

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    const commandConfig = getCommandConfig(sourceDirs.commands);
    stats.commands = Object.keys(commandConfig).length;

    if (Object.keys(commandConfig).length > 0) {
      logger.section("commands");
      for (const name of Object.keys(commandConfig)) {
        logger.success(`${name}.md`);
      }
    }

    if (rootFiles.length > 0) {
      logger.section("configs");
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
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, processTemplate(agentsFile.content));
    logger.success(`${agentsFile.name}`);
  }

  if (rules.length > 0) {
    logger.section("rules");
    for (const file of rules) {
      writeItem(aiDir, file);
      logger.success(`${file.name}`);
      stats.rules++;
    }
  }

  const skills = contentFiles.filter((f) => f.type === "skills");

  if (skills.length > 0) {
    logger.section("skills");
    const skillDirs = [...new Set(skills.map((f) => f.name.split("/")[0]))];
    stats.skills = skillDirs.length;
    for (const dir of skillDirs) {
      const dirFiles = skills.filter((f) => f.name.startsWith(dir + "/"));
      logger.success(`${dir} (${dirFiles.length} files)`);
      for (const file of dirFiles) {
        writeItem(aiDir, file);
      }
    }
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles,
  });

  return stats;
}
