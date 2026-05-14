import { fdir } from "fdir";

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "target",
  ".next",
  ".nuxt",
];

interface ScannedFiles {
  allFiles: string[];
  rootFiles: string[];
}

export function scanTree(cwd: string, maxDepth: number = 4): ScannedFiles {
  const allFiles = new fdir()
    .withRelativePaths()
    .withMaxDepth(maxDepth)
    .exclude((name) => IGNORE_DIRS.includes(name) || name.startsWith("."))
    .crawl(cwd)
    .sync() as string[];

  const rootFiles = allFiles.filter((f) => !f.includes("/"));

  return { allFiles, rootFiles };
}
