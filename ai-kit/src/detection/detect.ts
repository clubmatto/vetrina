import { detectors } from "./language-detectors";
import { hasAnyConfigFile, hasAnySourceFile } from "./scanner";

interface DetectionResult {
  languages: string[];
  isMonorepo: boolean;
  primaryLanguage?: string;
}

export function detectLanguages(cwd: string): DetectionResult {
  const detected = new Set<string>();

  for (const detector of detectors) {
    if (hasAnyConfigFile(cwd, detector.configFiles)) {
      detected.add(detector.name);
    }
  }

  if (detected.size === 0) {
    for (const detector of detectors) {
      if (hasAnySourceFile(cwd, detector.extensions, 2)) {
        detected.add(detector.name);
      }
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
