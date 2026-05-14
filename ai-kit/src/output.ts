import gradient from "gradient-string";

const brand = gradient(["#ff006e", "#fb5607", "#ffbe0b", "#8338ec", "#3a86ff"]);

type Color = "green" | "cyan" | "yellow" | "red" | "dim" | "white" | "reset";

const colors: Record<Color, string> = {
  green: "\x1b[32m",
  cyan: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[90m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
};

function colorize(text: string, color: Color): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export interface SyncChanges {
  added: number;
  updated: number;
  merged: number;
  backedUp: number;
  removed: number;
  skipped: number;
  warned: number;
}

export const log = {
  logo: (version: string) => {
    console.log(
      brand(`ai-kit v${version}`) +
        "  " +
        colorize("The AI configuration CLI", "dim"),
    );
    console.log(colorize("from Club Matto\n", "dim"));
  },

  welcome: () => {
    console.log(
      colorize(
        "  Syncing AI rules, skills, and commands to your project...\n",
        "dim",
      ),
    );
  },

  section: (msg: string) => console.log(colorize(`  → ${msg}`, "cyan")),

  success: (msg: string) => console.log(colorize(`    ✓ ${msg}`, "green")),

  warn: (msg: string) => console.log(colorize(`    ! ${msg}`, "yellow")),

  final: (msg: string) => console.log(colorize(`  ✓ ${msg}`, "green")),

  summary: (counts: SyncChanges) => {
    const parts: string[] = [];
    if (counts.added > 0)
      parts.push(colorize(`+${counts.added} added`, "green"));
    if (counts.updated > 0)
      parts.push(colorize(`~${counts.updated} updated`, "white"));
    if (counts.merged > 0)
      parts.push(colorize(`M${counts.merged} merged`, "yellow"));
    if (counts.backedUp > 0)
      parts.push(colorize(`!${counts.backedUp} backed up`, "yellow"));
    if (counts.removed > 0)
      parts.push(colorize(`-${counts.removed} removed`, "red"));
    if (counts.warned > 0)
      parts.push(colorize(`!${counts.warned} modified (skipped)`, "yellow"));

    if (parts.length === 0) {
      console.log(colorize("\n  ✓ Everything up to date!", "green"));
    } else {
      console.log(colorize("\n  ✓ Done!", "green"));
      console.log("  " + parts.join(colorize(", ", "dim")));
    }
  },
};
