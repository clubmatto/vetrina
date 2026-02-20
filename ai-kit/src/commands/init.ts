import { mkdirSync, existsSync, writeFileSync } from "fs";
import { join } from "path";
import { getContentFiles, getRootFiles, getAgentsFile } from "../content.js";
import { writeManifest } from "../manifest.js";

interface InitOptions {
  skipOpencode?: boolean;
}

export async function init(
  cwd: string,
  version: string,
  options: InitOptions,
): Promise<void> {
  const aiDir = join(cwd, ".ai");
  const manifestPath = join(aiDir, ".ai-kit");

  if (existsSync(manifestPath)) {
    console.log('Already initialized. Use "ai-kit update" to sync.');
    return;
  }

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
    console.log(`  Created ${file.type}/${file.name}`);
  }

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    for (const file of rootFiles) {
      const targetPath = join(cwd, file.name);
      writeFileSync(targetPath, file.content);
      console.log(`  Created ${file.name}`);
      installedRootFiles.push(file.name);
    }
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, agentsFile.content);
    console.log(`  Created ${agentsFile.name}`);
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles,
  });

  console.log("\n✓ ai-kit initialized");
}
