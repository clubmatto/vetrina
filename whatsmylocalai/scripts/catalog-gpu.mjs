/**
 * Regenerates `src/_data/gpu_speed.json` from the GPU Ark dataset.
 *
 * Run by the weekly catalog workflow, never at build time, so the site stays
 * static and offline. The output is committed: the job refreshes it exactly
 * like the models.dev and registry packages.
 *
 * Source: https://huggingface.co/datasets/Intelion/gpuark-gpu-dataset
 * License: CC BY 4.0. Attribution lives on the credits page.
 */

import fs from "node:fs";
import path from "node:path";

const SOURCE =
  "https://huggingface.co/datasets/Intelion/gpuark-gpu-dataset/resolve/main/gpuark-gpu-specs.csv";
const GPU_DB = path.join(process.cwd(), "src/_data/gpu_database.json");
const OVERRIDES = path.join(process.cwd(), "scripts/gpu-speed-overrides.json");
const OUTPUT = path.join(process.cwd(), "src/_data/gpu_speed.json");

/** Laptop and handheld rows share names with desktop cards but not bandwidth. */
const MOBILE = /mobile|laptop|max-q|notebook|\dM$/i;

/** Spot checks catch an upstream shape change before it reaches the page. */
const SPOT_CHECKS = [
  ["RTX 4090", 990, 1030],
  ["RTX 3090", 920, 950],
  ["RTX 3060", 350, 370],
  ["RTX 5090", 1750, 1810],
  ["RX 7800 XT", 610, 640],
  ["GTX 1080 Ti", 470, 500],
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body.map((cells) =>
    Object.fromEntries(header.map((key, index) => [key, cells[index] ?? ""])),
  );
}

/** Strip vendor and brand words so "Intel Arc A770" and "Arc A770" agree. */
function modelKey(name) {
  return name
    .replace(/\s+Founders Edition( Rev\.? \d+)?$/i, "")
    .replace(/\s+\d+\s*GB$/i, "")
    .replace(/\b(nvidia|geforce|amd|radeon|intel|arc)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function bandwidthGbS(value) {
  const match = /^([\d.]+)\s*(GB|TB)\/s$/i.exec((value ?? "").trim());
  if (!match) return null;
  const amount = Number(match[1]);
  const gb = match[2].toUpperCase() === "TB" ? amount * 1000 : amount;
  return Math.round(gb * 10) / 10;
}

function ramGb(value) {
  const amount = Number.parseFloat((value ?? "").trim());
  return Number.isFinite(amount) ? Math.round(amount) : null;
}

async function fetchDataset() {
  const response = await fetch(SOURCE, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) {
    throw new Error(
      `GPU Ark returned ${response.status} ${response.statusText}`,
    );
  }
  return parseCsv(await response.text());
}

/** Most common bandwidth for a model and memory size, across every board row. */
function buildIndex(rows) {
  const index = new Map();

  for (const row of rows) {
    if (MOBILE.test(row.name)) continue;
    const bandwidth = bandwidthGbS(row.ram_bandwidth);
    const ram = ramGb(row.ram);
    if (bandwidth === null || ram === null) continue;

    const key = `${modelKey(row.name)}|${ram}`;
    const counts = index.get(key) ?? new Map();
    counts.set(bandwidth, (counts.get(bandwidth) ?? 0) + 1);
    index.set(key, counts);
  }

  return index;
}

function pickBandwidth(index, name, vram) {
  const counts = index.get(`${modelKey(name)}|${Math.round(vram)}`);
  if (!counts) return null;
  let best = null;
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function readOverrides() {
  if (!fs.existsSync(OVERRIDES)) return {};
  return JSON.parse(fs.readFileSync(OVERRIDES, "utf8"));
}

function main() {
  return fetchDataset().then((rows) => {
    const index = buildIndex(rows);
    const overrides = readOverrides();
    const database = JSON.parse(fs.readFileSync(GPU_DB, "utf8"));
    const bandwidth = {};
    const missing = [];

    for (const [name, vram] of database) {
      const value = overrides[name] ?? pickBandwidth(index, name, vram);
      if (value === null || value === undefined) {
        missing.push(`${name} (${vram} GB)`);
        continue;
      }
      bandwidth[name] = value;
    }

    if (missing.length) {
      console.error("No bandwidth found for:");
      for (const entry of missing) console.error(`  - ${entry}`);
      console.error(
        "Add an override in scripts/gpu-speed-overrides.json or drop the GPU.",
      );
      process.exitCode = 1;
      return;
    }

    for (const [name, low, high] of SPOT_CHECKS) {
      const value = bandwidth[name];
      if (value === undefined) {
        console.error(`Spot check failed: ${name} is missing`);
        process.exitCode = 1;
        return;
      }
      if (value < low || value > high) {
        console.error(
          `Spot check failed: ${name} is ${value} GB/s, expected ${low}-${high}`,
        );
        process.exitCode = 1;
        return;
      }
    }

    const output = {
      source:
        "GPU Ark (https://huggingface.co/datasets/Intelion/gpuark-gpu-dataset)",
      license: "CC BY 4.0",
      bandwidth_gbs: bandwidth,
    };

    fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
    console.log(
      `Wrote ${Object.keys(bandwidth).length} GPUs to src/_data/gpu_speed.json`,
    );
    if (Object.keys(overrides).length) {
      console.log(`Applied overrides: ${Object.keys(overrides).join(", ")}`);
    }
  });
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
