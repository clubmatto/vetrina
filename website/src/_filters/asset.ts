import fs from "fs";
import path from "path";

export function asset(filename: string): string {
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    return `/assets/${filename}`;
  }

  const manifestPath = path.join(process.cwd(), "_site/assets/manifest.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  return `/assets/${manifest[filename]}`;
}
