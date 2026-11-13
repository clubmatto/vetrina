import { describe, it } from "node:test";
import assert from "node:assert/strict";

import chips from "../_data/apple_chips.json" with { type: "json" };
import speed from "../_data/apple_speed.json" with { type: "json" };

const bins = speed.bins as unknown as Record<string, [number, number][]>;
const chipTable = chips as [string, number[]][];

/** First bin whose memory ceiling covers `ram`, or null. */
function bandwidthFor(chip: string, ram: number): number | null {
  const entries = bins[chip];
  if (!entries) return null;
  for (const [maxRam, bandwidth] of entries) {
    if (ram <= maxRam) return bandwidth;
  }
  return null;
}

describe("apple_speed data", () => {
  it("covers every chip in the chip table", () => {
    for (const [chip] of chipTable) {
      assert.ok(bins[chip], `${chip} has no bandwidth bins`);
    }
  });

  it("keeps bins sorted and covers every memory configuration", () => {
    for (const [chip, configs] of chipTable) {
      const entries = bins[chip];
      const ceilings = entries.map(([maxRam]) => maxRam);
      assert.deepEqual(
        ceilings,
        [...ceilings].sort((a, b) => a - b),
      );
      for (const ram of configs) {
        assert.ok(
          bandwidthFor(chip, ram) !== null,
          `${chip} at ${ram} GB has no bandwidth`,
        );
      }
    }
  });

  it("matches known Apple specs", () => {
    assert.equal(bandwidthFor("M1", 16), 68.25);
    assert.equal(bandwidthFor("M2", 24), 100);
    assert.equal(bandwidthFor("M3 Max", 36), 300);
    assert.equal(bandwidthFor("M3 Max", 48), 400);
    assert.equal(bandwidthFor("M4 Pro", 48), 273);
    assert.equal(bandwidthFor("M4 Max", 36), 410);
    assert.equal(bandwidthFor("M4 Max", 64), 546);
    assert.equal(bandwidthFor("M5", 16), 153);
    assert.equal(bandwidthFor("M5", 32), 170);
    assert.equal(bandwidthFor("M5 Pro", 48), 307);
    assert.equal(bandwidthFor("M5 Max", 36), 460);
    assert.equal(bandwidthFor("M5 Max", 128), 614);
    assert.equal(bandwidthFor("M5 Ultra", 512), 1200);
  });
});
