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
  logo: (msg = "") =>
    console.log(colorize(`⬡ ai-kit${msg ? " " + msg : ""}\n`, "blue")),
  action: (msg: string) => console.log(colorize(`  ▶ ${msg}`, "blue")),
  success: (msg: string) => console.log(colorize(`  ✓ ${msg}`, "green")),
  info: (msg: string) => console.log(colorize(`  ○ ${msg}`, "yellow")),
  error: (msg: string) => console.log(colorize(`  ✗ ${msg}`, "red")),
  final: (msg: string) => console.log(colorize(`\n✓ ${msg}`, "green")),
};
