import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  availableCaps,
  beyondModels,
  isTight,
  matchesFilter,
  rankByTradeoff,
  runCmd,
  shortfall,
  sortModels,
  type MergedModel,
} from "./models";

function makeModel(overrides: Partial<MergedModel> = {}): MergedModel {
  const base: MergedModel = {
    family_label: "Test",
    id: "test-8b-q4",
    model_name: "Test-8B",
    huggingface_id: "org/Test-8B-GGUF",
    quantization: "Q4_K_M",
    family: "Dense",
    parameters: "8B",
    params_b: 8,
    default_context_size: 32768,
    max_context_size: 32768,
    vram_requirements_gb: 4,
    capabilities: [],
    file_name: "test-8b-q4.gguf",
    description: "a test model",
    ollama_tag: "",
    blurb: "",
  };

  return { ...base, ...overrides };
}

describe("rankByTradeoff", () => {
  const small = makeModel({
    id: "small",
    model_name: "Small-4B",
    params_b: 4,
    vram_requirements_gb: 2,
  });
  const big = makeModel({
    id: "big",
    model_name: "Big-70B",
    params_b: 70,
    vram_requirements_gb: 35,
  });

  it("keeps the largest first at maximum performance", () => {
    assert.deepEqual(
      rankByTradeoff([big, small], 1).map((model) => model.id),
      ["big", "small"],
    );
  });

  it("floats the smaller model at maximum resource-lean", () => {
    assert.deepEqual(
      rankByTradeoff([big, small], 0).map((model) => model.id),
      ["small", "big"],
    );
  });

  it("clamps out-of-range bias values", () => {
    assert.deepEqual(
      rankByTradeoff([big, small], 2).map((model) => model.id),
      ["big", "small"],
    );
    assert.deepEqual(
      rankByTradeoff([big, small], -1).map((model) => model.id),
      ["small", "big"],
    );
  });

  it("returns a copy for a single model", () => {
    const source = [big];
    const ranked = rankByTradeoff(source, 0.5);

    assert.notEqual(ranked, source);
    assert.deepEqual(
      ranked.map((model) => model.id),
      ["big"],
    );
  });
});

describe("matchesFilter", () => {
  const model = makeModel({
    model_name: "Qwen3-8B",
    description: "a reasoning model",
    parameters: "8B",
    capabilities: ["reasoning", "code"],
  });

  it("matches an empty query with no capabilities", () => {
    assert.equal(matchesFilter(model, "", []), true);
    assert.equal(matchesFilter(model, "   ", []), true);
  });

  it("matches name, description, parameters, and capabilities", () => {
    assert.equal(matchesFilter(model, "qwen", []), true);
    assert.equal(matchesFilter(model, "REASONING", []), true);
    assert.equal(matchesFilter(model, "8b", []), true);
    assert.equal(matchesFilter(model, "code", []), true);
  });

  it("requires every selected capability", () => {
    assert.equal(matchesFilter(model, "", ["reasoning"]), true);
    assert.equal(matchesFilter(model, "", ["reasoning", "code"]), true);
    assert.equal(matchesFilter(model, "", ["reasoning", "vision"]), false);
  });

  it("rejects a query that matches nothing", () => {
    assert.equal(matchesFilter(model, "missing", []), false);
  });
});

describe("sortModels", () => {
  const small = makeModel({
    id: "small",
    model_name: "Alpha",
    params_b: 4,
    vram_requirements_gb: 2,
  });
  const large = makeModel({
    id: "large",
    model_name: "Zulu",
    params_b: 70,
    vram_requirements_gb: 35,
  });
  const mid = makeModel({
    id: "mid",
    model_name: "Mike",
    params_b: 8,
    vram_requirements_gb: 4,
  });

  it("sorts by size, name, and leaves the input alone", () => {
    const source = [small, large, mid];

    assert.deepEqual(
      sortModels(source, "size-desc").map((model) => model.id),
      ["large", "mid", "small"],
    );
    assert.deepEqual(
      sortModels(source, "size-asc").map((model) => model.id),
      ["small", "mid", "large"],
    );
    assert.deepEqual(
      sortModels(source, "name").map((model) => model.id),
      ["small", "mid", "large"],
    );
    assert.deepEqual(
      source.map((model) => model.id),
      ["small", "large", "mid"],
    );
  });
});

describe("isTight", () => {
  it("flags models above 85 percent of the budget", () => {
    assert.equal(isTight(makeModel({ vram_requirements_gb: 3.41 }), 4), true);
    assert.equal(isTight(makeModel({ vram_requirements_gb: 3.4 }), 4), false);
    assert.equal(isTight(makeModel({ vram_requirements_gb: 3 }), 4), false);
    assert.equal(isTight(makeModel({ vram_requirements_gb: 5 }), 4), false);
  });
});

describe("runCmd", () => {
  it("uses the Hugging Face repo and quantization for LM Studio", () => {
    const model = makeModel({
      huggingface_id: "org/Test-8B-GGUF",
      quantization: "Q4_K_M",
    });

    assert.equal(
      runCmd(model, "lmstudio"),
      "lms get https://huggingface.co/org/Test-8B-GGUF@q4_k_m",
    );
  });

  it("uses the Ollama tag when present and falls back to a slug", () => {
    assert.equal(
      runCmd(makeModel({ ollama_tag: "test:8b" }), "ollama"),
      "ollama run test:8b",
    );
    assert.equal(
      runCmd(makeModel({ ollama_tag: "" }), "ollama"),
      "ollama run test-8b",
    );
  });
});

describe("availableCaps", () => {
  it("returns unique capabilities in alphabetical order", () => {
    const caps = availableCaps([
      makeModel({ capabilities: ["reasoning", "vision"] }),
      makeModel({ capabilities: ["vision", "code"] }),
    ]);

    assert.deepEqual(caps, ["code", "reasoning", "vision"]);
  });
});

describe("shortfall", () => {
  it("returns the missing memory and zero for fits", () => {
    assert.equal(shortfall(makeModel({ vram_requirements_gb: 10 }), 8), 2);
    assert.equal(shortfall(makeModel({ vram_requirements_gb: 8 }), 8), 0);
    assert.equal(shortfall(makeModel({ vram_requirements_gb: 2 }), 8), 0);
    assert.equal(shortfall(makeModel({ vram_requirements_gb: 27.5 }), 8), 19.5);
  });
});

describe("beyondModels", () => {
  const fits = makeModel({
    id: "fits",
    model_name: "Fits",
    vram_requirements_gb: 8,
  });
  const justOver = makeModel({
    id: "just",
    model_name: "Bravo",
    vram_requirements_gb: 16,
  });
  const tied = makeModel({
    id: "tied",
    model_name: "Alpha",
    vram_requirements_gb: 16,
  });
  const far = makeModel({
    id: "far",
    model_name: "Far",
    vram_requirements_gb: 35,
  });

  it("excludes fits and orders by the smallest gap", () => {
    assert.deepEqual(
      beyondModels([far, fits, justOver, tied], 8).map((model) => model.id),
      ["tied", "just", "far"],
    );
  });

  it("breaks ties by name and leaves the input alone", () => {
    const source = [far, fits, justOver, tied];

    beyondModels(source, 8);

    assert.deepEqual(
      source.map((model) => model.id),
      ["far", "fits", "just", "tied"],
    );
  });

  it("returns an empty list when everything fits", () => {
    assert.deepEqual(beyondModels([fits], 8), []);
  });

  it("returns every model when nothing fits", () => {
    assert.deepEqual(
      beyondModels([far, justOver, fits], 1).map((model) => model.id),
      ["fits", "just", "far"],
    );
  });
});
