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
  const mainCss = path.join(srcDir, "css/main.css");
  const css = fs.readFileSync(mainCss, "utf8");
  const result = await postcss([postcssImport()]).process(css, {
    from: mainCss,
  });

  const distCssDir = path.join(distDir, "css");
  ensureDir(distCssDir);

  if (isDev) {
    fs.writeFileSync(path.join(distCssDir, "main.css"), result.css);
  } else {
    const tempFile = path.join(process.cwd(), "main.css");
    fs.writeFileSync(tempFile, result.css);

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
  const distJsDir = path.join(distDir, "js");
  ensureDir(distJsDir);

  const jsOptions: esbuild.BuildOptions = {
    entryPoints: [path.join(srcDir, "js/app.ts")],
    bundle: true,
    outdir: distJsDir,
    format: "esm",
    target: "es2020",
    // The package index re-exports Node-only code (loader.js uses node:fs),
    // so we alias to the browser-safe query module directly. Type-only
    // imports still resolve against the package's real index.d.ts.
    alias: {
      "@auxot/model-registry": path.join(
        process.cwd(),
        "node_modules/@auxot/model-registry/dist/src/query.js",
      ),
    },
  };

  if (isDev) {
    await esbuild.build(jsOptions);
  } else {
    await esbuild.build({
      ...jsOptions,
      minify: true,
      entryNames: "app.min.[hash]",
    });
  }
}

export async function generateManifest(): Promise<void> {
  if (isDev) return;

  const manifest: Record<string, string> = {};

  const cssDir = path.join(distDir, "css");
  if (fs.existsSync(cssDir)) {
    const mainCss = fs
      .readdirSync(cssDir)
      .find((f) => f.startsWith("main.min.") && f.endsWith(".css"));
    if (mainCss) {
      manifest["css/main.css"] = `css/${mainCss}`;
    }
  }

  const jsDir = path.join(distDir, "js");
  if (fs.existsSync(jsDir)) {
    const mainJs = fs
      .readdirSync(jsDir)
      .find((f) => f.startsWith("app.min.") && f.endsWith(".js"));
    if (mainJs) {
      manifest["js/app.js"] = `js/${mainJs}`;
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
