type Color = "green" | "blue" | "yellow" | "red" | "reset";

const colors: Record<Color, string> = {
  green: "\x1b[32m",
  blue: "\x1b[36m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  reset: "\x1b[0m",
};

function colorize(text: string, color: Color): string {
  return `${colors[color]}${text}${colors.reset}`;
}

export const log = {
  logo: (version: string) =>
    console.log(colorize(`⬡ ai-kit v${version}\n`, "blue")),
  action: (msg: string) => console.log(colorize(`  ▶ ${msg}`, "blue")),
  section: (msg: string) =>
    console.log(colorize(`  ▶ Installing ${msg}...`, "blue")),
  success: (msg: string) => console.log(colorize(`    ✓ ${msg}`, "green")),
  final: (msg: string) => console.log(colorize(`  ✓ ${msg}`, "green")),
};
