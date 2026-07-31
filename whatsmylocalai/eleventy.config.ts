import type { EleventyConfig } from "@11ty/eleventy";
import { asset } from "./src/_filters/asset.js";
import {
  buildAll,
  buildCss,
  buildJs,
  hasChanged,
  generateManifest,
} from "./scripts/build.js";

export default function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addWatchTarget("src/assets");
  eleventyConfig.addWatchTarget("../assets/css");
  eleventyConfig.addWatchTarget("../assets/js");

  let isFirstBuild = true;

  eleventyConfig.on("eleventy.before", async () => {
    if (isFirstBuild) {
      await buildAll();
      isFirstBuild = false;
    }
  });

  eleventyConfig.on("eleventy.beforeWatch", async (changedFiles: string[]) => {
    if (changedFiles && changedFiles.length > 0) {
      if (hasChanged(changedFiles, "css")) {
        await buildCss();
      }
      if (hasChanged(changedFiles, "js")) {
        await buildJs();
      }
      await generateManifest();
    }
  });

  eleventyConfig.addGlobalData(
    "apiBaseUrl",
    () => process.env.API_URL || "https://api.matto.club",
  );

  eleventyConfig.addPassthroughCopy({
    "../assets/js/alpine.3.15.12.min.js": "assets/js/alpine.3.15.12.min.js",
    "src/assets/og.png": "assets/og.png",
  });

  eleventyConfig.addLiquidFilter("json", (value: unknown) =>
    JSON.stringify(value).replace(/</g, "\\u003c"),
  );

  eleventyConfig.addFilter("asset", asset);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
    },
  };
}
