import { suggestModelsForVRAM } from "@auxot/model-registry";
import {
  backendForVendor,
  estimateSpeed,
  formatSpeed,
} from "../assets/js/speed.ts";

/** A recommended rig has to clear this at the low end of the estimate. */
export const SETUP_SPEED_FLOOR = 20;

/**
 * Memory bandwidth for a rig. Apple chips use the bin whose memory ceiling
 * covers the machine; discrete GPUs use the GPU table.
 */
export function bandwidthForRig(rig, { gpuSpeed, appleSpeed }) {
  if (rig.vendor === "apple") {
    const bins = appleSpeed.bins[rig.gpu];
    if (!bins) return null;
    for (const [maxMemory, bandwidth] of bins) {
      if (rig.memory_gb <= maxMemory) return bandwidth;
    }
    return null;
  }
  return gpuSpeed.bandwidth_gbs[rig.gpu] ?? null;
}

/**
 * The largest model that fits and clears the speed floor at its low end.
 * Ties break toward the smaller footprint, then the name for stable output.
 */
export function selectSetupModel({
  models,
  vramGb,
  bandwidthGbS,
  backend,
  floor = SETUP_SPEED_FLOOR,
}) {
  if (!bandwidthGbS || !backend) return null;

  const candidates = suggestModelsForVRAM({ models }, vramGb)
    .map((model) => ({
      model,
      speed: estimateSpeed({
        bandwidthGbS,
        backend,
        vramGb: model.vram_requirements_gb,
        paramsB: model.params_b,
        activeParamsB: model.active_params_b,
      }),
    }))
    .filter((entry) => entry.speed && entry.speed.low >= floor);

  candidates.sort(
    (a, b) =>
      b.model.params_b - a.model.params_b ||
      a.model.vram_requirements_gb - b.model.vram_requirements_gb ||
      a.model.model_name.localeCompare(b.model.model_name),
  );

  return candidates[0] ?? null;
}

export function buildSetups(rigs, registry, tables, floor = SETUP_SPEED_FLOOR) {
  return rigs.map((rig) => {
    const bandwidthGbS = bandwidthForRig(rig, tables);
    const backend = backendForVendor(rig.vendor);
    const pick = selectSetupModel({
      models: registry.models,
      vramGb: rig.vram_gb,
      bandwidthGbS,
      backend,
      floor,
    });

    if (!pick) {
      throw new Error(
        `No model clears ${floor} tok/s for setup ${rig.id} ` +
          `(${rig.gpu}, ${rig.vram_gb} GB budget)`,
      );
    }

    return {
      ...rig,
      model: pick.model.model_name,
      model_vram_gb: pick.model.vram_requirements_gb,
      model_params_b: pick.model.params_b,
      speed: pick.speed,
      speed_label: formatSpeed(pick.speed),
      last_checked_label: new Date(
        `${rig.last_checked}T00:00:00Z`,
      ).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "UTC",
      }),
    };
  });
}
