declare module "@11ty/eleventy" {
  export interface EleventyConfig {
    addGlobalData: (name: string, fn: unknown) => void;
    addFilter: (name: string, fn: unknown) => void;
    addLiquidFilter: (name: string, fn: unknown) => void;
    addPassthroughCopy: (path: string | Record<string, string>) => void;
    addWatchTarget: (path: string) => void;
    on: (event: string, callback: (...args: never[]) => void) => void;
    ignores: { add: (path: string) => void };
  }
}
