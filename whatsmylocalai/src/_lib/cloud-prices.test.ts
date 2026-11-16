import { describe, it } from "node:test";
import assert from "node:assert/strict";

import cloudPrices from "../_data/cloud_prices.js";

describe("cloud price presets", () => {
  const presets = cloudPrices();

  it("ships a frontier, mid, and budget tier", () => {
    assert.deepEqual(
      presets.map((preset) => preset.key),
      ["frontier", "mid", "budget"],
    );
  });

  it("prices every tier and derives the per-million figure", () => {
    for (const preset of presets) {
      assert.ok(preset.input > 0, preset.key);
      assert.ok(preset.output > 0, preset.key);
      assert.equal(preset.perMillion, preset.input * 4 + preset.output);
    }
  });

  it("keeps the tiers in descending order of price", () => {
    const prices = presets.map((preset) => preset.perMillion);
    assert.deepEqual(
      prices,
      [...prices].sort((a, b) => b - a),
    );
  });
});
