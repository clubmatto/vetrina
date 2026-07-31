/**
 * Hardware detection. Everything here is pure except `detectGPU`, which
 * touches WebGL. All functions are client-side; nothing leaves the browser.
 */

export type Vendor = "apple" | "nvidia" | "amd" | "intel" | "unknown";

export type OS =
  "android" | "ios" | "windows" | "macos" | "chromeos" | "linux" | "unknown";

export type GpuDatabase = readonly (readonly [string, number])[];

export interface VramEstimate {
  vram: number;
  source: string;
}

export function detectGPU(): string | null {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return null;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    return typeof renderer === "string" ? renderer : null;
  } catch {
    return null;
  }
}

export function detectVendor(gpuName: string): Vendor {
  const name = gpuName.toLowerCase();
  if (name.includes("apple")) return "apple";
  if (/nvidia|geforce|\brtx\b|\bgtx\b/.test(name)) return "nvidia";
  if (/amd|radeon|\brx \d/.test(name)) return "amd";
  if (/intel|arc|iris|uhd/.test(name)) return "intel";
  return "unknown";
}

export function lookupGPU(
  gpuName: string,
  database: GpuDatabase,
): { key: string; vram: number } | null {
  const sorted = [...database].sort((a, b) => b[0].length - a[0].length);
  for (const [key, vram] of sorted) {
    if (gpuName.includes(key)) return { key, vram };
  }
  return null;
}

export function nearestTier(value: number): number {
  const tiers = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80];
  let tier = tiers[0];
  for (const t of tiers) {
    if (t <= value) tier = t;
  }
  return tier;
}

export function detectOS(userAgent: string): OS {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/windows/i.test(userAgent)) return "windows";
  if (/mac os|macintosh/i.test(userAgent)) return "macos";
  if (/cros/i.test(userAgent)) return "chromeos";
  if (/linux/i.test(userAgent)) return "linux";
  return "unknown";
}

/**
 * VRAM estimation, most confident first:
 * 1. Apple Silicon with an honest RAM report → ~70% unified memory.
 * 2. Known discrete GPU → lookup table.
 * 3. Known RAM → tiered guess.
 * 4. Nothing → wild guess.
 *
 * Browsers cap `deviceMemory` at 8 GB, so on Apple Silicon a capped report
 * (ramCapped) yields a *minimum* estimate, flagged as such in `source`.
 */
export function estimateVRAM(input: {
  vendor: Vendor;
  gpuName: string | null;
  ram: number;
  ramKnown: boolean;
  ramCapped: boolean;
  gpuDatabase: GpuDatabase;
}): VramEstimate {
  const { vendor, gpuName, ram, ramKnown, ramCapped, gpuDatabase } = input;

  if (vendor === "apple" && ramKnown) {
    const vram = Math.round(ram * 0.7);
    if (ramCapped) {
      return {
        vram,
        source:
          "at least this much — browsers cap reported RAM at 8 GB on Macs; adjust if yours is higher",
      };
    }
    return { vram, source: "unified memory (~70% of RAM)" };
  }

  if (gpuName) {
    const hit = lookupGPU(gpuName, gpuDatabase);
    if (hit) {
      return { vram: hit.vram, source: "known GPU" };
    }
  }

  if (ramKnown) {
    return {
      vram: nearestTier(Math.max(2, ram * 0.5)),
      source: vendor === "intel" ? "shared memory guess" : "guess from RAM",
    };
  }

  return { vram: 4, source: "wild guess — adjust below" };
}
