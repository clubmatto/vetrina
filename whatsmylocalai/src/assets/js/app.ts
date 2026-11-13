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
  lookupGPU,
  suggestRAM,
  type AppleChipDatabase,
  type GpuDatabase,
  type OS,
  type Vendor,
} from "./detect";

/**
 * Map the raw WebGL renderer string to a canonical GPU name that matches the
 * option values in the dropdown: Apple chips become "Apple M1 Max", known
 * discrete GPUs their database key ("RTX 4090"), anything else stays as-is.
 */
function canonicalGpuName(
  gpuName: string | null,
  vendor: Vendor,
  chip: string | null,
  database: GpuDatabase,
): string | null {
  if (vendor === "apple" && chip) return `Apple ${chip}`;
  if (gpuName) {
    const hit = lookupGPU(gpuName, database);
    if (hit) return hit.key;
    const match = gpuName.match(
      /(apple m\d[^,)]*|nvidia geforce [^,)]*|amd radeon [^,)]*|intel[^,)]*)/i,
    );
    return match ? match[1] : gpuName;
  }
  return null;
}
import {
  availableCaps,
  beyondModels as selectBeyondModels,
  formatShortfall,
  isTight,
  matchesFilter,
  rankByTradeoff,
  resolveOptionsTab,
  runCmd,
  sortModels,
  suggestMerged,
  type MergedModel,
  type MergedRegistry,
  type OptionsTab,
  type Runner,
  type SortKey,
} from "./models";
import {
  backendForVendor,
  estimateSpeed,
  formatSpeed,
  type SpeedEstimate,
} from "./speed";
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
/** How many out-of-reach models to show before the "show all" toggle. */
const TOP_BEYOND = 6;

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
      gpuSel: "",
      vendor: "unknown" as Vendor,
      chip: null as string | null,
      vram: 4,
      ram: 16,
      ramKnown: false,
      ramCapped: false,
      cores: null as number | null,
      os: "unknown" as OS,
      osSel: "",
      webgpu: false,
      runner: "lmstudio" as Runner,
      copiedId: null as string | null,
      repeatTimer: null as number | null,
      filterQ: "",
      filterCaps: [] as string[],
      filterSort: "size-desc" as SortKey,
      showAll: false,
      showBeyond: false,
      activeTab: "fits" as OptionsTab,
      announcement: "",
      announceTimer: null as number | null,
      demoText: "",
      demoFullText: "",
      demoPlaying: false,
      demoRaf: null as number | null,
      demoPlayed: false,
      perfBias: 1,
      modelRegistry: {
        version: "0.0.0",
        generated_at: "",
        models: [],
      } as MergedRegistry,
      gpuDatabase: [] as GpuDatabase,
      appleChips: [] as AppleChipDatabase,
      gpuSpeed: { bandwidth_gbs: {} } as {
        bandwidth_gbs: Record<string, number>;
      },
      appleSpeed: { bins: {} } as {
        bins: Record<string, [number, number][]>;
      },
      savedSpecs: null as {
        ram: number;
        vram: number;
        gpu?: string;
        os?: string;
        cores?: number;
        webgpu?: boolean;
      } | null,
      sharedSpecs: null as {
        ram: number;
        vram: number;
        gpu?: string;
        os?: string;
        cores?: number;
        webgpu?: boolean;
        perfBias?: number;
      } | null,
      shareCopied: false,
      detectedGpuName: null as string | null,
      detectedOS: "unknown" as OS,
      detectedRam: 16,
      detectedVram: 4,
      detectedCores: null as number | null,
      detectedWebgpu: false,
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
        this.gpuSpeed = (loadJSON("gpu-speed") as {
          bandwidth_gbs: Record<string, number>;
        } | null) ?? {
          bandwidth_gbs: {},
        };
        this.appleSpeed = (loadJSON("apple-speed") as {
          bins: Record<string, [number, number][]>;
        } | null) ?? { bins: {} };

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
                gpu: typeof parsed.gpu === "string" ? parsed.gpu : undefined,
                os: typeof parsed.os === "string" ? parsed.os : undefined,
                cores:
                  typeof parsed.cores === "number" ? parsed.cores : undefined,
                webgpu:
                  typeof parsed.webgpu === "boolean"
                    ? parsed.webgpu
                    : undefined,
              };
            }
          }
        } catch {}

        try {
          const saved = localStorage.getItem("runner");
          if (saved === "ollama" || saved === "lmstudio") this.runner = saved;
        } catch {}

        this.readSharedSpecs();
        this.readSharedTab();
        // A shared spec wins over any locally saved machine for this visit, so
        // the link always replays the sharer's result rather than the viewer's.
        if (this.sharedSpecs) this.savedSpecs = null;

        this.runDetection();
        this.applySharedSpecs();
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

        const detectedGpuName = canonicalGpuName(
          this.gpuName,
          this.vendor,
          this.chip,
          this.gpuDatabase,
        );

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
        const estimate = estimateVRAM({
          vendor: this.vendor,
          gpuName: this.gpuName,
          ram: ramSuggestion.ram,
          ramKnown: ramSuggestion.ramKnown,
          ramCapped: ramSuggestion.ramCapped,
          gpuDatabase: this.gpuDatabase,
        });

        this.detectedGpuName = detectedGpuName;
        this.detectedOS = this.os;
        this.detectedCores = this.cores;
        this.detectedWebgpu = this.webgpu;
        this.detectedRam = ramSuggestion.ram;
        this.detectedVram = estimate.vram;

        const saved = this.savedSpecs;
        if (saved) {
          this.gpuSel = saved.gpu ?? detectedGpuName ?? "";
          this.osSel = saved.os ?? this.os;
          if (saved.os) this.os = saved.os as OS;
          if (typeof saved.cores === "number") this.cores = saved.cores;
          if (typeof saved.webgpu === "boolean") this.webgpu = saved.webgpu;
          this.ram = saved.ram;
          this.ramKnown = true;
          this.ramCapped = false;
          this.vram = saved.vram || Math.round(saved.ram * 0.7);
          if (this.gpuSel) {
            this.gpuName = this.gpuSel;
            this.vendor = detectVendor(this.gpuSel);
            this.chip = detectAppleChip(this.gpuSel);
          }
          return;
        }

        this.gpuSel = detectedGpuName ?? "";
        this.osSel = this.os;
        this.ram = ramSuggestion.ram;
        this.ramKnown = ramSuggestion.ramKnown;
        this.ramCapped = ramSuggestion.ramCapped;
        this.vram = estimate.vram;
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
          this.maybeAutoplayDemo();
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
                  this.maybeAutoplayDemo();
                }, REVEAL_DELAY_MS);
              }
            },
            (index + 1) * REVEAL_DELAY_MS,
          );
        });
      },

      get gpuDetected() {
        return !!this.detectedGpuName && this.gpuSel === this.detectedGpuName;
      },

      get osDetected() {
        return this.osSel === this.detectedOS;
      },

      get ramDetected() {
        return this.ram === this.detectedRam;
      },

      get vramDetected() {
        return this.vram === this.detectedVram;
      },

      get coresDetected() {
        return this.cores === this.detectedCores;
      },

      get webgpuDetected() {
        return this.webgpu === this.detectedWebgpu;
      },

      /** True as soon as any spec stops matching what we detected. */
      get manual() {
        return !(
          this.gpuDetected &&
          this.osDetected &&
          this.ramDetected &&
          this.vramDetected &&
          this.coresDetected &&
          this.webgpuDetected
        );
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

      get beyondModels(): MergedModel[] {
        return selectBeyondModels(this.modelRegistry.models, this.vram);
      },

      get visibleBeyond(): MergedModel[] {
        const models = this.beyondModels;
        return this.showBeyond ? models : models.slice(0, TOP_BEYOND);
      },

      get closestBeyond(): MergedModel[] {
        return this.beyondModels.slice(0, 3);
      },

      get effectiveTab(): OptionsTab {
        return resolveOptionsTab(
          this.activeTab,
          this.alsoRuns.length,
          this.beyondModels.length,
        );
      },

      get bandwidthGbS(): number | null {
        if (this.vendor === "apple" && this.chip) {
          const chip = this.chip;
          const key = Object.keys(this.appleSpeed.bins).find(
            (name) => name.toLowerCase() === chip.toLowerCase(),
          );
          const bins = key ? this.appleSpeed.bins[key] : null;
          if (bins) {
            for (const [maxRam, value] of bins) {
              if (this.ram <= maxRam) return value;
            }
          }
          return null;
        }
        return this.gpuSpeed.bandwidth_gbs[this.gpuSel] ?? null;
      },

      speedFor(model: MergedModel): SpeedEstimate | null {
        if (!this.displayReady) return null;
        if (model.vram_requirements_gb > this.vram) return null;
        return estimateSpeed({
          bandwidthGbS: this.bandwidthGbS,
          backend: backendForVendor(this.vendor),
          vramGb: model.vram_requirements_gb,
          paramsB: model.params_b,
          activeParamsB: model.active_params_b,
        });
      },

      speedLabel(model: MergedModel): string {
        const estimate = this.speedFor(model);
        return estimate ? formatSpeed(estimate) : "";
      },

      speedValue(model: MergedModel): string {
        const estimate = this.speedFor(model);
        return estimate ? `~${estimate.low}-${estimate.high}` : "";
      },

      buildDemoText(
        model: MergedModel,
        estimate: SpeedEstimate,
        rate: number,
      ): string {
        const machine =
          this.vendor === "apple" && this.chip
            ? `this ${this.chip}`
            : this.gpuSel || "this machine";
        return (
          `Simulation at ${rate} tok/s. ` +
          `A Q4 build of ${model.model_name} runs at ${estimate.low}-${estimate.high} tok/s on ${machine}. ` +
          `Real numbers vary with engine, prompt, and context.`
        );
      },

      maybeAutoplayDemo() {
        if (this.demoPlayed) return;
        this.demoPlayed = true;
        this.playDemo();
      },

      /** Stop and clear the terminal so it cannot contradict a new pick. */
      resetDemo() {
        this.stopDemo();
        this.demoText = "";
        this.demoFullText = "";
      },

      stopDemo() {
        if (this.demoRaf !== null) {
          window.cancelAnimationFrame(this.demoRaf);
          this.demoRaf = null;
        }
        this.demoPlaying = false;
      },

      playDemo() {
        const model = this.bestModel;
        const estimate = model ? this.speedFor(model) : null;
        if (!model || !estimate) return;

        if (this.demoPlaying) {
          this.stopDemo();
          this.demoText = this.demoFullText;
          return;
        }

        const rate = Math.round(
          estimate.low + Math.random() * (estimate.high - estimate.low),
        );
        const text = this.buildDemoText(model, estimate, rate);
        this.demoFullText = text;
        this.demoText = "";

        if (this.reducedMotion) {
          this.demoText = text;
          return;
        }

        this.stopDemo();
        this.demoPlaying = true;

        // Tokens are about four characters. Stream characters at that rate and
        // let the browser batch the DOM writes per frame.
        const charactersPerSecond = rate * 4;
        const started = performance.now();
        const tick = (now: number) => {
          const shown = Math.min(
            text.length,
            Math.floor(((now - started) / 1000) * charactersPerSecond),
          );
          this.demoText = text.slice(0, shown);
          if (shown >= text.length) {
            this.demoPlaying = false;
            this.demoRaf = null;
            return;
          }
          this.demoRaf = window.requestAnimationFrame(tick);
        };
        this.demoRaf = window.requestAnimationFrame(tick);
      },

      get speedHint(): string {
        return "Estimated decode speed for GGUF via llama.cpp or Metal, single device, 8k context. MLX builds can differ.";
      },

      get availableCaps(): string[] {
        return availableCaps(this.alsoRuns);
      },

      adjust(field: "vram" | "ram", step: number) {
        this.resetDemo();
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
            const estimate = estimateVRAM({
              vendor: this.vendor,
              gpuName: this.gpuName,
              ram: this.ram,
              ramKnown: true,
              ramCapped: false,
              gpuDatabase: this.gpuDatabase,
            });
            this.vram = estimate.vram;
          }
        }
        this.persistSpecs();
      },

      /**
       * Hold-to-repeat for steppers: fires `step` once, then keeps firing on a
       * timer while held, growing the step size the longer the hold lasts.
       */
      startRepeat(step: () => void) {
        step();
        this.stopRepeat();
        let elapsed = 0;
        this.repeatTimer = window.setInterval(() => {
          elapsed += 140;
          const factor = Math.min(16, 2 ** Math.floor(elapsed / 600));
          for (let i = 0; i < factor; i++) step();
        }, 140);
      },

      stopRepeat() {
        if (this.repeatTimer !== null) {
          window.clearInterval(this.repeatTimer);
          this.repeatTimer = null;
        }
      },

      applyGpuName(value: string | null) {
        this.gpuName = value;
        this.vendor = value ? detectVendor(value) : "unknown";
        this.chip = detectAppleChip(value);
      },

      /**
       * Re-derive RAM/VRAM from the current GPU selection, simulating a real
       * machine: Apple chips pin down the RAM configs they ship with, known
       * discrete GPUs get their VRAM from the lookup table, everything else
       * falls back to a guess from RAM.
       */
      deriveFromGpu() {
        if (this.vendor === "apple" && this.chip) {
          const candidates = chipRamCandidates(this.chip, this.appleChips);
          if (candidates && candidates.length) {
            this.ram = candidates[0];
            this.ramKnown = true;
            this.ramCapped = false;
          }
          this.vram = Math.round(this.ram * 0.7);
          return;
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
      },

      setGpu(value: string) {
        this.resetDemo();
        this.gpuSel = value;
        this.applyGpuName(value);
        this.deriveFromGpu();
        this.persistSpecs();
      },

      setOS(value: string) {
        this.osSel = value;
        this.os = value as OS;
        this.persistSpecs();
      },

      adjustCores(step: number) {
        this.cores = Math.min(64, Math.max(1, (this.cores ?? 4) + step));
        this.persistSpecs();
      },

      toggleWebGPU() {
        this.webgpu = !this.webgpu;
        this.persistSpecs();
      },

      persistSpecs() {
        try {
          localStorage.setItem(
            SPECS_KEY,
            JSON.stringify({
              ram: this.ram,
              vram: this.vram,
              gpu: this.gpuSel,
              os: this.osSel,
              cores: this.cores,
              webgpu: this.webgpu,
            }),
          );
        } catch {}
      },

      resetSpecs() {
        this.resetDemo();
        this.savedSpecs = null;
        try {
          localStorage.removeItem(SPECS_KEY);
        } catch {}
        this.runDetection();
      },

      /** Decode machine specs from the query string, if a share link was used. */
      readSharedSpecs() {
        let shared: NonNullable<typeof this.sharedSpecs> | null = null;
        try {
          const params = new URLSearchParams(window.location.search);
          const ram = params.get("ram");
          const vram = params.get("vram");
          const gpu = params.get("gpu");
          const os = params.get("os");
          const cores = params.get("cores");
          const perf = params.get("perf");
          if (
            ram !== null &&
            vram !== null &&
            Number.isFinite(Number(ram)) &&
            Number.isFinite(Number(vram)) &&
            Number(ram) >= 2 &&
            Number(ram) <= 256 &&
            Number(vram) >= 1 &&
            Number(vram) <= 128
          ) {
            shared = {
              ram: Number(ram),
              vram: Number(vram),
            };
            if (cores !== null && Number.isFinite(Number(cores))) {
              const parsedCores = Number(cores);
              if (parsedCores >= 1 && parsedCores <= 64) {
                shared.cores = parsedCores;
              }
            }
            if (gpu) shared.gpu = gpu;
            if (os) shared.os = os as OS;
            if (perf !== null && Number.isFinite(Number(perf))) {
              const parsedPerf = Number(perf);
              if (parsedPerf >= 0 && parsedPerf <= 1) {
                shared.perfBias = parsedPerf;
              }
            }
          }
        } catch {}
        this.sharedSpecs = shared;
      },

      readSharedTab() {
        try {
          const tab = new URLSearchParams(window.location.search).get("tab");
          if (tab === "out-of-reach") this.activeTab = "beyond";
        } catch {}
      },

      applySharedSpecs() {
        const shared = this.sharedSpecs;
        if (!shared) return;
        this.ram = shared.ram;
        this.vram = shared.vram;
        this.ramKnown = true;
        this.ramCapped = false;
        if (shared.gpu) {
          this.gpuSel = shared.gpu;
          this.applyGpuName(shared.gpu);
        }
        if (shared.os) {
          this.osSel = shared.os;
          this.os = shared.os as OS;
        }
        if (typeof shared.cores === "number") this.cores = shared.cores;
        if (typeof shared.webgpu === "boolean") this.webgpu = shared.webgpu;
        if (typeof shared.perfBias === "number")
          this.perfBias = shared.perfBias;
      },

      buildShareUrl() {
        const params = new URLSearchParams();
        params.set("ram", String(Math.round(this.ram)));
        params.set("vram", String(Math.round(this.vram)));
        if (this.gpuSel) params.set("gpu", this.gpuSel);
        if (this.osSel && this.osSel !== "unknown")
          params.set("os", this.osSel);
        if (this.cores) params.set("cores", String(this.cores));
        if (this.perfBias !== 1) params.set("perf", this.perfBias.toFixed(2));
        if (this.effectiveTab === "beyond") params.set("tab", "out-of-reach");
        return `${location.origin}${location.pathname}?${params.toString()}`;
      },

      async shareResult() {
        const url = this.buildShareUrl();
        const best = this.bestModel;
        const text = best
          ? `I can run ${best.model_name} locally (~${best.vram_requirements_gb} GB Q4). What fits your machine?`
          : `What's the best local model your machine can run?`;
        if (typeof navigator.share === "function") {
          try {
            await navigator.share({ title: "What's my local AI?", text, url });
            return;
          } catch {}
        }
        try {
          await navigator.clipboard.writeText(url);
          this.shareCopied = true;
          setTimeout(() => {
            this.shareCopied = false;
          }, 1500);
        } catch {}
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

      toggleBeyond() {
        this.showBeyond = !this.showBeyond;
      },

      /**
       * Switch the options panel. Arrow keys move focus with the selection so
       * the tablist behaves like a single control.
       */
      setTab(tab: OptionsTab, moveFocus = false) {
        this.activeTab = tab;
        if (!moveFocus) return;
        // Wait for Alpine to flush :tabindex before moving focus.
        setTimeout(() => {
          document
            .getElementById(tab === "fits" ? "tab-fits" : "tab-beyond")
            ?.focus();
        }, 0);
      },

      formatGap(model: MergedModel): string {
        return formatShortfall(model, this.vram);
      },

      /**
       * Announce result changes to screen readers. Debounced: holding a
       * stepper button fires many updates and only the last one matters.
       */
      announceResults() {
        const text = this.buildAnnouncement();
        if (this.announceTimer !== null) {
          window.clearTimeout(this.announceTimer);
        }
        this.announceTimer = window.setTimeout(() => {
          this.announcement = text;
        }, 400);
      },

      buildAnnouncement(): string {
        if (!this.displayReady) return "";
        const best = this.bestModel;
        const head = best
          ? `Best pick: ${best.model_name}, about ${best.vram_requirements_gb} GB at Q4.`
          : `Nothing fits in ${this.vram} GB.`;
        const fits = `${this.alsoRuns.length} more fit`;
        const beyond = `${this.beyondModels.length} need more memory`;
        return `${head} ${fits}, ${beyond}.`;
      },

      setRunner(value: Runner) {
        this.runner = value;
        try {
          localStorage.setItem("runner", value);
        } catch {}
      },

      setPerfBias(value: number) {
        this.resetDemo();
        this.perfBias = value;
      },

      get displayReady() {
        return this.phase === "results";
      },

      openEmailForm() {
        this.emailSubmitted = false;
        this.emailError = false;
        this.showEmailForm = true;
        // The dialog mounts with x-show, so focus once it is in the DOM.
        setTimeout(() => {
          document
            .querySelector<HTMLElement>(".email-modal")
            ?.querySelector<HTMLElement>("button, input, a[href]")
            ?.focus();
        }, 0);
      },

      closeEmailForm() {
        this.showEmailForm = false;
        setTimeout(() => document.getElementById("emailTrigger")?.focus(), 0);
      },

      /** Keep Tab inside the open dialog. */
      trapFocus(event: KeyboardEvent) {
        const modal = event.currentTarget;
        if (!(modal instanceof HTMLElement)) return;
        const focusable = Array.from(
          modal.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((el) => el.offsetParent !== null);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
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

      get gpuOptionGroups(): {
        label: string;
        options: { value: string; label: string; disabled?: boolean }[];
      }[] {
        const groups: {
          label: string;
          options: { value: string; label: string; disabled?: boolean }[];
        }[] = [];

        const apple: { value: string; label: string }[] = this.appleChips.map(
          ([chip]) => ({ value: `Apple ${chip}`, label: `Apple ${chip}` }),
        );
        if (apple.length)
          groups.push({ label: "Apple Silicon", options: apple });

        const nvidia: { value: string; label: string }[] = [];
        const amd: { value: string; label: string }[] = [];
        const intel: { value: string; label: string }[] = [];
        const other: { value: string; label: string }[] = [];
        for (const [name] of this.gpuDatabase) {
          const vendor = detectVendor(name);
          const option = { value: name, label: name };
          if (vendor === "nvidia") nvidia.push(option);
          else if (vendor === "amd") amd.push(option);
          else if (vendor === "intel") intel.push(option);
          else other.push(option);
        }
        if (nvidia.length) groups.push({ label: "NVIDIA", options: nvidia });
        if (amd.length) groups.push({ label: "AMD", options: amd });
        if (intel.length) groups.push({ label: "Intel", options: intel });
        if (other.length) groups.push({ label: "Other", options: other });

        const detected = this.detectedGpuName;
        if (detected) {
          const known = groups.some((g) =>
            g.options.some((o) => o.value === detected),
          );
          if (!known) {
            groups.unshift({
              label: "Your GPU",
              options: [{ value: detected, label: detected }],
            });
          }
        } else {
          groups.unshift({
            label: "Your GPU",
            options: [{ value: "", label: "GPU not detected", disabled: true }],
          });
        }
        return groups;
      },

      get osOptions(): { value: string; label: string }[] {
        const labels: Record<OS, string> = {
          android: "Android",
          ios: "iOS",
          windows: "Windows",
          macos: "macOS",
          chromeos: "ChromeOS",
          linux: "Linux",
          unknown: "Unknown",
        };
        return (Object.keys(labels) as OS[]).map((key) => ({
          value: key,
          label: labels[key],
        }));
      },

      ramValue() {
        if (!this.ramKnown) return "unknown";
        return this.ramCapped ? `≥${this.ram} GB` : `${this.ram} GB`;
      },
    };
    return state;
  });
});
