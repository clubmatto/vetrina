/* suggestModelsForVRAM — inlined from @auxot/model-registry (ESBuild can't
   bundle its loader.js which imports node:fs et al for browser targets). */
function suggestModelsForVRAM(registry, vramGb, parallelism = 1) {
  const budget = vramGb / parallelism;
  const fitting = registry.models.filter((m) => m.vram_requirements_gb <= budget);
  return fitting.sort((a, b) => {
    const pa = parseParamCount(a.parameters);
    const pb = parseParamCount(b.parameters);
    if (pa !== pb) return pb - pa;
    return b.vram_requirements_gb - a.vram_requirements_gb;
  });
}

function parseParamCount(s) {
  const m = s.match(/^(\d+(?:\.\d+)?)([BMK])?$/i);
  if (!m) return 0;
  const v = parseFloat(m[1]);
  const u = (m[2] || "B").toUpperCase();
  return u === "B" ? v * 1e9 : u === "M" ? v * 1e6 : u === "K" ? v * 1e3 : v;
}

const GPU_DATABASE = [
  ["RTX 4090", 24],
  ["RTX 4080 SUPER", 16],
  ["RTX 4080", 16],
  ["RTX 4070 Ti SUPER", 16],
  ["RTX 4070 Ti", 12],
  ["RTX 4070 SUPER", 12],
  ["RTX 4070", 12],
  ["RTX 4060 Ti", 8],
  ["RTX 4060", 8],
  ["RTX 3090 Ti", 24],
  ["RTX 3090", 24],
  ["RTX 3080 Ti", 12],
  ["RTX 3080", 10],
  ["RTX 3070 Ti", 8],
  ["RTX 3070", 8],
  ["RTX 3060 Ti", 8],
  ["RTX 3060", 12],
  ["RTX 2080 Ti", 11],
  ["RTX 2080", 8],
  ["RTX 2070", 8],
  ["RTX 2060", 6],
  ["GTX 1660", 6],
  ["GTX 1080 Ti", 11],
  ["GTX 1080", 8],
  ["GTX 1070", 8],
  ["GTX 1060", 6],
  ["RTX 5090", 32],
  ["RTX 5080", 16],
  ["RTX 5070 Ti", 16],
  ["RTX 5070", 12],
  ["RTX 5060 Ti", 16],
  ["RTX 5060", 8],
  ["RX 7900 XTX", 24],
  ["RX 7900 XT", 20],
  ["RX 7900 GRE", 16],
  ["RX 7800 XT", 16],
  ["RX 7700 XT", 12],
  ["RX 7600", 8],
  ["RX 9070 XT", 16],
  ["RX 9070", 16],
  ["RX 6900 XT", 16],
  ["RX 6800 XT", 16],
  ["RX 6800", 16],
  ["RX 6700 XT", 12],
  ["RX 6600", 8],
  ["Arc B580", 12],
  ["Arc B570", 10],
  ["Arc A770", 16],
  ["Arc A750", 8],
  ["Arc A580", 8],
];

const VRAM_TIERS = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80];

const state = {
  gpuName: null,
  vendor: "unknown",
  vram: 4,
  vramConfidence: "low",
  vramSource: "wild guess",
  ram: 16,
  ramKnown: false,
  ramCapped: false,
  cores: null,
  os: "unknown",
  webgpu: false,
  runner: "lmstudio",
  filter: { q: "", caps: new Set(), sort: "size-desc" },
};

try {
  const savedRunner = localStorage.getItem("runner");
  if (savedRunner === "ollama" || savedRunner === "lmstudio") {
    state.runner = savedRunner;
  }
} catch {
  /* localStorage unavailable (e.g. file://) — keep default */
}

let modelRegistry = null;

function detectGPU() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") || canvas.getContext("webgl");
    if (!gl) return null;
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    if (!debugInfo) return null;
    return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  } catch {
    return null;
  }
}

function detectVendor(gpuName) {
  const name = gpuName.toLowerCase();
  if (name.includes("apple")) return "apple";
  if (/nvidia|geforce|\brtx\b|\bgtx\b/.test(name)) return "nvidia";
  if (/amd|radeon|\brx \d/.test(name)) return "amd";
  if (/intel|arc|iris|uhd/.test(name)) return "intel";
  return "unknown";
}

function lookupGPU(gpuName) {
  const entries = [...GPU_DATABASE].sort((a, b) => b[0].length - a[0].length);
  for (const [key, vram] of entries) {
    if (gpuName.includes(key)) return { key, vram };
  }
  return null;
}

function nearestTier(value) {
  let tier = VRAM_TIERS[0];
  for (const t of VRAM_TIERS) {
    if (t <= value) tier = t;
  }
  return tier;
}

function detectOS(userAgent) {
  if (/android/i.test(userAgent)) return "android";
  if (/iphone|ipad|ipod/i.test(userAgent)) return "ios";
  if (/windows/i.test(userAgent)) return "windows";
  if (/mac os|macintosh/i.test(userAgent)) return "macos";
  if (/cros/i.test(userAgent)) return "chromeos";
  if (/linux/i.test(userAgent)) return "linux";
  return "unknown";
}

function isMobileUA(userAgent) {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

function runDetection() {
  const ua = navigator.userAgent;
  state.gpuName = detectGPU();
  state.vendor = state.gpuName ? detectVendor(state.gpuName) : "unknown";
  state.os = detectOS(ua);
  state.cores = navigator.hardwareConcurrency || null;
  state.webgpu = "gpu" in navigator;

  if (typeof navigator.deviceMemory === "number") {
    state.ram = navigator.deviceMemory;
    state.ramKnown = true;
    state.ramCapped = navigator.deviceMemory === 8;
  }

  estimateVRAM();
}

function estimateVRAM() {
  if (state.vendor === "apple") {
    state.vram = Math.round(state.ram * 0.7);
    state.vramConfidence = state.ramKnown && !state.ramCapped ? "medium" : "low";
    state.vramSource = "unified memory (~70% of ram)";
    return;
  }

  if (state.gpuName) {
    const hit = lookupGPU(state.gpuName);
    if (hit) {
      state.vram = hit.vram;
      state.vramConfidence = "high";
      state.vramSource = "known gpu";
      return;
    }
  }

  if (state.ramKnown) {
    state.vram = nearestTier(Math.max(2, state.ram * 0.5));
    state.vramConfidence = "low";
    state.vramSource =
      state.vendor === "intel" ? "shared memory guess" : "guess from ram";
    return;
  }

  state.vram = 4;
  state.vramConfidence = "low";
  state.vramSource = "wild guess — adjust below";
}

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function terminalLines() {
  const lines = [
    { prompt: true, text: "probing hardware…" },
    gpuLine(),
    ramLine(),
    { label: "cpu", value: state.cores ? `${state.cores} cores` : "unknown", comment: null },
    { label: "os", value: state.os, comment: null },
    { label: "webgpu", value: state.webgpu ? "yes" : "no", comment: null },
    { prompt: true, text: "estimating graphics memory…" },
    {
      label: "vram",
      value: `~${state.vram} GB`,
      comment: `${state.vramSource} · confidence: ${state.vramConfidence}`,
    },
    {
      prompt: true,
      text: `checking ${modelRegistry ? modelRegistry.models.length : 0} models…`,
    },
    { prompt: true, text: "done — your models are ready ↓" },
  ];
  if (isMobileUA(navigator.userAgent)) {
    lines.splice(-1, 0, {
      label: null,
      value: null,
      comment: "note: this is a phone — recommendations shine on desktops",
    });
  }
  return lines;
}

function gpuLine() {
  if (!state.gpuName) {
    return { label: "gpu", value: "unknown", comment: "blocked by this browser" };
  }
  const match = state.gpuName.match(
    /(apple m\d[^,)]*|nvidia geforce [^,)]*|amd radeon [^,)]*|intel[^,)]*)/i,
  );
  return { label: "gpu", value: match ? match[1] : state.gpuName, comment: null };
}

function ramLine() {
  if (!state.ramKnown) {
    return { label: "ram", value: "unknown", comment: "this browser won't say — set it below" };
  }
  return { label: "ram", value: state.ramCapped ? `≥${state.ram} GB` : `${state.ram} GB`, comment: "browser estimate" };
}

function renderTerminal(onDone) {
  const body = document.getElementById("terminal-body");
  const lines = terminalLines();
  const cursor = document.createElement("span");
  cursor.className = "terminal-cursor";

  const showLine = (index) => {
    if (index >= lines.length) {
      onDone();
      return;
    }
    const line = lines[index];
    const el = document.createElement("span");
    el.className = "terminal-line";

    if (line.prompt) {
      const prompt = document.createElement("span");
      prompt.className = "prompt";
      prompt.textContent = "❯ ";
      el.appendChild(prompt);
      el.appendChild(document.createTextNode(line.text));
    } else {
      if (line.label) {
        el.appendChild(document.createTextNode(`  ${line.label}: `));
        const value = document.createElement("span");
        value.className = "value";
        value.textContent = line.value;
        el.appendChild(value);
      }
      if (line.comment) {
        const comment = document.createElement("span");
        comment.className = "comment";
        comment.textContent = line.label ? `  # ${line.comment}` : `  # ${line.comment}`;
        el.appendChild(comment);
      }
    }

    body.appendChild(el);
    el.appendChild(cursor);

    setTimeout(() => showLine(index + 1), reducedMotion ? 0 : 120);
  };

  showLine(0);
}

function badge(confidence) {
  return `<span class="badge badge-${confidence}">${confidence}</span>`;
}

const ICONS = {
  gpu: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="6" width="12" height="12" rx="2"/><rect x="9" y="9" width="6" height="6" rx="1"/><path d="M6 10H4"/><path d="M6 14H4"/><path d="M20 10H18"/><path d="M20 14H18"/><path d="M10 6V4"/><path d="M14 6V4"/><path d="M10 20V18"/><path d="M14 20V18"/></svg>',
  vram: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="10" rx="1.5"/><rect x="7" y="10" width="3" height="3" rx="0.5"/><rect x="14" y="10" width="3" height="3" rx="0.5"/><path d="M10 10V16"/><path d="M14 10V16"/><path d="M4 14H20"/></svg>',
  ram: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="8" width="16" height="10" rx="1.5"/><rect x="7" y="10" width="3" height="3" rx="0.5"/><rect x="14" y="10" width="3" height="3" rx="0.5"/><path d="M10 10V16"/><path d="M14 10V16"/><path d="M4 14H20"/></svg>',
  cpu: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="7" y="7" width="10" height="10" rx="1.5"/><circle cx="12" cy="12" r="3"/><path d="M7 10H4"/><path d="M7 14H4"/><path d="M20 10H17"/><path d="M20 14H17"/><path d="M10 7V4"/><path d="M14 7V4"/><path d="M10 20V17"/><path d="M14 20V17"/></svg>',
  os: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M8 22H16"/><path d="M12 18V22"/><path d="M6 9L8.5 11L6 13"/></svg>',
  webgpu: '<svg class="spec-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13,2 4,14 12,14 11,22 20,10 12,10"/></svg>',
};

function renderSpecs() {
  const dials = document.getElementById("dials");
  const readouts = document.getElementById("readouts");
  const ramConfidence = state.ramKnown ? (state.ramCapped ? "low" : "high") : "low";
  const ramNote = state.ramKnown
    ? state.ramCapped
      ? "browsers cap reported ram at 8 GB — adjust if yours is higher"
      : ""
    : "not reported — set it yourself";

  dials.innerHTML = `
    <div class="dial">
      <div class="dial-head">
        ${ICONS.vram}
        <span class="dial-label">vram</span>
        ${badge(state.vramConfidence)}
      </div>
      <div class="stepper" data-field="vram">
        <button type="button" data-step="-1" aria-label="decrease vram">−</button>
        <span class="stepper-value" id="vram-value">${state.vram} GB</span>
        <button type="button" data-step="1" aria-label="increase vram">+</button>
      </div>
      <div class="dial-note">${escapeHTML(state.vramSource)}</div>
    </div>
    <div class="dial">
      <div class="dial-head">
        ${ICONS.ram}
        <span class="dial-label">ram</span>
        ${badge(ramConfidence)}
      </div>
      <div class="stepper" data-field="ram">
        <button type="button" data-step="-2" aria-label="decrease ram">−</button>
        <span class="stepper-value" id="ram-value">${state.ram} GB</span>
        <button type="button" data-step="2" aria-label="increase ram">+</button>
      </div>
      <div class="dial-note">${ramNote}</div>
    </div>
  `;

  readouts.innerHTML = `
    <div class="readout">
      <dt>${ICONS.gpu}<span>gpu</span></dt>
      <dd class="readout-value">${escapeHTML(gpuLine().value)}</dd>
      <dd class="readout-src">${state.gpuName ? "via webgl" : "not available"}</dd>
    </div>
    <div class="readout">
      <dt>${ICONS.cpu}<span>cpu</span></dt>
      <dd class="readout-value">${state.cores ? `${state.cores} cores` : "unknown"}</dd>
      <dd class="readout-src">${state.cores ? "via hardwareConcurrency" : ""}</dd>
    </div>
    <div class="readout">
      <dt>${ICONS.os}<span>os</span></dt>
      <dd class="readout-value">${escapeHTML(state.os)}</dd>
      <dd class="readout-src">via user agent</dd>
    </div>
    <div class="readout">
      <dt>${ICONS.webgpu}<span>webgpu</span></dt>
      <dd class="readout-value">${
        state.webgpu
          ? '<span class="spec-status-ok">✓</span> supported'
          : '<span class="spec-status-ko">✗</span> not available'
      }</dd>
      <dd class="readout-src">via navigator.gpu</dd>
    </div>
  `;

  dials.querySelectorAll(".stepper button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const field = btn.closest(".stepper").dataset.field;
      const step = Number(btn.dataset.step);
      adjust(field, step);
    });
  });
}

function adjust(field, step) {
  if (field === "vram") {
    state.vram = clamp(state.vram + step, 1, 128);
    document.getElementById("vram-value").textContent = `${state.vram} GB`;
  } else if (field === "ram") {
    state.ram = clamp(state.ram + step, 2, 256);
    state.ramKnown = true;
    document.getElementById("ram-value").textContent = `${state.ram} GB`;
    if (state.vendor === "apple") {
      state.vram = Math.round(state.ram * 0.7);
      document.getElementById("vram-value").textContent = `${state.vram} GB`;
    }
  }
  renderModels();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function escapeHTML(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function fits(model) {
  return model.vram_requirements_gb <= state.vram;
}

function isTight(model) {
  return fits(model) && model.vram_requirements_gb > state.vram * 0.85;
}

function chipHTML(model) {
  const chips = [
    `<span class="chip">${escapeHTML(model.parameters)}</span>`,
    `<span class="chip">~${model.vram_requirements_gb} GB Q4</span>`,
    ...model.capabilities.map((f) => `<span class="chip">${escapeHTML(f)}</span>`),
  ];
  if (isTight(model)) chips.push('<span class="chip chip-tight">tight fit</span>');
  return chips.join("");
}

/* Family grouping derived from model names for now — later replaced by
   enriched registry data. Longest prefixes first. */
const FAMILY_TABLE = [
  ["gpt-oss", "gpt-oss"],
  ["deepseek", "DeepSeek"],
  ["ministral", "Ministral"],
  ["minimax", "MiniMax"],
  ["qwen", "Qwen"],
  ["gemma", "Gemma"],
  ["llama", "Llama"],
  ["kimi", "Kimi"],
  ["flux", "FLUX"],
  ["granite", "Granite"],
];

function deriveFamily(name) {
  const lower = name.toLowerCase();
  for (const [prefix, label] of FAMILY_TABLE) {
    if (lower.startsWith(prefix)) return label;
  }
  const m = lower.match(/^[a-z0-9]+/);
  const raw = m ? m[0] : name;
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function runCmdHTML(model) {
  const cmd =
    state.runner === "lmstudio"
      ? `lms get ${model.huggingface_id}@${model.quantization.toLowerCase()}`
      : `ollama run ${
          model.ollama_tag || model.model_name.toLowerCase().replace(/\s+/g, "-")
        }`;
  const esc = escapeHTML(cmd);
  return `
    <button type="button" class="run-cmd" data-cmd="${esc}" aria-label="copy command: ${esc}">
      <code>${esc}</code>
      <span class="run-cmd-hint">copy</span>
    </button>
  `;
}

function modelCardHTML(model) {
  return `
    <article class="model-card${isTight(model) ? " tight" : ""}">
      <div class="model-name">${escapeHTML(model.model_name)}</div>
      <div class="model-meta">${chipHTML(model)}</div>
      <p class="model-blurb">${escapeHTML(model.blurb || model.description || "")}</p>
      ${runCmdHTML(model)}
    </article>
  `;
}

function matchesFilter(model) {
  const { q, caps } = state.filter;
  if (caps.size && ![...caps].every((c) => model.capabilities.includes(c))) {
    return false;
  }
  if (!q) return true;
  const haystack =
    `${model.model_name} ${model.blurb} ${model.description} ` +
    `${model.parameters} ${model.capabilities.join(" ")}`;
  return haystack.toLowerCase().includes(q);
}

function sortModels(models) {
  const sorted = [...models];
  if (state.filter.sort === "size-asc") {
    sorted.sort(
      (a, b) =>
        a.params_b - b.params_b ||
        a.vram_requirements_gb - b.vram_requirements_gb,
    );
  } else if (state.filter.sort === "name") {
    sorted.sort((a, b) => a.model_name.localeCompare(b.model_name));
  } else {
    sorted.sort(
      (a, b) =>
        b.params_b - a.params_b ||
        b.vram_requirements_gb - a.vram_requirements_gb,
    );
  }
  return sorted;
}

function renderModels() {
  const fitting = suggestModelsForVRAM(modelRegistry, state.vram);
  const tooBig = modelRegistry.models.filter((m) => !fits(m));

  const best = fitting[0] || null;
  const bestEl = document.getElementById("best-pick");

  if (best) {
    bestEl.innerHTML = `
      <div class="best-pick-card">
        <div class="best-pick-inner">
          <div class="best-pick-kicker">your best pick</div>
          <div class="best-pick-name">${escapeHTML(best.model_name)}</div>
          <div class="best-pick-why">
            the largest model that fits in your ~${state.vram} GB —
            needs about ${best.vram_requirements_gb} GB at Q4.
          </div>
          <div class="model-meta" style="margin-top: 0.75rem">${chipHTML(best)}</div>
          ${runCmdHTML(best)}
        </div>
      </div>
    `;
  } else {
    bestEl.innerHTML = `
      <div class="best-pick-card">
        <div class="best-pick-inner">
          <div class="best-pick-kicker">ouch</div>
          <div class="best-pick-name">nothing fits in ${state.vram} GB</div>
          <div class="best-pick-why">
            even the tiniest model here wants ~2 GB. double-check your numbers above?
          </div>
        </div>
      </div>
    `;
  }

  const alsoRuns = fitting.slice(1);
  const toolbar = document.getElementById("models-toolbar");
  const chipsEl = document.getElementById("filter-chips");
  const alsoEl = document.getElementById("also-runs");

  toolbar.hidden = alsoRuns.length < 6;

  // capability chips reflect what's actually in the list; drop stale selections
  const presentCaps = new Set(alsoRuns.flatMap((m) => m.capabilities));
  state.filter.caps.forEach((c) => {
    if (!presentCaps.has(c)) state.filter.caps.delete(c);
  });
  chipsEl.innerHTML = [...presentCaps]
    .sort()
    .map(
      (c) => `
      <button type="button" class="filter-chip${state.filter.caps.has(c) ? " active" : ""}"
        data-cap="${escapeHTML(c)}" aria-pressed="${state.filter.caps.has(c)}">${escapeHTML(c)}</button>`,
    )
    .join("");
  chipsEl.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const c = chip.dataset.cap;
      if (state.filter.caps.has(c)) state.filter.caps.delete(c);
      else state.filter.caps.add(c);
      renderModels();
    });
  });

  const visible = sortModels(alsoRuns.filter(matchesFilter));

  if (!alsoRuns.length) {
    alsoEl.innerHTML =
      '<p class="hint">nothing smaller on the list — your pick above is the sweet spot.</p>';
  } else if (!visible.length) {
    alsoEl.innerHTML =
      '<p class="hint">nothing matches — try clearing the search or filters.</p>';
  } else if (alsoRuns.length < 6) {
    alsoEl.innerHTML = `<div class="model-grid">${visible.map(modelCardHTML).join("")}</div>`;
  } else {
    const groups = new Map();
    for (const m of visible) {
      const fam = deriveFamily(m.model_name);
      if (!groups.has(fam)) groups.set(fam, []);
      groups.get(fam).push(m);
    }
    // largest member first, mirroring the old size-desc flat list
    const ordered = [...groups.entries()].sort(
      (a, b) =>
        Math.max(...b[1].map((m) => m.vram_requirements_gb)) -
        Math.max(...a[1].map((m) => m.vram_requirements_gb)),
    );
    alsoEl.innerHTML = ordered
      .map(
        ([fam, models]) => `
        <section class="family-group">
          <h4 class="family-heading">
            ${escapeHTML(fam)}
            <span class="family-count">${models.length}</span>
          </h4>
          <div class="model-grid">${models.map(modelCardHTML).join("")}</div>
        </section>`,
      )
      .join("");
  }

  document.getElementById("too-big-grid").innerHTML = tooBig
    .sort((a, b) => a.vram_requirements_gb - b.vram_requirements_gb)
    .map(modelCardHTML)
    .join("");

  document.getElementById("too-big").hidden = tooBig.length === 0;

  document.querySelectorAll(".run-cmd").forEach((btn) => {
    btn.addEventListener("click", () => copyCommand(btn));
  });
}

async function copyCommand(btn) {
  const hint = btn.querySelector(".run-cmd-hint");
  try {
    await navigator.clipboard.writeText(btn.dataset.cmd);
    btn.classList.add("copied");
    hint.textContent = "copied!";
    setTimeout(() => {
      btn.classList.remove("copied");
      hint.textContent = "copy";
    }, 1500);
  } catch {
    hint.textContent = "select + copy";
    setTimeout(() => {
      hint.textContent = "copy";
    }, 1500);
  }
}

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  btn.addEventListener("click", () => {
    const current = getComputedStyle(document.documentElement).colorScheme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.style.setProperty("color-scheme", next);
    document.documentElement.setAttribute("data-color-scheme", next);
    localStorage.setItem("theme", next);
  });
}

const RUNNER_HINTS = {
  lmstudio:
    "sizes assume Q4 quantization. commands use lm studio's lms cli — " +
    "enable it in lm studio under settings → developer.",
  ollama:
    "sizes assume Q4 quantization. commands need ollama — get it at ollama.com.",
};

function setupRunnerToggle() {
  const toggle = document.getElementById("runner-toggle");
  const hint = document.getElementById("runner-hint");

  const sync = () => {
    toggle.querySelectorAll("button").forEach((b) => {
      b.setAttribute("aria-pressed", String(b.dataset.runner === state.runner));
    });
    hint.textContent = RUNNER_HINTS[state.runner];
  };

  toggle.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-runner]");
    if (!btn || btn.dataset.runner === state.runner) return;
    state.runner = btn.dataset.runner;
    try {
      localStorage.setItem("runner", state.runner);
    } catch {
      /* localStorage unavailable — session-only toggle */
    }
    sync();
    renderModels();
  });

  sync();
}

function setupModelsToolbar() {
  const search = document.getElementById("model-search");
  const sort = document.getElementById("model-sort");
  search.addEventListener("input", () => {
    state.filter.q = search.value.trim().toLowerCase();
    renderModels();
  });
  sort.addEventListener("change", () => {
    state.filter.sort = sort.value;
    renderModels();
  });
}

function revealResults() {
  for (const id of ["specs", "models"]) {
    const el = document.getElementById(id);
    el.hidden = false;
    el.classList.add("revealed");
  }
  document
    .getElementById("specs")
    .scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "nearest" });
}

const dataEl = document.getElementById("model-data");
if (dataEl) {
  try {
    modelRegistry = JSON.parse(dataEl.textContent);
  } catch {
    modelRegistry = { version: "0.0.0", generated_at: "", models: [] };
  }
}

runDetection();
setupThemeToggle();
setupRunnerToggle();
setupModelsToolbar();
renderSpecs();
renderModels();
renderTerminal(revealResults);
