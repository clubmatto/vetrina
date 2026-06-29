import postcss from "postcss";
import postcssImport from "postcss-import";
import esbuild from "esbuild";
import fs from "fs";
import path from "path";

const isDev = process.env.NODE_ENV !== "production";

const srcDir = path.join(process.cwd(), "src/assets");
const distDir = path.join(process.cwd(), "_site/assets");

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

export function hasChanged(files: string[], type: "css" | "js"): boolean {
  const pattern = type === "css" ? "/css/" : "/js/";
  return files.some((file) => file.includes(pattern));
}

export async function buildAll(): Promise<void> {
  await buildCss();
  await buildJs();
  await generateManifest();
}
