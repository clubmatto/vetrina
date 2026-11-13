/**
 * Minimal static server for the built site. Playwright's webServer starts it,
 * so the e2e suite never needs a second terminal. Run `npm run build` first.
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "_site");
const port = Number(process.env.PORT ?? 4173);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".xml": "application/xml",
};

if (!fs.existsSync(path.join(root, "index.html"))) {
  console.error("_site/index.html is missing: run `npm run build` first.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://127.0.0.1");
  let file = path.join(root, decodeURIComponent(url.pathname));

  if (!file.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }

  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, "index.html");
  }

  if (!fs.existsSync(file)) {
    res.writeHead(404).end("not found");
    return;
  }

  res.writeHead(200, {
    "content-type": MIME[path.extname(file)] ?? "application/octet-stream",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, "127.0.0.1", () => {
  console.log(`serving _site on http://127.0.0.1:${port}`);
});
