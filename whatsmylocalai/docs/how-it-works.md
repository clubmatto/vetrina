# How it works

The page detects a machine, turns it into a VRAM budget, and picks from a Q4
model catalog. Everything happens in the browser after the page loads.

For where the model and hardware data come from, see [catalog.md](catalog.md).
For the site itself, see the [README](../README.md).

## Detection

| Fact   | Source                                                | Confidence            |
| ------ | ----------------------------------------------------- | --------------------- |
| GPU    | WebGL renderer string via `WEBGL_debug_renderer_info` | High on discrete GPUs |
| RAM    | `navigator.deviceMemory`, capped at 8 GB by Chromium  | Low on Apple Silicon  |
| CPU    | `navigator.hardwareConcurrency`                       | High                  |
| OS     | User agent                                            | High                  |
| WebGPU | `navigator.gpu` presence                              | High                  |

`detect.ts` holds the pure functions. `detectGPU` is the only one that touches
WebGL.

## The 8 GB problem

`navigator.deviceMemory` never reports more than 8 GB in Chromium, so a Mac
with 64 GB looks like a machine with 8 GB. On Apple Silicon the detected chip
is the stronger signal: `apple_chips.json` lists the memory configurations
Apple actually sells each chip with. The page defaults to the smallest one and
shows the candidates, so a 16 GB M1 Pro does not get treated as a 64 GB M1 Max.

## VRAM estimate

The estimate is built in order of confidence:

1. **Apple Silicon**: about 70% of unified memory.
2. **Known discrete GPU**: exact match in `gpu_database.json`.
3. **Known RAM, unknown GPU**: half the system RAM, rounded down to a memory
   tier (2, 4, 6, 8, 12, 16, 24, 32, 48, 64, 80 GB).
4. **Nothing known**: 4 GB.

Corrections stick: any change to GPU, RAM, VRAM, cores, OS, or WebGPU is saved
to `localStorage` and reused on the next visit. "reset my specs" restores
detection.

## Recommendation

`@auxot/model-registry` provides Q4 entries with a VRAM requirement per model.
A model fits when its requirement is within the current VRAM budget. The best
pick is the largest model that fits, unless the lean-to-performance slider
pulls the ranking toward smaller models. A model that uses more than 85% of the
budget is marked as a tight fit.

Everything that does not fit is listed in the "Out of reach" tab with the gap
in gigabytes, closest first. The gap is the model's requirement minus the
budget, so it shrinks as the simulated machine grows.

## Speed estimate

The tokens-per-second chip is an estimate, not a measurement.

`src/assets/js/speed.ts` ports the decode model from
[llmspeed](https://github.com/nicorobinreal/llmspeed) (MIT). Decode at batch
size 1 is bandwidth-bound:

```
tok/s = bandwidth × backend efficiency ÷ active weight GB
```

- Bandwidth comes from `gpu_speed.json` for GPUs, and from the
  `[max memory, GB/s]` bins in `apple_speed.json` for Apple chips.
- Weights come from the catalog's Q4 figure. Sparse models only read their
  active parameters per token, so the active share scales the traffic down.
- Backend efficiency depends on the vendor: CUDA, Metal, ROCm, Vulkan.
- The result is a rounded ±15% band, for one device, a short prompt, and an 8k
  context.

Sparse models take their active count from the name (`Qwen3-30B-A3B`) or from
`model_speed.json` when the name does not encode it. The registry labels
several sparse models as Dense, so the family field is not used.

The best pick loops a short self-describing simulation at a random speed inside
the band, from the first time results appear. Stop shows the full text and ends
the loop; replay starts it again. With `prefers-reduced-motion` the text appears
at once and never loops. The terminal is labelled simulated, and the animated
text is hidden from screen readers; the band itself is the accessible number.

The terminal keeps a dark palette in both themes, because a light panel read as
another card rather than as a terminal.

There is no chip for a model that does not fit, and no separate MLX number: the
estimate is for the GGUF command shown on the card.

## Run commands

Two flavors, switchable in the UI and persisted in `localStorage`:

- **LM Studio**: `lms get https://huggingface.co/<huggingface_id>@<quant>`,
  derived from registry data.
- **Ollama**: `ollama run <tag>`, from `enrichment.json`, falling back to a slug
  of the model name.

On Apple Silicon the page notes that both runners also ship MLX engines. The
commands stay on GGUF, because that is the entry the catalog sizes.

## Sharing

The share button serializes the current machine into the URL (`ram`, `vram`,
`gpu`, `os`, `cores`, `perf`, and `tab`). The page reads those parameters on
load, and a shared spec wins over the viewer's saved machine, so the link
replays the sharer's result.
