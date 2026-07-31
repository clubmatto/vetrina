/**
 * Model list logic: filtering, sorting, grouping, run commands.
 * Pure functions over the merged registry inlined in the page.
 */

import type { ModelRegistry, ModelRegistryEntry } from "@auxot/model-registry";
import { suggestModelsForVRAM } from "@auxot/model-registry";

/** Registry entry after _data/models.js merged snapshot + enrichment. */
export interface MergedModel extends ModelRegistryEntry {
  family_label: string;
  params_b: number;
  description: string;
  ollama_tag: string;
  blurb: string;
}

export interface MergedRegistry extends ModelRegistry {
  models: MergedModel[];
}

export type Runner = "lmstudio" | "ollama";
export type SortKey = "size-desc" | "size-asc" | "name";

export function suggestMerged(
  registry: MergedRegistry,
  vram: number,
): MergedModel[] {
  // The registry only ever holds MergedModels, so the entries the package
  // query returns are MergedModels too (it just can't know that).
  return suggestModelsForVRAM(registry, vram) as MergedModel[];
}

/**
 * Re-rank a set of fitting models along a performance-vs-resources axis.
 *
 * `perfBias` runs 0..1: 1 is "maximum performance" and returns the list
 * untouched (largest first — what the registry already sorts by, and the
 * current best-pick behavior). As it drops toward 0 ("resource-lean"),
 * small/fast models float to the top: the score normalizes params
 * (performance proxy) against VRAM (resource cost) within the candidate
 * set, so a lightweight 8B edges out a 70B that barely fits.
 */
export function rankByTradeoff(
  models: readonly MergedModel[],
  perfBias: number,
): MergedModel[] {
  const clamped = Math.min(1, Math.max(0, perfBias));
  if (clamped >= 1 || models.length < 2) return [...models];

  const pMax = Math.max(...models.map((m) => m.params_b));
  const pMin = Math.min(...models.map((m) => m.params_b));
  const rMax = Math.max(...models.map((m) => m.vram_requirements_gb));
  const rMin = Math.min(...models.map((m) => m.vram_requirements_gb));
  const pRange = pMax - pMin || 1;
  const rRange = rMax - rMin || 1;

  const lean = 1 - clamped;
  const score = (m: MergedModel): number =>
    clamped * ((m.params_b - pMin) / pRange) -
    lean * ((m.vram_requirements_gb - rMin) / rRange);

  return [...models].sort((a, b) => score(b) - score(a));
}

export function matchesFilter(
  model: MergedModel,
  query: string,
  caps: string[],
): boolean {
  // ModelCapability[] is a subtype of string[], so this widening is safe.
  const modelCaps: readonly string[] = model.capabilities;
  if (caps.length && !caps.every((c) => modelCaps.includes(c))) {
    return false;
  }
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack =
    `${model.model_name} ${model.description} ${model.parameters} ` +
    model.capabilities.join(" ");
  return haystack.toLowerCase().includes(q);
}

export function sortModels(
  models: readonly MergedModel[],
  sort: SortKey,
): MergedModel[] {
  const sorted = [...models];
  if (sort === "size-asc") {
    sorted.sort(
      (a, b) =>
        a.params_b - b.params_b ||
        a.vram_requirements_gb - b.vram_requirements_gb,
    );
  } else if (sort === "name") {
    sorted.sort((a, b) => a.model_name.localeCompare(b.model_name));
  } else {
    sorted.sort(
      (a, b) =>
        b.params_b - a.params_b ||
        b.vram_requirements_gb - a.vram_requirements_gb,
    );
  }
  return sorted;
}

export function availableCaps(models: readonly MergedModel[]): string[] {
  return [...new Set(models.flatMap((m) => m.capabilities))].sort();
}

/** Fits, but barely (uses more than 85% of the budget). */
export function isTight(model: MergedModel, vram: number): boolean {
  return (
    model.vram_requirements_gb <= vram &&
    model.vram_requirements_gb > vram * 0.85
  );
}

export function runCmd(model: MergedModel, runner: Runner): string {
  if (runner === "lmstudio") {
    return `lms get https://huggingface.co/${model.huggingface_id}@${model.quantization.toLowerCase()}`;
  }
  const tag =
    model.ollama_tag || model.model_name.toLowerCase().replace(/\s+/g, "-");
  return `ollama run ${tag}`;
}
