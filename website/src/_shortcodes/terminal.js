// Shell and terminal-output fences are transcripts of running a program, not
// code you read line by line, so they get the design system's terminal chrome
// (the same `.ds-terminal` used on the product pages) and no line numbers.
const TERMINAL_LANGUAGES = new Set([
  "bash",
  "sh",
  "shell",
  "zsh",
  "console",
  "text",
]);

export function terminalFences(md) {
  const fence = md.renderer.rules.fence;

  md.renderer.rules.fence = (tokens, idx, options, env, self) => {
    const rendered = fence
      ? fence(tokens, idx, options, env, self)
      : self.renderToken(tokens, idx, options);
    const language = tokens[idx].info.trim().split(/\s+/)[0];

    if (!TERMINAL_LANGUAGES.has(language)) {
      return rendered;
    }

    return `<div class="ds-terminal">
<div class="ds-terminal__header">
<span class="ds-terminal__dot ds-terminal__dot--red"></span>
<span class="ds-terminal__dot ds-terminal__dot--yellow"></span>
<span class="ds-terminal__dot ds-terminal__dot--green"></span>
</div>
<div class="ds-terminal__body">
${rendered}
</div>
</div>`;
  };
}
