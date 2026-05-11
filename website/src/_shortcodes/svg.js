import { readFileSync } from "fs";
import { resolve } from "path";

export function svgShortcode(filePath, classes = "") {
  try {
    const fullPath = resolve("src/assets", filePath);
    let svgContent = readFileSync(fullPath, "utf-8");

    // Add classes to the SVG if provided
    if (classes) {
      svgContent = svgContent.replace(/<svg/, `<svg class="${classes}"`);
    }

    return svgContent;
  } catch (error) {
    console.error(`[svg] Error reading file: ${filePath}`, error.message);
    return `<!-- SVG not found: ${filePath} -->`;
  }
}

export default function (eleventyConfig) {
  eleventyConfig.addShortcode("svg", svgShortcode);
}
