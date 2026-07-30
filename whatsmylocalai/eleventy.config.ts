import { copyFileSync, mkdirSync, existsSync } from "fs";
import type { EleventyConfig } from "@11ty/eleventy";

export default function (eleventyConfig: EleventyConfig) {
  eleventyConfig.on("eleventy.before", async () => {
    const outDir = "_site/assets";
    if (!existsSync(outDir)) {
      mkdirSync(outDir, { recursive: true });
    }
    copyFileSync(
      "node_modules/@auxot/model-registry/dist/src/query.js",
      `${outDir}/query.js`,
    );
  });

  eleventyConfig.addGlobalData(
    "apiBaseUrl",
    () => process.env.API_URL || "https://api.matto.club",
  );

  eleventyConfig.addPassthroughCopy({
    "src/assets/styles.css": "assets/styles.css",
    "src/assets/app.js": "assets/app.js",
    "../assets/js/alpine.3.15.12.min.js": "assets/js/alpine.3.15.12.min.js",
  });

  eleventyConfig.addLiquidFilter("json", (value: unknown) =>
    JSON.stringify(value),
  );

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
}
