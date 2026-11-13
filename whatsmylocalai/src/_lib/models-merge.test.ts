import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { buildModels } from "./models-merge.js";

interface BuiltModel {
  id: string;
  model_name: string;
  huggingface_id: string;
  quantization: string;
  params_b: number;
  active_params_b: number;
  vram_requirements_gb: number;
}

interface BuiltRegistry {
  generated_at: string;
  sources: { models_dev: string; registry: string };
  models: BuiltModel[];
}

// buildModels is plain JavaScript; this is the shape _data/models.js consumes.
const registry = buildModels() as BuiltRegistry;

describe("buildModels", () => {
  it("builds a catalog big enough to recommend from", () => {
    assert.ok(
      registry.models.length >= 50,
      `expected at least 50 models, got ${registry.models.length}`,
    );
    assert.ok(!Number.isNaN(Date.parse(registry.generated_at)));
  });

  it("reports when each upstream catalog was published", () => {
    const isoDate = /^\d{4}-\d{2}-\d{2}$/;

    assert.match(registry.sources.models_dev, isoDate);
    assert.match(registry.sources.registry, isoDate);
  });

  it("has unique model names and ids", () => {
    const ids = new Set(registry.models.map((model) => model.id));
    const names = new Set(registry.models.map((model) => model.model_name));

    assert.equal(ids.size, registry.models.length);
    assert.equal(names.size, registry.models.length);
  });

  it("only ships Q4 entries with positive sizes", () => {
    for (const model of registry.models) {
      assert.ok(model.id.trim().length > 0, "empty id");
      assert.ok(model.model_name.trim().length > 0, "empty model name");
      assert.ok(model.huggingface_id.includes("/"), model.model_name);
      assert.ok(model.quantization.startsWith("Q4"), model.model_name);
      assert.ok(model.params_b > 0, model.model_name);
      assert.ok(model.vram_requirements_gb > 0, model.model_name);
    }
  });
});

describe("active parameters", () => {
  it("reads sparse models from the name or the override table", () => {
    const byName = (name: string) =>
      registry.models.find((model) => model.model_name === name);

    const sparse = byName("Qwen3-30B-A3B");
    const override = byName("gpt-oss-20b");
    const dense = byName("Qwen3-8B");

    assert.ok(sparse && override && dense);
    assert.equal(sparse.active_params_b, 3);
    assert.equal(override.active_params_b, 3.6);
    assert.equal(dense.active_params_b, dense.params_b);
  });

  it("keeps every active count positive and within the total", () => {
    for (const model of registry.models) {
      assert.ok(model.active_params_b > 0, model.model_name);
      assert.ok(
        model.active_params_b <= model.params_b + 0.01,
        `${model.model_name}: ${model.active_params_b} of ${model.params_b}`,
      );
    }
  });
});
