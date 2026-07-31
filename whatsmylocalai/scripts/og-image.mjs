import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const PORT = 4174;
const SITE_DIR = new URL("../_site", import.meta.url).pathname;
const OUTPUT = new URL("../src/assets/og.png", import.meta.url).pathname;

const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
};

const server = createServer((req, res) => {
  let filePath = join(SITE_DIR, req.url === "/" ? "index.html" : req.url);
  if (existsSync(filePath) && statSync(filePath).isDirectory()) {
    filePath = join(filePath, "index.html");
  }
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

server.listen(PORT, async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  // clean shot: light theme, banner dismissed
  await page.addInitScript(() => {
    localStorage.setItem("theme", "light");
    localStorage.setItem("banner-dismissed-at", String(Date.now()));
  });

  await page.goto(`http://localhost:${PORT}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForSelector(".best-pick-card .model-name", { timeout: 20000 });
  await page.waitForTimeout(400);

  await page.screenshot({ path: OUTPUT, type: "png" });
  console.log(`og image saved to ${OUTPUT}`);

  await context.close();
  await browser.close();
  server.close();
  process.exit(0);
});
