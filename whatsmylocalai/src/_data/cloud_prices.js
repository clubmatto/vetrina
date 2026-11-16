import snapshot from "@opencode-ai/models/snapshot";

/**
 * Three cloud tiers for the cost calculator. Prices come from the models.dev
 * snapshot at build time, so the weekly catalog job moves them too.
 *
 * The calculator compares one million output tokens and assumes four input
 * tokens for each output token. That makes the per-million price the effective
 * cost of a million output tokens, not a blend of two different meters.
 */
const PICKS = [
  { key: "frontier", label: "Frontier", provider: "openai", model: "gpt-5.5" },
  {
    key: "mid",
    label: "Mid",
    provider: "anthropic",
    model: "claude-sonnet-5",
  },
  {
    key: "budget",
    label: "Budget",
    provider: "google",
    model: "gemini-3-flash-preview",
  },
];

const CLOUD_INPUT_RATIO = 4;

export default function cloudPrices() {
  return PICKS.map((pick) => {
    const entry = snapshot.providers?.[pick.provider]?.models?.[pick.model];
    if (!entry?.cost) {
      throw new Error(
        `cloud price preset missing: ${pick.provider}/${pick.model}`,
      );
    }
    return {
      key: pick.key,
      label: pick.label,
      name: entry.name,
      input: entry.cost.input,
      output: entry.cost.output,
      perMillion: entry.cost.input * CLOUD_INPUT_RATIO + entry.cost.output,
    };
  });
}
