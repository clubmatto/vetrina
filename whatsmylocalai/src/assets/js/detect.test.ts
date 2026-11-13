import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  chipRamCandidates,
  detectAppleChip,
  detectOS,
  detectVendor,
  estimateVRAM,
  lookupGPU,
  nearestTier,
  suggestRAM,
} from "./detect";

const gpuDatabase = [
  ["RTX 4090", 24],
  ["RTX 409", 1],
] as const;

const appleChips = [
  ["M1", [8, 16]],
  ["M1 Pro", [16, 32]],
] as const;

describe("detectVendor", () => {
  it("recognizes the four vendors we model", () => {
    assert.equal(detectVendor("Apple M1 Max"), "apple");
    assert.equal(detectVendor("NVIDIA GeForce RTX 4090"), "nvidia");
    assert.equal(detectVendor("AMD Radeon RX 7900 XTX"), "amd");
    assert.equal(detectVendor("Intel Arc A770"), "intel");
    assert.equal(detectVendor("Mystery GPU"), "unknown");
  });
});

describe("lookupGPU", () => {
  it("prefers the longest matching key", () => {
    assert.deepEqual(lookupGPU("NVIDIA GeForce RTX 4090", gpuDatabase), {
      key: "RTX 4090",
      vram: 24,
    });
  });

  it("returns null for an unknown GPU", () => {
    assert.equal(lookupGPU("NVIDIA GeForce RTX 3060", gpuDatabase), null);
  });
});

describe("nearestTier", () => {
  it("rounds down to the nearest memory tier", () => {
    assert.equal(nearestTier(1), 2);
    assert.equal(nearestTier(2), 2);
    assert.equal(nearestTier(3), 2);
    assert.equal(nearestTier(4), 4);
    assert.equal(nearestTier(5), 4);
    assert.equal(nearestTier(7), 6);
    assert.equal(nearestTier(100), 80);
  });
});

describe("detectOS", () => {
  it("reads the user agent", () => {
    assert.equal(detectOS("Mozilla/5.0 (Linux; Android 15)"), "android");
    assert.equal(detectOS("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)"), "ios");
    assert.equal(
      detectOS("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"),
      "windows",
    );
    assert.equal(
      detectOS("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"),
      "macos",
    );
    assert.equal(detectOS("Mozilla/5.0 (X11; CrOS x86_64)"), "chromeos");
    assert.equal(detectOS("Mozilla/5.0 (X11; Linux x86_64)"), "linux");
    assert.equal(detectOS("Something else"), "unknown");
  });
});

describe("detectAppleChip", () => {
  it("extracts the chip and variant", () => {
    assert.equal(detectAppleChip("Apple M1 Max"), "M1 Max");
    assert.equal(detectAppleChip("Apple M3 Pro"), "M3 Pro");
    assert.equal(detectAppleChip("Apple M4"), "M4");
    assert.equal(detectAppleChip("Apple M5 Max"), "M5 Max");
    assert.equal(detectAppleChip("NVIDIA GeForce RTX 4090"), null);
    assert.equal(detectAppleChip(null), null);
  });
});

describe("chipRamCandidates", () => {
  it("matches the chip case-insensitively", () => {
    assert.deepEqual(chipRamCandidates("m1 pro", appleChips), [16, 32]);
    assert.deepEqual(chipRamCandidates("M1", appleChips), [8, 16]);
    assert.equal(chipRamCandidates("M9", appleChips), null);
    assert.equal(chipRamCandidates(null, appleChips), null);
  });
});

describe("suggestRAM", () => {
  it("falls back to 16 GB when the browser exposes nothing", () => {
    assert.deepEqual(
      suggestRAM({
        vendor: "apple",
        chip: "M1",
        deviceMemory: null,
        chipDatabase: appleChips,
      }),
      { ram: 16, ramKnown: false, ramCapped: false },
    );
  });

  it("uses the smallest Apple RAM config when memory is capped at 8 GB", () => {
    assert.deepEqual(
      suggestRAM({
        vendor: "apple",
        chip: "M1 Pro",
        deviceMemory: 8,
        chipDatabase: appleChips,
      }),
      { ram: 16, ramKnown: true, ramCapped: true },
    );
  });

  it("keeps the capped value on non-Apple hardware", () => {
    assert.deepEqual(
      suggestRAM({
        vendor: "nvidia",
        chip: null,
        deviceMemory: 8,
        chipDatabase: appleChips,
      }),
      { ram: 8, ramKnown: true, ramCapped: true },
    );
  });

  it("trusts higher browser values", () => {
    assert.deepEqual(
      suggestRAM({
        vendor: "nvidia",
        chip: null,
        deviceMemory: 16,
        chipDatabase: appleChips,
      }),
      { ram: 16, ramKnown: true, ramCapped: false },
    );
  });
});

describe("estimateVRAM", () => {
  it("uses 70 percent of unified memory on Apple Silicon", () => {
    assert.deepEqual(
      estimateVRAM({
        vendor: "apple",
        gpuName: "Apple M1 Pro",
        ram: 16,
        ramKnown: true,
        ramCapped: false,
        gpuDatabase,
      }),
      { vram: 11 },
    );
  });

  it("uses the GPU lookup table for a known discrete GPU", () => {
    assert.deepEqual(
      estimateVRAM({
        vendor: "nvidia",
        gpuName: "NVIDIA GeForce RTX 4090",
        ram: 32,
        ramKnown: true,
        ramCapped: false,
        gpuDatabase,
      }),
      { vram: 24 },
    );
  });

  it("falls back to a RAM-based tier for an unknown GPU", () => {
    assert.deepEqual(
      estimateVRAM({
        vendor: "nvidia",
        gpuName: "NVIDIA GeForce RTX 3060",
        ram: 16,
        ramKnown: true,
        ramCapped: false,
        gpuDatabase,
      }),
      { vram: 8 },
    );
  });

  it("uses a floor of 4 GB when nothing is known", () => {
    assert.deepEqual(
      estimateVRAM({
        vendor: "unknown",
        gpuName: null,
        ram: 8,
        ramKnown: false,
        ramCapped: false,
        gpuDatabase,
      }),
      { vram: 4 },
    );
  });
});
