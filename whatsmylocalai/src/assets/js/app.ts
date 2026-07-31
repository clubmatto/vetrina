declare global {
  interface Navigator {
    deviceMemory?: number;
  }

  interface Window {
    Alpine: {
      data(name: string, factory: () => unknown): void;
    };
  }
}

export {};

import {
  detectGPU,
  detectVendor,
  detectOS,
  estimateVRAM,
  type GpuDatabase,
  type OS,
  type Vendor,
} from "./detect";
import {
  availableCaps,
  groupByFamily,
  isTight,
  matchesFilter,
  runCmd,
  sortModels,
  suggestMerged,
  type MergedModel,
  type MergedRegistry,
  type Runner,
  type SortKey,
} from "./models";
import { initThemeToggle } from "../../../../assets/js/theme";

type ProbeKey = "gpu" | "ram" | "cpu" | "os" | "webgpu" | "vram";

const PROBE_KEYS: readonly ProbeKey[] = [
  "gpu",
  "ram",
  "cpu",
  "os",
  "webgpu",
  "vram",
];

/** Show family groups + toolbar once the also-rans list gets long. */
const GROUP_THRESHOLD = 6;

const PROBE_SEEN_KEY = "wmla-probe-seen";
const REVEAL_DELAY_MS = 250;

function loadJSON(id: string): unknown {
  const el = document.getElementById(id);
  if (!el) return null;
  try {
    return JSON.parse(el.textContent || "");
  } catch {
    return null;
  }
}

initThemeToggle(document.getElementById("themeToggle"));

document.addEventListener("alpine:init", () => {
  window.Alpine.data("app", () => {
    const state = {
      gpuName: null as string | null,
      vendor: "unknown" as Vendor,
      vram: 4,
      vramSource: "wild guess",
      ram: 16,
      ramKnown: false,
      ramCapped: false,
      cores: null as number | null,
      os: "unknown" as OS,
      webgpu: false,
      runner: "lmstudio" as Runner,
      copiedId: null as string | null,
      filterQ: "",
      filterCaps: [] as string[],
      filterSort: "size-desc" as SortKey,
      modelRegistry: {
        version: "0.0.0",
        generated_at: "",
        models: [],
      } as MergedRegistry,
      gpuDatabase: [] as GpuDatabase,
      phase: "probing" as "probing" | "results",
      probeDone: Object.fromEntries(
        PROBE_KEYS.map((k) => [k, false]),
      ) as Record<ProbeKey, boolean>,
      reducedMotion: false,
      showEmailForm: false,
      emailSubmitted: false,
      emailError: false,
      bannerDismissed: false,

      init() {
        this.reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        try {
          const dismissedAt = localStorage.getItem("banner-dismissed-at");
          if (dismissedAt) {
            this.bannerDismissed =
              Date.now() - parseInt(dismissedAt, 10) < 5 * 60 * 1000;
          }
        } catch {}

        // Build-time JSON blobs inlined in the page; shapes guaranteed by
        // src/_data, so the casts at this boundary are safe.
        this.modelRegistry = (loadJSON(
          "model-data",
        ) as MergedRegistry | null) ?? {
          version: "0.0.0",
          generated_at: "",
          models: [],
        };
        this.gpuDatabase =
          (loadJSON("gpu-database") as GpuDatabase | null) ?? [];

        try {
          const saved = localStorage.getItem("runner");
          if (saved === "ollama" || saved === "lmstudio") this.runner = saved;
        } catch {}

        this.runDetection();
        this.revealProbes();
      },

      runDetection() {
        this.gpuName = detectGPU();
        this.vendor = this.gpuName ? detectVendor(this.gpuName) : "unknown";
        this.os = detectOS(navigator.userAgent);
        this.cores = navigator.hardwareConcurrency || null;
        this.webgpu = "gpu" in navigator;
        if (typeof navigator.deviceMemory === "number") {
          this.ram = navigator.deviceMemory;
          this.ramKnown = true;
          this.ramCapped = navigator.deviceMemory === 8;
        }
        const estimate = estimateVRAM({
          vendor: this.vendor,
          gpuName: this.gpuName,
          ram: this.ram,
          ramKnown: this.ramKnown,
          ramCapped: this.ramCapped,
          gpuDatabase: this.gpuDatabase,
        });
        this.vram = estimate.vram;
        this.vramSource = estimate.source;
      },

      /**
       * Staggered reveal of the probe results. Pure theater — detection is
       * synchronous — so it only plays on the first visit (or always, for
       * reduced-motion users: never).
       */
      revealProbes() {
        let seen = false;
        try {
          seen = localStorage.getItem(PROBE_SEEN_KEY) === "1";
        } catch {}

        if (this.reducedMotion || seen) {
          for (const key of PROBE_KEYS) this.probeDone[key] = true;
          this.phase = "results";
          return;
        }

        PROBE_KEYS.forEach((key, index) => {
          setTimeout(
            () => {
              this.probeDone[key] = true;
              if (index === PROBE_KEYS.length - 1) {
                setTimeout(() => {
                  this.phase = "results";
                  try {
                    localStorage.setItem(PROBE_SEEN_KEY, "1");
                  } catch {}
                }, REVEAL_DELAY_MS);
              }
            },
            (index + 1) * REVEAL_DELAY_MS,
          );
        });
      },

      get ramNote() {
        if (!this.ramKnown)
          return "RAM not reported by your browser. Set it yourself or use a Chromium-based browser";
        if (this.ramCapped)
          return "browsers cap reported ram at 8 GB — adjust if yours is higher";
        return "";
      },

      get fittingModels(): MergedModel[] {
        return suggestMerged(this.modelRegistry, this.vram);
      },

      get bestModel(): MergedModel | null {
        return this.fittingModels[0] || null;
      },

      get alsoRuns(): MergedModel[] {
        return this.fittingModels.slice(1);
      },

      get visibleAlsoRuns(): MergedModel[] {
        return sortModels(
          this.alsoRuns.filter((m) =>
            matchesFilter(m, this.filterQ, this.filterCaps),
          ),
          this.filterSort,
        );
      },

      get grouped(): boolean {
        return this.alsoRuns.length >= GROUP_THRESHOLD;
      },

      get availableCaps(): string[] {
        return availableCaps(this.alsoRuns);
      },

      get modelGroups() {
        return groupByFamily(this.visibleAlsoRuns);
      },

      adjust(field: "vram" | "ram", step: number) {
        if (field === "vram") {
          this.vram = Math.min(128, Math.max(1, this.vram + step));
        } else {
          this.ram = Math.min(256, Math.max(2, this.ram + step));
          this.ramKnown = true;
          if (this.vendor === "apple") this.vram = Math.round(this.ram * 0.7);
        }
      },

      toggleCap(cap: string) {
        if (this.filterCaps.includes(cap)) {
          this.filterCaps = this.filterCaps.filter((c) => c !== cap);
        } else {
          this.filterCaps = [...this.filterCaps, cap];
        }
      },

      setRunner(value: Runner) {
        this.runner = value;
        try {
          localStorage.setItem("runner", value);
        } catch {}
      },

      dismissBanner() {
        this.bannerDismissed = true;
        try {
          localStorage.setItem("banner-dismissed-at", String(Date.now()));
        } catch {}
      },

      get displayReady() {
        return this.phase === "results";
      },

      get runnerHint() {
        if (this.runner === "ollama") {
          return "Sizes assume Q4 quantization. Commands need Ollama. Get it at ollama.com.";
        }
        return "Sizes assume Q4 quantization. Commands use LM Studio’s lms CLI. Enable it in LM Studio under Settings → Developer.";
      },

      runCmd(model: MergedModel) {
        return runCmd(model, this.runner);
      },

      async copyCmd(model: MergedModel) {
        try {
          await navigator.clipboard.writeText(runCmd(model, this.runner));
          this.copiedId = model.id;
          setTimeout(() => {
            this.copiedId = null;
          }, 1500);
        } catch {}
      },

      isTight(model: MergedModel) {
        return isTight(model, this.vram);
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
        return this.ramCapped ? `≥${this.ram} GB` : `${this.ram} GB`;
      },
    };
    return state;
  });
});
