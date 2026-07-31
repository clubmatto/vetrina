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
  chipRamCandidates,
  detectAppleChip,
  detectGPU,
  detectVendor,
  detectOS,
  estimateVRAM,
  suggestRAM,
  type AppleChipDatabase,
  type GpuDatabase,
  type OS,
  type Vendor,
} from "./detect";
import {
  availableCaps,
  isTight,
  matchesFilter,
  rankByTradeoff,
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

/** How many "other options" to show by default before the "show all" toggle. */
const TOP_RUNS = 3;

const PROBE_SEEN_KEY = "wmla-probe-seen";
const SPECS_KEY = "wmla-specs";
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
      chip: null as string | null,
      vram: 4,
      detectedVramSource: "wild guess",
      detectedRamNote: "",
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
      showAll: false,
      perfBias: 1,
      modelRegistry: {
        version: "0.0.0",
        generated_at: "",
        models: [],
      } as MergedRegistry,
      gpuDatabase: [] as GpuDatabase,
      appleChips: [] as AppleChipDatabase,
      savedSpecs: null as { ram: number; vram: number } | null,
      manual: false,
      phase: "probing" as "probing" | "results",
      probeDone: Object.fromEntries(
        PROBE_KEYS.map((k) => [k, false]),
      ) as Record<ProbeKey, boolean>,
      reducedMotion: false,
      showEmailForm: false,
      emailSubmitted: false,
      emailError: false,
      spyItems: [
        { id: "detect-panel", label: "Your machine" },
        { id: "best-pick-row", label: "Your local model" },
        { id: "models", label: "Other options" },
        { id: "use-cases", label: "What can you do with it?" },
        { id: "detection-credit", label: "How detection works" },
      ] as { id: string; label: string }[],
      activeSection: "",

      init() {
        this.reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

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
        this.appleChips =
          (loadJSON("apple-chips") as AppleChipDatabase | null) ?? [];

        try {
          const raw = localStorage.getItem(SPECS_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (
              parsed &&
              typeof parsed.ram === "number" &&
              parsed.ram >= 2 &&
              parsed.ram <= 256
            ) {
              this.savedSpecs = {
                ram: parsed.ram,
                vram:
                  typeof parsed.vram === "number" && parsed.vram >= 1
                    ? parsed.vram
                    : 0,
              };
            }
          }
        } catch {}

        try {
          const saved = localStorage.getItem("runner");
          if (saved === "ollama" || saved === "lmstudio") this.runner = saved;
        } catch {}

        this.runDetection();
        this.revealProbes();
        this.initScrollSpy();
      },

      initScrollSpy() {
        const onScroll = () => this.updateActiveSection();
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
      },

      updateActiveSection() {
        const probeLine = window.scrollY + window.innerHeight * 0.3;
        let current = this.spyItems[0]?.id || "";
        for (const item of this.spyItems) {
          const el = document.getElementById(item.id);
          if (!el) continue;
          if (el.offsetTop <= probeLine) current = item.id;
        }
        if (
          window.innerHeight + window.scrollY >=
          document.documentElement.scrollHeight - 4
        ) {
          current = this.spyItems[this.spyItems.length - 1]?.id || current;
        }
        this.activeSection = current;
      },

      scrollToSection(id: string) {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({
          behavior: this.reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      },

      runDetection() {
        this.gpuName = detectGPU();
        this.vendor = this.gpuName ? detectVendor(this.gpuName) : "unknown";
        this.chip = detectAppleChip(this.gpuName);
        this.os = detectOS(navigator.userAgent);
        this.cores = navigator.hardwareConcurrency || null;
        this.webgpu = "gpu" in navigator;

        const saved = this.savedSpecs;
        if (saved) {
          this.ram = saved.ram;
          this.ramKnown = true;
          this.ramCapped = false;
          this.vram = saved.vram || Math.round(saved.ram * 0.7);
          this.manual = true;
          return;
        }
        this.manual = false;

        const deviceMemory =
          typeof navigator.deviceMemory === "number"
            ? navigator.deviceMemory
            : null;
        const ramSuggestion = suggestRAM({
          vendor: this.vendor,
          chip: this.chip,
          deviceMemory,
          chipDatabase: this.appleChips,
        });
        this.ram = ramSuggestion.ram;
        this.ramKnown = ramSuggestion.ramKnown;
        this.ramCapped = ramSuggestion.ramCapped;
        this.detectedRamNote = ramSuggestion.note;

        const estimate = estimateVRAM({
          vendor: this.vendor,
          gpuName: this.gpuName,
          ram: this.ram,
          ramKnown: this.ramKnown,
          ramCapped: this.ramCapped,
          gpuDatabase: this.gpuDatabase,
        });
        this.vram = estimate.vram;
        this.detectedVramSource = estimate.source;
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
        if (this.manual) return "you set this — saved for next visit";
        return this.detectedRamNote;
      },

      get vramSource() {
        if (this.manual) return "you set this — saved for next visit";
        return this.detectedVramSource;
      },

      get fittingModels(): MergedModel[] {
        return rankByTradeoff(
          suggestMerged(this.modelRegistry, this.vram),
          this.perfBias,
        );
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

      get isFiltering(): boolean {
        return this.filterQ.trim() !== "" || this.filterCaps.length > 0;
      },

      get shownAlsoRuns(): MergedModel[] {
        if (this.showAll || this.isFiltering) return this.visibleAlsoRuns;
        return this.visibleAlsoRuns.slice(0, TOP_RUNS);
      },

      get availableCaps(): string[] {
        return availableCaps(this.alsoRuns);
      },

      adjust(field: "vram" | "ram", step: number) {
        if (field === "vram") {
          this.vram = Math.min(128, Math.max(1, this.vram + step));
        } else {
          this.ramKnown = true;
          this.ramCapped = false;
          if (this.vendor === "apple") {
            const candidates = chipRamCandidates(this.chip, this.appleChips);
            const idx = candidates ? candidates.indexOf(this.ram) : -1;
            if (candidates && idx >= 0) {
              const next = candidates[idx + step];
              if (typeof next === "number") {
                this.ram = next;
              } else {
                this.ram = Math.min(256, Math.max(2, this.ram + step * 2));
              }
            } else {
              this.ram = Math.min(256, Math.max(2, this.ram + step * 2));
            }
            this.vram = Math.round(this.ram * 0.7);
          } else {
            this.ram = Math.min(256, Math.max(2, this.ram + step * 2));
          }
        }
        this.manual = true;
        this.persistSpecs();
      },

      persistSpecs() {
        try {
          localStorage.setItem(
            SPECS_KEY,
            JSON.stringify({ ram: this.ram, vram: this.vram }),
          );
        } catch {}
      },

      resetSpecs() {
        this.savedSpecs = null;
        this.manual = false;
        try {
          localStorage.removeItem(SPECS_KEY);
        } catch {}
        this.runDetection();
      },

      toggleCap(cap: string) {
        if (this.filterCaps.includes(cap)) {
          this.filterCaps = this.filterCaps.filter((c) => c !== cap);
        } else {
          this.filterCaps = [...this.filterCaps, cap];
        }
      },

      toggleShowAll() {
        this.showAll = !this.showAll;
      },

      setRunner(value: Runner) {
        this.runner = value;
        try {
          localStorage.setItem("runner", value);
        } catch {}
      },

      setPerfBias(value: number) {
        this.perfBias = value;
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
