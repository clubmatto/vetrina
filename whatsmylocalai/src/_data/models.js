import { createRequire } from "module";

const require = createRequire(import.meta.url);

const snapshot = require("@opencode-ai/models/snapshot");
const registry = require("@auxot/model-registry/registry.json");
const enrichment = require("./enrichment.json");

function normalize(s) {
  return s.toLowerCase().replace(/[\s-]/g, "");
}

function parseParams(s) {
  const m = s.match(/^(\d+(?:\.\d+)?)([BMK])?$/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = (m[2] || "B").toUpperCase();
  if (u === "B") return v;
  if (u === "M") return v / 1000;
  if (u === "K") return v / 1e6;
  return v;
}

function matchRegistryToModeldev(regEntry, mdMap) {
  const regName = normalize(regEntry.model_name);
  for (const [id, meta] of Object.entries(mdMap)) {
    if (normalize(meta.name) === regName) {
      return { id, meta };
    }
  }
  return null;
}

export default function () {
  const q4models = registry.models
    .filter((m) => m.quantization.startsWith("Q4"))
    .sort((a, b) => {
      const c = a.model_name.localeCompare(b.model_name);
      if (c !== 0) return c;
      return a.vram_requirements_gb - b.vram_requirements_gb;
    })
    .filter(
      (m, i, arr) =>
        i === 0 || m.model_name !== arr[i - 1].model_name,
    );

  const merged = q4models.map((m) => {
    const match = matchRegistryToModeldev(m, snapshot.models || {});
    const enrich = enrichment[m.model_name] || {};

    const caps = [...m.capabilities];
    if (match?.meta?.reasoning && !caps.includes("reasoning")) {
      caps.push("reasoning");
    }
    if (match?.meta?.tool_call && !caps.includes("tool_call")) {
      caps.push("tool_call");
    }

    return {
      id: m.id,
      model_name: m.model_name,
      huggingface_id: m.huggingface_id,
      quantization: m.quantization,
      family: m.family,
      parameters: m.parameters,
      params_b: parseParams(m.parameters),
      default_context_size: m.default_context_size,
      max_context_size: m.max_context_size,
      vram_requirements_gb: m.vram_requirements_gb,
      capabilities: caps,
      file_name: m.file_name,
      description: match?.meta?.description || "",
      ollama_tag: enrich.ollama_tag || "",
      blurb: enrich.blurb || "",
    };
  });

  merged.sort((a, b) => b.params_b - a.params_b);

  return {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    models: merged,
  };
}
