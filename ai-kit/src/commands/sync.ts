import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import {
  getContentFiles,
  getRootFiles,
  getAgentsFile,
  getCommandConfig,
} from "../content.js";
import { readManifest, writeManifest } from "../manifest.js";

interface SyncOptions {
  skipOpencode?: boolean;
}

export async function sync(
  cwd: string,
  version: string,
  options: SyncOptions,
): Promise<void> {
  const manifest = readManifest(cwd);

  if (!manifest) {
    await doSync(cwd, version, options, false);
    console.log("\n✓ ai-kit initialized");
    return;
  }

  if (manifest.version === version) {
    console.log(`Already at latest version (${version})`);
    return;
  }

  console.log(`Updating from ${manifest.version} to ${version}...`);
  await doSync(cwd, version, options, true);
  console.log(`\n✓ Updated to ${version}`);
}

async function doSync(
  cwd: string,
  version: string,
  options: SyncOptions,
  isUpdate: boolean,
): Promise<void> {
  const aiDir = join(cwd, ".ai");

  if (!existsSync(aiDir)) {
    mkdirSync(aiDir, { recursive: true });
  }

  const contentFiles = getContentFiles();
  const rootFiles = getRootFiles();
  const agentsFile = getAgentsFile();

  for (const file of contentFiles) {
    const targetDir = join(aiDir, file.type);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = join(targetDir, file.name);
    writeFileSync(targetPath, file.content);
    const verb = isUpdate ? "Updated" : "Created";
    console.log(`  ${verb} ${file.type}/${file.name}`);
  }

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    const commandConfig = getCommandConfig();
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
      const verb = isUpdate ? "Updated" : "Created";
      console.log(`  ${verb} ${file.name}`);
      installedRootFiles.push(file.name);
    }
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, agentsFile.content);
    const verb = isUpdate ? "Updated" : "Created";
    console.log(`  ${verb} ${agentsFile.name}`);
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles,
  });
}
