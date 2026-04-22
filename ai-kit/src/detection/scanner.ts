import { existsSync, readdirSync } from "fs";
import { join } from "path";

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".nuxt",
];

export function hasAnyConfigFile(cwd: string, configFiles: string[]): boolean {
  for (const configFile of configFiles) {
    if (existsSync(join(cwd, configFile))) {
      return true;
    }
  }
  return false;
}

export function hasAnySourceFile(
  cwd: string,
  extensions: string[],
  maxDepth: number = 2,
): boolean {
  return scanForExtensions(cwd, extensions, maxDepth, 0);
}

function scanForExtensions(
  dir: string,
  extensions: string[],
  maxDepth: number,
  currentDepth: number,
): boolean {
  if (currentDepth > maxDepth) {
    return false;
  }

  try {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!IGNORE_DIRS.includes(entry.name) && !entry.name.startsWith(".")) {
          if (
            scanForExtensions(fullPath, extensions, maxDepth, currentDepth + 1)
          ) {
            return true;
          }
        }
      } else if (entry.isFile()) {
        if (extensions.some((ext) => entry.name.endsWith(ext))) {
          return true;
        }
      }
    }
  } catch {
    // If we can't read the directory, skip it
  }

  return false;
}
