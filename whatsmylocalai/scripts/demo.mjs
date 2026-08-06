import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const PORT = 4173;
const SITE_DIR = new URL("../_site", import.meta.url).pathname;
const DOCS_DIR = new URL("../docs", import.meta.url).pathname;
const THEMES = ["light", "dark"];

mkdirSync(DOCS_DIR, { recursive: true });

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
};

const server = createServer((req, res) => {
  let filePath = join(SITE_DIR, req.url === "/" ? "index.html" : req.url);
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end();
    return;
  }
  const ext = extname(filePath);
  res.writeHead(200, {
    "Content-Type": MIME[ext] || "application/octet-stream",
  });
  res.end(readFileSync(filePath));
});

async function captureDemo(browser, theme) {
  const framesDir = join(DOCS_DIR, `frames-${theme}`);
  mkdirSync(framesDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
    colorScheme: theme,
  });
  const page = await context.newPage();

  let frameIdx = 0;
  const frames = [];
  const capture = async () => {
    const buf = await page.screenshot({ type: "png" });
    const path = join(framesDir, `f${String(frameIdx++).padStart(4, "0")}.png`);
    writeFileSync(path, buf);
    frames.push(path);
  };

  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded" });

  await page.waitForSelector(".probe-spinner", { timeout: 10000 });

  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(200);
    await capture();
  }

  await page
    .waitForSelector(".best-pick-card .model-name", { timeout: 20000 })
    .catch(() => {});
  await page.waitForTimeout(500);
  await capture();

  await context.close();
  return { frames, framesDir, theme };
}

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const browser = await chromium.launch({ headless: true });

  const gifs = [];
  for (const theme of THEMES) {
    const { frames, framesDir } = await captureDemo(browser, theme);
    console.log(`Captured ${frames.length} frames (${theme}), converting to GIF...`);
    const outputGif = join(DOCS_DIR, `demo-${theme}.gif`);
    try {
      rmSync(outputGif, { force: true });
      execSync(
        `ffmpeg -y -framerate 5 -i "${frames[0].replace(/f\d+\.png$/, "f%04d.png")}" -vf "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer" "${outputGif}"`,
        { stdio: "inherit" },
      );
      console.log(`GIF saved to ${outputGif}`);
      gifs.push(outputGif);
    } catch (e) {
      console.error(`ffmpeg conversion failed (${theme}):`, e.message);
    }
    for (const f of frames) rmSync(f, { force: true });
    rmSync(framesDir, { recursive: true, force: true });
  }

  await browser.close();
  server.close();
  console.log(`Generated: ${gifs.join(", ")}`);
  process.exit(0);
});