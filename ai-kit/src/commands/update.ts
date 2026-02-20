import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { readManifest, writeManifest } from '../manifest.js';
import { getContentFiles, getRootFiles, getAgentsFile } from '../content.js';

interface UpdateOptions {
  skipOpencode?: boolean;
}

export async function update(cwd: string, version: string, options: UpdateOptions): Promise<void> {
  const manifest = readManifest(cwd);

  if (!manifest) {
    console.log('Not initialized. Run "ai-kit init" first.');
    return;
  }

  if (manifest.version === version) {
    console.log(`Already at latest version (${version})`);
    return;
  }

  console.log(`Updating from ${manifest.version} to ${version}...`);

  const contentFiles = getContentFiles();
  const rootFiles = getRootFiles();
  const agentsFile = getAgentsFile();

  for (const file of contentFiles) {
    const targetDir = join(cwd, '.ai', file.type);
    if (!existsSync(targetDir)) {
      mkdirSync(targetDir, { recursive: true });
    }
    const targetPath = join(targetDir, file.name);
    writeFileSync(targetPath, file.content);
    console.log(`  Updated ${file.type}/${file.name}`);
  }

  const installedRootFiles: string[] = [];
  if (!options.skipOpencode) {
    for (const file of rootFiles) {
      const targetPath = join(cwd, file.name);
      writeFileSync(targetPath, file.content);
      console.log(`  Updated ${file.name}`);
      installedRootFiles.push(file.name);
    }
  }

  if (agentsFile) {
    const targetPath = join(cwd, agentsFile.name);
    writeFileSync(targetPath, agentsFile.content);
    console.log(`  Updated ${agentsFile.name}`);
  }

  writeManifest(cwd, {
    version,
    installedAt: new Date().toISOString(),
    rootFiles: installedRootFiles
  });

  console.log(`\n✓ Updated to ${version}`);
}
