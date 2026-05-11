import type { EleventyConfig } from "@11ty/eleventy";
import { eq } from "./src/_filters/comparison.js";
import { formatDate } from "./src/_filters/date.js";
import { asset } from "./src/_filters/asset.js";
import { posts, postsByYear } from "./src/_collections/posts.js";
import { lucideShortcode } from "./src/_shortcodes/lucide.js";
import { svgShortcode } from "./src/_shortcodes/svg.js";
import { buildAll, buildCss, buildJs, hasChanged } from "./scripts/build.js";

export default function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addWatchTarget("src/assets");

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
    }
  });

  eleventyConfig.addShortcode("lucide", lucideShortcode);
  eleventyConfig.addFilter("lucide", lucideShortcode);
  eleventyConfig.addShortcode("svg", svgShortcode);

  eleventyConfig.addLiquidFilter("safe", (value: unknown) => value);

  eleventyConfig.addGlobalData(
    "today",
    () => new Date().toISOString().split("T")[0],
  );

  eleventyConfig.addFilter("eq", eq);
  eleventyConfig.addFilter("formatDate", formatDate);
  eleventyConfig.addFilter("asset", asset);

  eleventyConfig.addPassthroughCopy("./src/assets/img");
  eleventyConfig.addPassthroughCopy("./src/assets/header-logo.svg");
  eleventyConfig.addPassthroughCopy("./src/assets/logo.svg");

  eleventyConfig.addCollection("posts", posts);
  eleventyConfig.addCollection("postsByYear", postsByYear);

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      layouts: "_layouts",
    },
  };
}
