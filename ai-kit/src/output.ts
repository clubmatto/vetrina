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

export interface SyncStats {
  rules: number;
  skills: number;
  commands: number;
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

  final: (msg: string) => console.log(colorize(`  ✓ ${msg}`, "green")),

  summary: (counts: SyncStats) => {
    console.log(colorize("\n  ✓ Done!", "green"));
    console.log(
      colorize(`  → `, "dim") +
        colorize(counts.commands.toString(), "white") +
        colorize(` commands`, "dim") +
        colorize(`, `, "dim") +
        colorize(counts.rules.toString(), "white") +
        colorize(` rules`, "dim") +
        colorize(`, `, "dim") +
        colorize(counts.skills.toString(), "white") +
        colorize(` skills`, "dim"),
    );
  },
};
