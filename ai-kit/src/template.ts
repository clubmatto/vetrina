export function processTemplate(content: string): string {
  const now = new Date();
  const isoDate = now.toISOString().split("T")[0];

  return content
    .replace(
      /\{\{FOOTER}}/g,
      `Last updated: ${isoDate}. This file extends the global rules in @AGENTS.md. Always check both files.`,
    )
    .replace(
      /\{\{AGENTS_FOOTER}}/g,
      `This file was last updated: ${isoDate}. Always check the \`.ai/rules/\` directory for the most current language-specific guidelines.`,
    );
}
