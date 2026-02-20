import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  readFileSync,
  existsSync,
} from "fs";
import { join } from "path";
import { tmpdir } from "os";

export function createTempDir(): string {
  return mkdtempSync(join(tmpdir(), "ai-kit-test-"));
}

export function cleanupDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function readFile(dir: string, filename: string): string | null {
  const path = join(dir, filename);
  if (!existsSync(path)) return null;
  return readFileSync(path, "utf-8");
}

export function fileExists(dir: string, filename: string): boolean {
  return existsSync(join(dir, filename));
}

export function writeFile(
  dir: string,
  filename: string,
  content: string,
): void {
  writeFileSync(join(dir, filename), content);
}
