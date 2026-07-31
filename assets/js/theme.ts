/**
 * Shared 3-state theme handling (light / dark / system) for Club Matto sites.
 *
 * Expects a toggle button containing `.theme-icon-light`, `.theme-icon-system`
 * and `.theme-icon-dark` elements; the active one gets `.active`.
 * Persists the choice in localStorage under "theme".
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "theme";

export function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {}
  return "system";
}

export function getResolvedTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function nextTheme(current: Theme): Theme {
  if (current === "light") return "dark";
  if (current === "dark") return "system";
  return "light";
}

export function applyTheme(theme: Theme, button?: HTMLElement | null): void {
  const resolved = getResolvedTheme(theme);
  document.documentElement.style.setProperty("color-scheme", resolved);
  document.documentElement.setAttribute("data-color-scheme", resolved);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {}

  if (!button) return;
  const icons: Record<Theme, string> = {
    light: ".theme-icon-light",
    dark: ".theme-icon-dark",
    system: ".theme-icon-system",
  };
  for (const [state, selector] of Object.entries(icons)) {
    button
      .querySelector(selector)
      ?.classList.toggle("active", state === theme);
  }
}

export function initThemeToggle(button: HTMLElement | null): void {
  const stored = getStoredTheme();
  applyTheme(stored, button);

  button?.addEventListener("click", () => {
    applyTheme(nextTheme(getStoredTheme()), button);
  });

  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (getStoredTheme() === "system") {
        applyTheme("system", button);
      }
    });
}
