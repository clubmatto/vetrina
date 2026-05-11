import { readFileSync } from "fs";
import { resolve } from "path";

const ASSET_PATHS = [
  { dir: "../../assets", relative: true },
  { dir: "src/assets", relative: true },
];

function findAsset(filePath) {
  for (const { dir, relative } of ASSET_PATHS) {
    const fullPath = relative ? resolve(dir, filePath) : dir;
    try {
      return readFileSync(fullPath, "utf-8");
    } catch {
      continue;
    }
  }
  return null;
}

export function assetShortcode(filePath) {
  const content = findAsset(filePath);

  if (!content) {
    console.error(`[asset] Error reading file: ${filePath}`);
    return `<!-- Asset not found: ${filePath} -->`;
  }

  return content;
}

export function svgShortcode(filePath, classes = "") {
  const svgContent = findAsset(filePath);

  if (!svgContent) {
    console.error(`[svg] Error reading file: ${filePath}`);
    return `<!-- SVG not found: ${filePath} -->`;
  }

  if (classes) {
    return svgContent.replace(/<svg/, `<svg class="${classes}"`);
  }

  return svgContent;
}

export default function (eleventyConfig) {
  eleventyConfig.addShortcode("asset", assetShortcode);
  eleventyConfig.addShortcode("svg", svgShortcode);
}
