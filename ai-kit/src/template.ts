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
      `This file was last updated: ${isoDate}. Always check the \`.agents/rules/\` directory for the most current language-specific guidelines.`,
    );
}

export function stripDates(content: string): string {
  return content
    .replace(
      /Last updated: \d{4}-\d{2}-\d{2}\. This file extends the global rules in @AGENTS\.md\. Always check both files\./g,
      "{{FOOTER}}",
    )
    .replace(
      /This file was last updated: \d{4}-\d{2}-\d{2}\. Always check the `\.agents\/rules\/` directory for the most current language-specific guidelines\./g,
      "{{AGENTS_FOOTER}}",
    );
}
