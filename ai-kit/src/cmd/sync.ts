import { existsSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "fs";
import { dirname, join } from "path";
import {
  readAgents,
  getCommandConfig,
  readContent,
  readConfigs,
} from "../reader";
import { readManifest, writeManifest, hashContent } from "../manifest";
import { processTemplate } from "../template";
import { log, SyncChanges } from "../output";
import { Logger } from "../logger";
import {
  detectLanguages,
  getRuleFilesForLanguages,
  getAllRuleFiles,
  isLanguageSpecificRule,
} from "../detection/detect";
import { detectors } from "../detection/language-detectors";
import {
  DesiredFile,
  FileAction,
  FileCategory,
  diffDesired,
  mergeOpencodeJson,
  emptySyncChanges,
} from "../plan";

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
  allRules?: boolean;
  monorepo?: boolean;
  singleRepo?: boolean;
  languages?: string[];
}

export async function sync(
  cwd: string,
  version: string,
  options: SyncOptions,
  logger: Logger = log,
  sourceDirs: SourceDirs = defaultSourceDirs,
): Promise<void> {
  logger.logo(version);
  logger.welcome();

  const aiDir = join(cwd, ".agents");
  if (!existsSync(aiDir)) {
    mkdirSync(aiDir, { recursive: true });
  }

  const manifest = readManifest(cwd);
  const desired = buildDesiredFiles(sourceDirs, cwd, options);
  const actions = diffDesired(desired, manifest, cwd);
  const changes = executeActions(actions, cwd, logger);

  const newFiles: Record<string, { sourceHash: string }> = {};
  for (const [relPath, df] of desired) {
    newFiles[relPath] = { sourceHash: df.identity };
  }
  writeManifest(cwd, { version, files: newFiles });

  logger.summary(changes);
}

function buildDesiredFiles(
  sourceDirs: SourceDirs,
  cwd: string,
  options: SyncOptions,
): Map<string, DesiredFile> {
  const desired = new Map<string, DesiredFile>();

  const contentFiles = readContent(sourceDirs.rules, sourceDirs.skills);
  const rootFiles = readConfigs(sourceDirs.agents);

  const detectionResult = detectLanguages(cwd);
  let languages = detectionResult.languages;
  let isMonorepo = detectionResult.isMonorepo;
  const primaryLanguage = detectionResult.primaryLanguage;

  if (options.allRules) {
    languages = detectors.map((d) => d.name);
    isMonorepo = true;
  } else if (options.monorepo) {
    isMonorepo = true;
  } else if (options.singleRepo) {
    isMonorepo = false;
  }

  if (options.languages && options.languages.length > 0) {
    languages = options.languages;
    isMonorepo = languages.length > 1;
  }

  if (languages.length === 0) {
    isMonorepo = true;
  }

  const agentsFile = readAgents(sourceDirs.agents, isMonorepo, primaryLanguage);

  const ruleFilesToInclude = options.allRules
    ? getAllRuleFiles()
    : getRuleFilesForLanguages(languages);

  const rules = contentFiles.filter((f) => {
    if (f.type !== "rules") return false;
    if (!isLanguageSpecificRule(f.name)) return true;
    return ruleFilesToInclude.includes(f.name);
  });

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
      desired.set(file.name, {
        path: file.name,
        identity: hashContent(content),
        content,
        category:
          file.name === "opencode.json"
            ? "opencode-json"
            : ("static" as FileCategory),
      });
    }
  }

  if (agentsFile) {
    desired.set(agentsFile.name, {
      path: agentsFile.name,
      identity: hashContent(agentsFile.content),
      content: processTemplate(agentsFile.content),
      category: "agents-md",
    });
  }

  for (const file of rules) {
    const relPath = join(".agents", file.type, file.name);
    desired.set(relPath, {
      path: relPath,
      identity: hashContent(file.content),
      content: processTemplate(file.content),
      category: "static",
    });
  }

  const skills = contentFiles.filter((f) => f.type === "skills");
  for (const file of skills) {
    const relPath = join(".agents", file.type, file.name);
    desired.set(relPath, {
      path: relPath,
      identity: hashContent(file.content),
      content: processTemplate(file.content),
      category: "static",
    });
  }

  return desired;
}

function executeActions(
  actions: FileAction[],
  cwd: string,
  logger: Logger,
): SyncChanges {
  const changes = emptySyncChanges();

  for (const action of actions) {
    const targetPath = join(cwd, action.relPath);

    switch (action.action) {
      case "add": {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(targetPath, action.content!);
        changes.added++;
        logger.success(`+ ${action.relPath}`);
        break;
      }
      case "update": {
        const dir = dirname(targetPath);
        if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
        writeFileSync(targetPath, action.content!);
        changes.updated++;
        logger.success(`~ ${action.relPath}`);
        break;
      }
      case "skip":
        changes.skipped++;
        break;
      case "merge": {
        const currentContent = readFileSync(targetPath, "utf-8");
        const merged = mergeOpencodeJson(action.content!, currentContent);
        writeFileSync(targetPath, merged);
        changes.merged++;
        logger.success(`M ${action.relPath}`);
        break;
      }
      case "backup": {
        const currentContent = readFileSync(targetPath, "utf-8");
        const backupDir = join(cwd, ".agents");
        if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true });
        const backupPath = join(
          backupDir,
          `${action.relPath}.bak.${Date.now()}`,
        );
        writeFileSync(backupPath, currentContent);
        writeFileSync(targetPath, action.content!);
        changes.backedUp++;
        logger.success(`! ${action.relPath}`);
        break;
      }
      case "remove": {
        rmSync(targetPath, { force: true });
        changes.removed++;
        logger.success(`- ${action.relPath}`);
        break;
      }
      case "warn": {
        changes.warned++;
        logger.warn(`${action.relPath} (modified — skipped)`);
        break;
      }
    }
  }

  return changes;
}
