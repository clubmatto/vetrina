import postcss from "postcss";
import postcssImport from "postcss-import";
import esbuild from "esbuild";
import chokidar from "chokidar";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const srcDir = path.join(process.cwd(), "src/assets");
const distDir = path.join(process.cwd(), "_site/assets");
const sharedCssDir = path.join(process.cwd(), "..", "assets/css");

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export async function buildCss(): Promise<void> {
  const cssDir = path.join(srcDir, "css");
  const mainCss = path.join(cssDir, "main.css");
  const css = fs.readFileSync(mainCss, "utf8");
  const result = await postcss([postcssImport()]).process(css, {
    from: mainCss,
  });

  const distCssDir = path.join(distDir, "css");
  ensureDir(distCssDir);

  if (isDev) {
    fs.writeFileSync(path.join(distCssDir, "main.css"), result.css);
  } else {
    const prismNord = path.join(cssDir, "prism-nord.css");
    const prismLineNumbers = path.join(cssDir, "prism-line-numbers.css");

    let combinedCss = result.css;
    if (fs.existsSync(prismNord)) {
      combinedCss += "\n" + fs.readFileSync(prismNord, "utf8");
    }
    if (fs.existsSync(prismLineNumbers)) {
      combinedCss += "\n" + fs.readFileSync(prismLineNumbers, "utf8");
    }

    const tempFile = path.join(process.cwd(), "main.css");
    fs.writeFileSync(tempFile, combinedCss);

    await esbuild.build({
      entryPoints: [tempFile],
      bundle: true,
      minify: true,
      outdir: distCssDir,
      entryNames: "main.min.[hash]",
    });

    fs.unlinkSync(tempFile);
  }
}

export async function buildJs(): Promise<void> {
  const jsDir = path.join(srcDir, "js");
  const distJsDir = path.join(distDir, "js");
  ensureDir(distJsDir);

  const apiBaseUrl = process.env.API_URL || "https://api.matto.club";
  const jsOptions: esbuild.BuildOptions = {
    entryPoints: [path.join(jsDir, "main.ts")],
    bundle: true,
    outdir: distJsDir,
    define: { API_BASE_URL: JSON.stringify(apiBaseUrl) },
  };

  if (isDev) {
    await esbuild.build({
      ...jsOptions,
      format: "esm",
      target: "es2020",
    });
  } else {
    await esbuild.build({
      ...jsOptions,
      minify: true,
      entryNames: "main.min.[hash]",
    });
  }
}

export async function generateManifest(): Promise<void> {
  if (isDev) return;

  const manifest: Record<string, string> = {};

  const cssDir = path.join(distDir, "css");
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir);
    const mainCss = cssFiles.find(
      (f) => f.startsWith("main.min.") && f.endsWith(".css"),
    );
    if (mainCss) {
      manifest["css/main.css"] = `css/${mainCss}`;
    }
  }

  const jsDir = path.join(distDir, "js");
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir);
    const mainJs = jsFiles.find(
      (f) => f.startsWith("main.min.") && f.endsWith(".js"),
    );
    if (mainJs) {
      manifest["js/main.js"] = `js/${mainJs}`;
    }
  }

  ensureDir(distDir);
  fs.writeFileSync(
    path.join(distDir, "manifest.json"),
    JSON.stringify(manifest, null, 2),
  );
}

export async function buildAll(): Promise<void> {
  await buildCss();
  await buildJs();
  await generateManifest();
}

function debounce(fn: () => void, wait = 50): () => void {
  let timer: NodeJS.Timeout | undefined;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, wait);
  };
}

let assetWatchers: chokidar.FSWatcher[] | null = null;

function closeAssetWatchers(): void {
  for (const watcher of assetWatchers ?? []) {
    void watcher.close();
  }
  assetWatchers = null;
}

// Rebuild CSS/JS independently from Eleventy: Eleventy's own watcher would
// re-render every template whenever a style or script changes, and the
// resulting HTML rewrites turn CSS hot-swaps into full page reloads.
export function watchAssets(): void {
  if (assetWatchers) {
    return;
  }

  const rebuildCss = debounce(() => {
    buildCss().catch((error: unknown) => {
      console.error("CSS rebuild failed:", error);
    });
  });

  const rebuildJs = debounce(() => {
    buildJs().catch((error: unknown) => {
      console.error("JS rebuild failed:", error);
    });
  });

  const options = {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
  };

  assetWatchers = [
    chokidar
      .watch([path.join(srcDir, "css"), sharedCssDir], options)
      .on("all", rebuildCss),
    chokidar.watch(path.join(srcDir, "js"), options).on("all", rebuildJs),
  ];

  // The dev server stops its own watchers and the HTTP server on Ctrl+C, then
  // relies on the event loop draining to exit. An open chokidar watcher keeps
  // the process alive forever, so close ours on the same signal.
  process.once("SIGINT", closeAssetWatchers);
}
