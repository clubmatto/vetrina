import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export interface Manifest {
  version: string;
  installedAt: string;
  rootFiles?: string[];
}

const AI_DIR = ".ai";
const MANIFEST_FILE = ".ai-kit";

export function getManifestPath(cwd: string): string {
  return join(cwd, AI_DIR, MANIFEST_FILE);
}

export function readManifest(cwd: string): Manifest | null {
  const path = getManifestPath(cwd);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf-8"));
}

export function writeManifest(cwd: string, manifest: Manifest): void {
  const dir = join(cwd, AI_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getManifestPath(cwd), JSON.stringify(manifest, null, 2));
}
