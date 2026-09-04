/// <reference types="./_filters/comparison.js" />
/// <reference types="./_filters/date.js" />
/// <reference types="./_collections/posts.js" />
/// <reference types="./_shortcodes/lucide.js" />
/// <reference types="./_shortcodes/svg.js" />

declare module "@11ty/eleventy" {
  export interface EleventyConfig {
    addPlugin: (plugin: unknown, options?: unknown) => void;
    addShortcode: (name: string, fn: unknown) => void;
    addPairedShortcode: (name: string, fn: unknown) => void;
    addAsyncShortcode: (name: string, fn: unknown) => void;
    addPairedLiquidShortcode: (name: string, fn: unknown) => void;
    addGlobalData: (name: string, fn: unknown) => void;
    addFilter: (name: string, fn: unknown) => void;
    addLiquidFilter: (name: string, fn: unknown) => void;
    addPassthroughCopy: (path: string | Record<string, string>) => void;
    addCollection: (name: string, fn: unknown) => void;
    addWatchTarget: (path: string) => void;
    on: (event: string, callback: Function) => void;
  }
}

declare const Alpine: {
  data: (name: string, setup: () => Record<string, any>) => void;
};

declare module "lucide-static/icon-nodes.json" {
  const icons: Record<string, unknown>;
  export default icons;
}

declare module "./_filters/comparison.js" {
  export function eq(a: unknown, b: unknown): boolean;
}

declare module "./_filters/date.js" {
  export function formatDate(date: Date): string;
}

declare module "./_collections/posts.js" {
  export function posts(): unknown;
  export function postsByYear(): unknown;
}

declare module "./_shortcodes/lucide.js" {
  export function lucideShortcode(name: string): string;
}

declare module "./_shortcodes/svg.js" {
  export function svgShortcode(name: string): string;
}

declare module "@11ty/eleventy-plugin-syntaxhighlight" {
  import type { EleventyConfig } from "@11ty/eleventy";
  interface SyntaxHighlightOptions {
    lineSeparator?: string;
    templateFormats?: string[];
    init?: (args: { Prism: unknown }) => void;
    preAttributes?: Record<
      string,
      string | ((args: { language: string; content: string }) => string)
    >;
    codeAttributes?: Record<string, string>;
    errorOnInvalidLanguage?: boolean;
  }
  const plugin: (
    eleventyConfig: EleventyConfig,
    options?: SyntaxHighlightOptions,
  ) => void;
  export default plugin;
}
