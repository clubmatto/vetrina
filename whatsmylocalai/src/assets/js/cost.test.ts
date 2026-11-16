import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { estimateCosts } from "./cost";

const base = {
  hoursPerDay: 2,
  tokensPerSecond: 250,
  watts: 450,
  electricityPrice: 0.3,
  hardwareCost: 2000,
  hardwareYears: 3,
  cloudPerMillion: 50,
  includeHardware: true,
};

describe("estimateCosts", () => {
  it("splits the local bill into hardware and electricity", () => {
    const estimate = estimateCosts(base);

    assert.ok(estimate);
    assert.equal(estimate.tokensPerMonth, 54_000_000);
    assert.ok(Math.abs(estimate.electricityMonthly - 8.1) < 0.01);
    assert.ok(Math.abs(estimate.hardwareMonthly - 55.5556) < 0.01);
    assert.ok(Math.abs(estimate.localMonthly - 63.6556) < 0.01);
    assert.ok(Math.abs(estimate.cloudMonthly - 2700) < 0.01);
    assert.ok(Math.abs(estimate.localPerMillion - 1.1788) < 0.001);
  });

  it("computes a payback and a crossover", () => {
    const estimate = estimateCosts(base);

    assert.ok(estimate);
    assert.ok(estimate.paybackMonths !== null);
    assert.ok(Math.abs(estimate.paybackMonths - 0.7433) < 0.001);
    assert.ok(estimate.crossoverHoursPerDay !== null);
    assert.ok(Math.abs(estimate.crossoverHoursPerDay - 0.04128) < 0.001);
  });

  it("drops the hardware when you already own it", () => {
    const estimate = estimateCosts({ ...base, includeHardware: false });

    assert.ok(estimate);
    assert.equal(estimate.hardwareMonthly, 0);
    assert.ok(Math.abs(estimate.localMonthly - 8.1) < 0.01);
    assert.ok(Math.abs(estimate.localPerMillion - 0.15) < 0.001);
    assert.equal(estimate.paybackMonths, null);
    assert.equal(estimate.crossoverHoursPerDay, null);
  });

  it("makes fast models cheaper per million tokens", () => {
    const slow = estimateCosts({ ...base, tokensPerSecond: 125 });
    const fast = estimateCosts({ ...base, tokensPerSecond: 500 });

    assert.ok(slow && fast);
    assert.ok(slow.localMonthly === fast.localMonthly);
    assert.ok(slow.localPerMillion > fast.localPerMillion * 3.9);
  });

  it("scales the cloud bill with usage but not the local fixed cost", () => {
    const two = estimateCosts(base);
    const four = estimateCosts({ ...base, hoursPerDay: 4 });

    assert.ok(two && four);
    assert.ok(Math.abs(four.cloudMonthly - two.cloudMonthly * 2) < 0.01);
    assert.ok(four.localMonthly < two.localMonthly * 2);
  });

  it("returns null on empty or impossible inputs", () => {
    assert.equal(estimateCosts({ ...base, hoursPerDay: 0 }), null);
    assert.equal(estimateCosts({ ...base, tokensPerSecond: 0 }), null);
    assert.equal(estimateCosts({ ...base, cloudPerMillion: 0 }), null);
    assert.equal(estimateCosts({ ...base, watts: -1 }), null);
    assert.equal(estimateCosts({ ...base, hardwareYears: 0 }), null);
  });

  it("reports no payback when cloud is cheaper than electricity", () => {
    const estimate = estimateCosts({ ...base, cloudPerMillion: 0.1 });

    assert.ok(estimate);
    assert.equal(estimate.paybackMonths, null);
    assert.equal(estimate.crossoverHoursPerDay, null);
  });
});
