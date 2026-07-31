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

export interface FamilyGroup {
  family: string;
  models: MergedModel[];
}

export function suggestMerged(
  registry: MergedRegistry,
  vram: number,
): MergedModel[] {
  // The registry only ever holds MergedModels, so the entries the package
  // query returns are MergedModels too (it just can't know that).
  return suggestModelsForVRAM(registry, vram) as MergedModel[];
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

/** Group by family, families ordered by their largest model's VRAM first. */
export function groupByFamily(models: readonly MergedModel[]): FamilyGroup[] {
  const groups = new Map<string, MergedModel[]>();
  for (const m of models) {
    const list = groups.get(m.family_label);
    if (list) {
      list.push(m);
    } else {
      groups.set(m.family_label, [m]);
    }
  }
  return [...groups.entries()]
    .map(([family, groupModels]) => ({ family, models: groupModels }))
    .sort(
      (a, b) =>
        Math.max(...b.models.map((m) => m.vram_requirements_gb)) -
        Math.max(...a.models.map((m) => m.vram_requirements_gb)),
    );
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
