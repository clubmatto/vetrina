import snapshot from "@opencode-ai/models/snapshot";

/**
 * Two public price baselines for the cost calculator: a frontier model and
 * DeepSeek. They show the fork in API prices better than a mid tier does.
 *
 * Prices come from the models.dev snapshot at build time, so the weekly
 * catalog job moves them too. The calculator compares one million output
 * tokens and assumes four input tokens for each output token.
 */
const PICKS = [
  { key: "frontier", label: "Frontier", provider: "openai", model: "gpt-5.5" },
  {
    key: "deepseek",
    label: "DeepSeek",
    provider: "deepseek",
    model: "deepseek-v4-pro",
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
