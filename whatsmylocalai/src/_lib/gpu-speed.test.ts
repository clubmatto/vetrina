import { describe, it } from "node:test";
import assert from "node:assert/strict";

import database from "../_data/gpu_database.json" with { type: "json" };
import speed from "../_data/gpu_speed.json" with { type: "json" };

const bandwidth = speed.bandwidth_gbs as Record<string, number>;

describe("gpu_speed data", () => {
  it("carries the source and license for attribution", () => {
    assert.match(speed.source, /gpuark/i);
    assert.equal(speed.license, "CC BY 4.0");
  });

  it("covers every GPU in the database and nothing else", () => {
    const expected = database.map(([name]) => name).sort();
    assert.deepEqual(Object.keys(bandwidth).sort(), expected);
  });

  it("gives every GPU a plausible bandwidth", () => {
    for (const [name] of database) {
      const value = bandwidth[name];
      assert.ok(
        typeof value === "number" && value >= 50 && value <= 4000,
        `${name} has an implausible bandwidth: ${value}`,
      );
    }
  });

  it("matches known specs", () => {
    assert.ok(bandwidth["RTX 4090"] >= 1000 && bandwidth["RTX 4090"] <= 1020);
    assert.ok(bandwidth["RTX 3090"] >= 920 && bandwidth["RTX 3090"] <= 950);
    assert.ok(bandwidth["RTX 3060"] >= 350 && bandwidth["RTX 3060"] <= 370);
    assert.ok(bandwidth["RTX 5090"] >= 1780 && bandwidth["RTX 5090"] <= 1800);
    assert.ok(bandwidth["RX 7800 XT"] >= 610 && bandwidth["RX 7800 XT"] <= 640);
    assert.ok(
      bandwidth["GTX 1080 Ti"] >= 470 && bandwidth["GTX 1080 Ti"] <= 500,
    );
  });
});
