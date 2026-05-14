import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { createHash } from "crypto";

export interface FileEntry {
  sourceHash: string;
}

export interface Manifest {
  version: string;
  files: Record<string, FileEntry>;
}

const AI_DIR = ".agents";
const MANIFEST_FILE = ".ai-kit";

function getManifestPath(cwd: string): string {
  return join(cwd, AI_DIR, MANIFEST_FILE);
}

export function hashContent(content: string): string {
  return createHash("sha256").update(content, "utf-8").digest("hex");
}

export function readManifest(cwd: string): Manifest | null {
  const path = getManifestPath(cwd);
  if (!existsSync(path)) return null;

  try {
    const data = JSON.parse(readFileSync(path, "utf-8"));
    if (!data.files) {
      return { version: data.version || "0.0.0", files: {} };
    }
    return data;
  } catch {
    return null;
  }
}

export function writeManifest(cwd: string, manifest: Manifest): void {
  const dir = join(cwd, AI_DIR);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(getManifestPath(cwd), JSON.stringify(manifest, null, 2) + "\n");
}
