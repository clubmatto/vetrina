/**
 * Decode-speed estimates, ported from the llmspeed model (MIT):
 * https://github.com/nicorobinreal/llmspeed
 *
 * Single device, batch size 1, short prompt. The estimate is deliberately a
 * band: real numbers move 10-30% with drivers, engine builds, and thermals.
 */

import type { Vendor } from "./detect";

export type Backend = "cuda" | "metal" | "rocm" | "vulkan" | "cpu";

interface BackendCoefficients {
  /** Bandwidth actually reached as a share of the card's peak. */
  decodeBandwidth: number;
  /** Slowdown per 8k of context. */
  contextDerate: number;
}

const COEFFICIENTS: Record<Backend, BackendCoefficients> = {
  cuda: { decodeBandwidth: 0.3725, contextDerate: 0.99 },
  metal: { decodeBandwidth: 0.481, contextDerate: 0.9197 },
  rocm: { decodeBandwidth: 0.5569, contextDerate: 0.9637 },
  vulkan: { decodeBandwidth: 0.1926, contextDerate: 0.92 },
  cpu: { decodeBandwidth: 0.6692, contextDerate: 0.9 },
};

/** One 8k context step, matching the catalog's default context size. */
const CONTEXT_STEPS = 1;

/** The share of a full-GPU estimate the band spans. */
const BAND = 0.15;

export interface SpeedEstimate {
  low: number;
  high: number;
}

export function backendForVendor(vendor: Vendor): Backend | null {
  switch (vendor) {
    case "nvidia":
      return "cuda";
    case "amd":
      return "rocm";
    case "intel":
      return "vulkan";
    case "apple":
      return "metal";
    default:
      return null;
  }
}

/** Round to the nearest 5 above 20 tok/s, to whole numbers below. */
function round(value: number): number {
  return value >= 20 ? Math.round(value / 5) * 5 : Math.round(value);
}

/**
 * Decode speed for a model that fits entirely on one device.
 *
 * Weights come from the catalog's Q4 VRAM figure. Sparse models only read
 * their active parameters per token, so the active share scales the weight
 * traffic down.
 */
export function estimateSpeed(input: {
  bandwidthGbS: number | null;
  backend: Backend | null;
  vramGb: number;
  paramsB: number;
  activeParamsB: number | null;
}): SpeedEstimate | null {
  const { bandwidthGbS, backend, vramGb, paramsB, activeParamsB } = input;

  if (!bandwidthGbS || !backend) return null;
  if (!vramGb || !paramsB) return null;

  const active = activeParamsB ?? paramsB;
  if (!active || active <= 0) return null;

  const activeWeightsGb = vramGb * (active / paramsB);
  if (activeWeightsGb <= 0) return null;

  const coefficients = COEFFICIENTS[backend];
  const tokensPerSecond =
    ((bandwidthGbS * coefficients.decodeBandwidth) / activeWeightsGb) *
    coefficients.contextDerate ** CONTEXT_STEPS;

  const low = round(tokensPerSecond * (1 - BAND));
  const high = Math.max(low + 1, round(tokensPerSecond * (1 + BAND)));

  return { low, high };
}

export function formatSpeed(estimate: SpeedEstimate): string {
  return `~${estimate.low}-${estimate.high} tok/s`;
}
