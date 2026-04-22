interface LanguageDetector {
  name: string;
  ruleFile: string;
  configFiles: string[];
  extensions: string[];
  scanDepth?: number;
}

//TODO this is a good first implementation
//but we clearly want each detector to come with a detect function
export const detectors: LanguageDetector[] = [
  {
    name: "typescript",
    ruleFile: "typescript.md",
    configFiles: ["package.json", "tsconfig.json"],
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"],
  },
  {
    name: "go",
    ruleFile: "go.md",
    configFiles: ["go.mod"],
    extensions: [".go"],
  },
  {
    name: "kotlin",
    ruleFile: "kotlin.md",
    configFiles: ["build.gradle", "build.gradle.kts", "pom.xml"],
    extensions: [".kt", ".kts", ".java"],
  },
];
