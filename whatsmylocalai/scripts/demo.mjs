import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { execSync } from "node:child_process";
import { rmSync } from "node:fs";

const PORT = 4173;
const SITE_DIR = new URL("../_site", import.meta.url).pathname;
const DOCS_DIR = new URL("../docs", import.meta.url).pathname;
const FRAMES_DIR = join(DOCS_DIR, "frames");
const OUTPUT_GIF = join(DOCS_DIR, "demo.gif");

if (!existsSync(DOCS_DIR)) mkdirSync(DOCS_DIR, { recursive: true });
if (!existsSync(FRAMES_DIR)) mkdirSync(FRAMES_DIR, { recursive: true });

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
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(filePath));
});

server.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  let frameIdx = 0;
  const frames = [];
  const capture = async () => {
    const buf = await page.screenshot({ type: "png" });
    const path = join(FRAMES_DIR, `f${String(frameIdx++).padStart(4, "0")}.png`);
    writeFileSync(path, buf);
    frames.push(path);
  };

  await page.goto(`http://localhost:${PORT}`, { waitUntil: "domcontentloaded" });

  // wait for probes to start
  await page.waitForSelector(".probe-spinner", { timeout: 10000 });

  // capture probing phase
  for (let i = 0; i < 25; i++) {
    await page.waitForTimeout(200);
    await capture();
  }

  // wait for the best-pick card to appear with content
  await page.waitForSelector(".best-pick-card .model-name", { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(500);
  await capture();

  await context.close();
  await browser.close();
  server.close();

  console.log(`Captured ${frames.length} frames, converting to GIF...`);

  try {
    rmSync(OUTPUT_GIF, { force: true });
    execSync(
      `ffmpeg -y -framerate 5 -i "${FRAMES_DIR}/f%04d.png" -vf "scale=640:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=64[p];[s1][p]paletteuse=dither=bayer" "${OUTPUT_GIF}"`,
      { stdio: "inherit" },
    );
    console.log(`GIF saved to ${OUTPUT_GIF}`);
  } catch (e) {
    console.error("ffmpeg conversion failed:", e.message);
  }

  for (const f of frames) rmSync(f, { force: true });
  rmSync(FRAMES_DIR, { recursive: true, force: true });
  process.exit(0);
});
