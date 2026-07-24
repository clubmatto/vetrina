import type { EleventyConfig } from "@11ty/eleventy";

export default function (eleventyConfig: EleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "src/assets/styles.css": "assets/styles.css",
    "src/assets/app.js": "assets/app.js",
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
