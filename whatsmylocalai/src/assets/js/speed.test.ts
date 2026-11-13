import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { backendForVendor, estimateSpeed, formatSpeed } from "./speed";

describe("backendForVendor", () => {
  it("maps vendors to their inference backend", () => {
    assert.equal(backendForVendor("nvidia"), "cuda");
    assert.equal(backendForVendor("amd"), "rocm");
    assert.equal(backendForVendor("intel"), "vulkan");
    assert.equal(backendForVendor("apple"), "metal");
    assert.equal(backendForVendor("unknown"), null);
  });
});

describe("estimateSpeed", () => {
  it("estimates a dense model from bandwidth and weights", () => {
    const estimate = estimateSpeed({
      bandwidthGbS: 1008,
      backend: "cuda",
      vramGb: 16.82,
      paramsB: 27.78,
      activeParamsB: 27.78,
    });

    assert.deepEqual(estimate, { low: 19, high: 25 });
  });

  it("gives sparse models a higher estimate than dense ones", () => {
    const dense = estimateSpeed({
      bandwidthGbS: 1008,
      backend: "cuda",
      vramGb: 31,
      paramsB: 31,
      activeParamsB: 31,
    });
    const sparse = estimateSpeed({
      bandwidthGbS: 1008,
      backend: "cuda",
      vramGb: 31,
      paramsB: 31,
      activeParamsB: 3,
    });

    assert.ok(dense && sparse);
    assert.ok(sparse.low > dense.high);
  });

  it("scales with bandwidth", () => {
    const fast = estimateSpeed({
      bandwidthGbS: 1000,
      backend: "cuda",
      vramGb: 8,
      paramsB: 8,
      activeParamsB: 8,
    });
    const slow = estimateSpeed({
      bandwidthGbS: 500,
      backend: "cuda",
      vramGb: 8,
      paramsB: 8,
      activeParamsB: 8,
    });

    assert.ok(fast && slow);
    assert.ok(fast.low > slow.high);
  });

  it("returns null when the hardware is unknown", () => {
    assert.equal(
      estimateSpeed({
        bandwidthGbS: null,
        backend: "cuda",
        vramGb: 8,
        paramsB: 8,
        activeParamsB: 8,
      }),
      null,
    );
    assert.equal(
      estimateSpeed({
        bandwidthGbS: 1000,
        backend: null,
        vramGb: 8,
        paramsB: 8,
        activeParamsB: 8,
      }),
      null,
    );
    assert.equal(
      estimateSpeed({
        bandwidthGbS: 1000,
        backend: "cuda",
        vramGb: 0,
        paramsB: 8,
        activeParamsB: 8,
      }),
      null,
    );
  });

  it("never returns an inverted band", () => {
    const estimate = estimateSpeed({
      bandwidthGbS: 89.6,
      backend: "cpu",
      vramGb: 4,
      paramsB: 8,
      activeParamsB: 8,
    });

    assert.ok(estimate);
    assert.ok(estimate.high > estimate.low);
  });
});

describe("formatSpeed", () => {
  it("renders a rounded band", () => {
    assert.equal(formatSpeed({ low: 45, high: 60 }), "~45-60 tok/s");
  });
});
