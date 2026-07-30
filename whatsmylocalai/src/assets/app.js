import { suggestModelsForVRAM } from "./query.js";

function detectGPU() {
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl2") || canvas.getContext("webgl");
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

function lookupGPU(gpuName, database) {
  const sorted = [...database].sort((a, b) => b[0].length - a[0].length);
  for (const [key, vram] of sorted) {
    if (gpuName.includes(key)) return { key, vram };
  }
  return null;
}

function nearestTier(value) {
  const tiers = [2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80];
  let tier = tiers[0];
  for (const t of tiers) {
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

document.addEventListener("alpine:init", () => {
  Alpine.data("app", () => ({
    gpuName: null,
    vendor: "unknown",
    vram: 4,
    vramSource: "wild guess",
    ram: 16,
    ramKnown: false,
    ramCapped: false,
    cores: null,
    os: "unknown",
    webgpu: false,
    runner: "lmstudio",
    copiedId: null,
    filterQ: "",
    filterCaps: [],
    filterSort: "size-desc",
    modelRegistry: null,
    gpuDatabase: [],
    phase: "probing",
    probeDone: { gpu: false, ram: false, cpu: false, os: false, webgpu: false, vram: false },
    reducedMotion: false,
    showEmailForm: false,
    emailSubmitted: false,
    bannerDismissed: false,

    toggleTheme() {
      var html = document.documentElement;
      var current = html.getAttribute("data-color-scheme") || "light";
      var next = current === "light" ? "dark" : "light";
      html.setAttribute("data-color-scheme", next);
      html.style.setProperty("color-scheme", next);
      try { localStorage.setItem("theme", next); } catch {}
    },

    init() {
      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      try {
        var dismissedAt = localStorage.getItem("banner-dismissed-at");
        if (dismissedAt) {
          this.bannerDismissed = Date.now() - parseInt(dismissedAt, 10) < 5 * 60 * 1000;
        }
      } catch {}

      const loadJSON = (id) => {
        const el = document.getElementById(id);
        if (!el) return null;
        try {
          return JSON.parse(el.textContent);
        } catch {
          return null;
        }
      };

      this.modelRegistry = loadJSON("model-data") || {
        version: "0.0.0", generated_at: "", models: [],
      };
      this.gpuDatabase = loadJSON("gpu-database") || [];

      try {
        const saved = localStorage.getItem("runner");
        if (saved === "ollama" || saved === "lmstudio") this.runner = saved;
      } catch {}

      this.runDetection();

      this.$watch("bannerDismissed", (val) => {
        try { localStorage.setItem("banner-dismissed-at", val ? String(Date.now()) : ""); } catch {}
      });

      this.renderTerminal();
    },

    runDetection() {
      const ua = navigator.userAgent;
      this.gpuName = detectGPU();
      this.vendor = this.gpuName ? detectVendor(this.gpuName) : "unknown";
      this.os = detectOS(ua);
      this.cores = navigator.hardwareConcurrency || null;
      this.webgpu = "gpu" in navigator;
      if (typeof navigator.deviceMemory === "number") {
        this.ram = navigator.deviceMemory;
        this.ramKnown = true;
        this.ramCapped = navigator.deviceMemory === 8;
      }
      this.estimateVRAM();
    },

    estimateVRAM() {
      if (this.vendor === "apple") {
        this.vram = Math.round(this.ram * 0.7);
        this.vramSource = "unified memory (~70% of RAM)";
        return;
      }
      if (this.gpuName) {
        const hit = lookupGPU(this.gpuName, this.gpuDatabase);
        if (hit) {
          this.vram = hit.vram;
          this.vramSource = "known GPU";
          return;
        }
      }
      if (this.ramKnown) {
        this.vram = nearestTier(Math.max(2, this.ram * 0.5));
        this.vramSource = this.vendor === "intel" ? "shared memory guess" : "guess from RAM";
        return;
      }
      this.vram = 4;
      this.vramSource = "wild guess \u2014 adjust below";
    },

    get ramNote() {
      if (!this.ramKnown) return "RAM not reported by your browser. Set it yourself or use a Chromium-based browser";
      if (this.ramCapped) return "browsers cap reported ram at 8 GB \u2014 adjust if yours is higher";
      return "";
    },

    get fittingModels() {
      if (!this.modelRegistry) return [];
      return suggestModelsForVRAM(this.modelRegistry, this.vram);
    },

    get bestModel() {
      return this.fittingModels[0] || null;
    },

    get alsoRuns() {
      return this.fittingModels.slice(1);
    },

    get tooBigModels() {
      if (!this.modelRegistry) return [];
      return this.modelRegistry.models
        .filter((m) => m.vram_requirements_gb > this.vram)
        .sort((a, b) => a.vram_requirements_gb - b.vram_requirements_gb);
    },

    get visibleAlsoRuns() {
      return this.sortModels(this.alsoRuns.filter((m) => this.matchesFilter(m)));
    },

    get availableCaps() {
      return [...new Set(this.alsoRuns.flatMap((m) => m.capabilities))].sort();
    },

    get modelGroups() {
      if (this.alsoRuns.length < 6) return [];
      const groups = new Map();
      for (const m of this.visibleAlsoRuns) {
        const fam = m.family_label;
        if (!groups.has(fam)) groups.set(fam, []);
        groups.get(fam).push(m);
      }
      return [...groups.entries()]
        .map(([family, models]) => ({ family, models }))
        .sort(
          (a, b) =>
            Math.max(...b.models.map((m) => m.vram_requirements_gb)) -
            Math.max(...a.models.map((m) => m.vram_requirements_gb)),
        );
    },

    matchesFilter(model) {
      if (this.filterCaps.length && !this.filterCaps.every((c) => model.capabilities.includes(c))) {
        return false;
      }
      if (!this.filterQ) return true;
      const haystack = `${model.model_name} ${model.description || ""} ${model.parameters} ${model.capabilities.join(" ")}`;
      return haystack.toLowerCase().includes(this.filterQ);
    },

    sortModels(models) {
      const sorted = [...models];
      if (this.filterSort === "size-asc") {
        sorted.sort((a, b) => a.params_b - b.params_b || a.vram_requirements_gb - b.vram_requirements_gb);
      } else if (this.filterSort === "name") {
        sorted.sort((a, b) => a.model_name.localeCompare(b.model_name));
      } else {
        sorted.sort((a, b) => b.params_b - a.params_b || b.vram_requirements_gb - a.vram_requirements_gb);
      }
      return sorted;
    },

    adjust(field, step) {
      if (field === "vram") {
        this.vram = Math.min(128, Math.max(1, this.vram + step));
      } else if (field === "ram") {
        this.ram = Math.min(256, Math.max(2, this.ram + step));
        this.ramKnown = true;
        if (this.vendor === "apple") this.vram = Math.round(this.ram * 0.7);
      }
    },

    toggleCap(cap) {
      if (this.filterCaps.includes(cap)) {
        this.filterCaps = this.filterCaps.filter((c) => c !== cap);
      } else {
        this.filterCaps = [...this.filterCaps, cap];
      }
    },

    setRunner(value) {
      this.runner = value;
      try { localStorage.setItem("runner", value); } catch {}
    },

    get displayReady() {
      return this.phase === "results";
    },

    get runnerHint() {
      if (this.runner === "ollama") {
        return "Sizes assume Q4 quantization. Commands need Ollama. Get it at ollama.com.";
      }
      return "Sizes assume Q4 quantization. Commands use LM Studio\u2019s lms CLI. Enable it in LM Studio under Settings \u2192 Developer.";
    },

    runCmd(model) {
      if (this.runner === "lmstudio") {
        return `lms get https://huggingface.co/${model.huggingface_id}@${model.quantization.toLowerCase()}`;
      }
      const tag = model.ollama_tag || model.model_name.toLowerCase().replace(/\s+/g, "-");
      return `ollama run ${tag}`;
    },

    async copyCmd(model) {
      const cmd = this.runCmd(model);
      this.copiedId = model.id;
      try { await navigator.clipboard.writeText(cmd); } catch {}
      setTimeout(() => { this.copiedId = null; }, 1500);
    },

    isTight(model) {
      return model.vram_requirements_gb <= this.vram && model.vram_requirements_gb > this.vram * 0.85;
    },

    gpuValue() {
      if (!this.gpuName) return "unknown";
      const match = this.gpuName.match(
        /(apple m\d[^,)]*|nvidia geforce [^,)]*|amd radeon [^,)]*|intel[^,)]*)/i,
      );
      return match ? match[1] : this.gpuName;
    },

    ramValue() {
      if (!this.ramKnown) return "unknown";
      return this.ramCapped ? `\u2265${this.ram} GB` : `${this.ram} GB`;
    },

    renderTerminal() {
      if (this.reducedMotion) {
        for (const key in this.probeDone) {
          this.probeDone[key] = true;
        }
        this.phase = "results";
        return;
      }

      const keys = ['gpu', 'ram', 'cpu', 'os', 'webgpu', 'vram'];
      const delay = 250;

      keys.forEach((key, index) => {
        setTimeout(() => {
          this.probeDone[key] = true;
          if (index === keys.length - 1) {
            setTimeout(() => { this.phase = "results"; }, delay);
          }
        }, (index + 1) * delay);
      });
    },
  }));
});
