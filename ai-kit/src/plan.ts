import { readFileSync } from "fs";
import { join } from "path";
import { Manifest } from "./manifest";
import { stripDates } from "./template";

export type FileCategory = "static" | "opencode-json" | "agents-md";

export interface DesiredFile {
  path: string;
  identity: string;
  content: string;
  category: FileCategory;
}

export type FileActionType =
  | "add"
  | "update"
  | "skip"
  | "merge"
  | "backup"
  | "remove"
  | "warn";

export interface FileAction {
  action: FileActionType;
  relPath: string;
  content?: string;
}

export function emptySyncChanges() {
  return {
    added: 0,
    updated: 0,
    merged: 0,
    backedUp: 0,
    removed: 0,
    skipped: 0,
    warned: 0,
  };
}

export function diffDesired(
  desired: Map<string, DesiredFile>,
  manifest: Manifest | null,
  cwd: string,
): FileAction[] {
  const actions: FileAction[] = [];

  for (const [relPath, df] of desired) {
    const lastEntry = manifest?.files[relPath];
    const targetPath = join(cwd, relPath);

    let onDiskContent: string | null = null;
    try {
      onDiskContent = readFileSync(targetPath, "utf-8");
    } catch {
      // file doesn't exist
    }

    if (onDiskContent === null) {
      actions.push({ action: "add", relPath, content: df.content });
      continue;
    }

    const normalizedDisk = stripDates(onDiskContent);
    const normalizedDesired = stripDates(df.content);

    if (normalizedDisk === normalizedDesired) {
      actions.push({ action: "skip", relPath });
      continue;
    }

    const sourceChanged = !lastEntry || lastEntry.sourceHash !== df.identity;

    if (df.category === "opencode-json") {
      actions.push({ action: "merge", relPath, content: df.content });
    } else if (sourceChanged && df.category === "agents-md") {
      actions.push({ action: "backup", relPath, content: df.content });
    } else if (sourceChanged) {
      actions.push({ action: "update", relPath, content: df.content });
    } else {
      actions.push({ action: "warn", relPath });
    }
  }

  if (manifest) {
    for (const relPath of Object.keys(manifest.files)) {
      if (!desired.has(relPath)) {
        actions.push({ action: "remove", relPath });
      }
    }
  }

  return actions;
}

export function mergeOpencodeJson(
  desiredContent: string,
  currentContent: string,
): string {
  const desired = JSON.parse(desiredContent);
  const current = JSON.parse(currentContent);

  const result: Record<string, unknown> = { ...desired };

  if (current.mcp && typeof current.mcp === "object") {
    const resultMcp = result.mcp as Record<string, unknown>;
    for (const [key, value] of Object.entries(
      current.mcp as Record<string, unknown>,
    )) {
      if (!(key in resultMcp)) {
        resultMcp[key] = value;
      }
    }
  }

  if (current.command && typeof current.command === "object") {
    const resultCmd = result.command as Record<string, unknown>;
    for (const [key, value] of Object.entries(
      current.command as Record<string, unknown>,
    )) {
      if (!(key in resultCmd)) {
        resultCmd[key] = value;
      }
    }
  }

  for (const key of Object.keys(current)) {
    if (!(key in result)) {
      result[key] = current[key];
    }
  }

  return JSON.stringify(result, null, 2) + "\n";
}
