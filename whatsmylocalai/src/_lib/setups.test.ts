import assert from "node:assert/strict";
import test from "node:test";

import appleSpeed from "../_data/apple_speed.json" with { type: "json" };
import gpuSpeed from "../_data/gpu_speed.json" with { type: "json" };
import rigs from "../_data/setups.json" with { type: "json" };
import { buildModels } from "./models-merge.js";
import {
  SETUP_SPEED_FLOOR,
  bandwidthForRig,
  buildSetups,
  selectSetupModel,
} from "./setups.js";

const registry = buildModels();
const tables = { appleSpeed, gpuSpeed };

interface SetupCard {
  id: string;
  model: string;
  speed: { low: number; high: number };
  speed_label: string;
  vendor_url: string;
  last_checked_label: string;
}

function buildCards(): SetupCard[] {
  return buildSetups(rigs, registry, tables) as SetupCard[];
}

test("every recommended setup clears the speed floor", () => {
  const cards = buildCards();

  assert.equal(cards.length, 4);
  for (const card of cards) {
    assert.equal(card.speed.low >= SETUP_SPEED_FLOOR, true, card.id);
    assert.equal(typeof card.vendor_url, "string");
    assert.equal(card.last_checked_label, "Nov 17, 2026");
  }
});

test("builds the expected model for each rig", () => {
  const cards = buildCards();
  const byId = Object.fromEntries(cards.map((card) => [card.id, card]));

  assert.equal(byId["mac-mini-m4-16"].model, "gpt-oss-20b");
  assert.equal(byId["mac-mini-m4-16"].speed_label, "~25-35 tok/s");

  assert.equal(byId["macbook-pro-m4-pro-24"].model, "Qwen3-30B-A3B");
  assert.equal(byId["macbook-pro-m4-pro-24"].speed_label, "~70-95 tok/s");

  assert.equal(byId["rtx-4060-ti-16"].model, "Qwen3-30B-A3B");
  assert.equal(byId["rtx-4060-ti-16"].speed_label, "~60-80 tok/s");

  assert.equal(byId["rtx-4090-24"].model, "Qwen3.5-35B-A3B");
  assert.equal(byId["rtx-4090-24"].speed_label, "~210-285 tok/s");
});

test("skips a larger model that is too slow", () => {
  const pick = selectSetupModel({
    models: registry.models,
    vramGb: 17,
    bandwidthGbS: 273,
    backend: "metal",
  });

  assert.equal(pick?.model.model_name, "Qwen3-30B-A3B");
});

test("returns nothing when no model clears the floor", () => {
  const pick = selectSetupModel({
    models: registry.models,
    vramGb: 17,
    bandwidthGbS: 273,
    backend: "metal",
    floor: 1000,
  });

  assert.equal(pick, null);
});

test("throws when a rig cannot produce a pick", () => {
  const impossible = {
    ...rigs[0],
    id: "impossible",
    vram_gb: 0,
  };

  assert.throws(
    () => buildSetups([impossible], registry, tables),
    /No model clears 20 tok\/s for setup impossible/,
  );
});

test("looks up bandwidth by chip or GPU", () => {
  assert.equal(
    bandwidthForRig({ vendor: "apple", gpu: "M4 Pro", memory_gb: 24 }, tables),
    273,
  );
  assert.equal(
    bandwidthForRig(
      { vendor: "nvidia", gpu: "RTX 4060 Ti", memory_gb: 32 },
      tables,
    ),
    288,
  );
  assert.equal(
    bandwidthForRig({ vendor: "apple", gpu: "M9", memory_gb: 16 }, tables),
    null,
  );
});
