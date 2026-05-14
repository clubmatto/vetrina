import { detectors } from "./language-detectors";
import { scanTree } from "./scanner";

interface DetectionResult {
  languages: string[];
  isMonorepo: boolean;
  primaryLanguage?: string;
}

function hasMatchingFile(files: string[], names: string[]): boolean {
  return names.some((name) =>
    files.some((f) => f === name || f.endsWith("/" + name)),
  );
}

function hasMatchingExtension(files: string[], extensions: string[]): boolean {
  return extensions.some((ext) => files.some((f) => f.endsWith(ext)));
}

export function detectLanguages(cwd: string): DetectionResult {
  const { allFiles, rootFiles } = scanTree(cwd);

  const detected = new Set<string>();

  for (const detector of detectors) {
    const hasConfigAtRoot = hasMatchingFile(rootFiles, detector.configFiles);
    const hasConfigInTree = hasMatchingFile(allFiles, detector.configFiles);
    const hasSource = hasMatchingExtension(allFiles, detector.extensions);

    if (hasConfigAtRoot || hasConfigInTree || hasSource) {
      detected.add(detector.name);
    }
  }

  const languages = Array.from(detected);
  const isMonorepo = languages.length > 1;
  const primaryLanguage = languages.length > 0 ? languages[0] : undefined;

  return { languages, isMonorepo, primaryLanguage };
}

export function getRuleFilesForLanguages(languages: string[]): string[] {
  const ruleFiles = new Set<string>();

  for (const language of languages) {
    const detector = detectors.find((d) => d.name === language);
    if (detector) {
      ruleFiles.add(detector.ruleFile);
    }
  }

  return Array.from(ruleFiles);
}

export function getAllRuleFiles(): string[] {
  return detectors.map((detector) => detector.ruleFile);
}

export function isLanguageSpecificRule(ruleFile: string): boolean {
  return detectors.some((detector) => detector.ruleFile === ruleFile);
}
