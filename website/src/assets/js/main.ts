// Theme toggle functionality
const themeToggle = document.getElementById("themeToggle");
const lightIcon = themeToggle?.querySelector<HTMLElement>(".theme-icon-light");
const systemIcon =
  themeToggle?.querySelector<HTMLElement>(".theme-icon-system");
const darkIcon = themeToggle?.querySelector<HTMLElement>(".theme-icon-dark");

function getResolvedTheme(theme: string): string {
  if (theme === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

function applyTheme(theme: string) {
  if (!document.documentElement) return;

  const resolved = getResolvedTheme(theme);
  document.documentElement.style.setProperty("color-scheme", resolved);
  localStorage.setItem("theme", theme);

  if (!lightIcon || !systemIcon || !darkIcon) return;

  lightIcon.style.display =
    theme === "system" ? "none" : resolved === "light" ? "flex" : "none";
  systemIcon.style.display = theme === "system" ? "flex" : "none";
  darkIcon.style.display =
    theme === "system" ? "none" : resolved === "dark" ? "flex" : "none";
}

function getNextTheme(currentTheme: string): string {
  if (currentTheme === "light") return "dark";
  if (currentTheme === "dark") return "system";
  return "light";
}

if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    const currentTheme = localStorage.getItem("theme") || "light";
    applyTheme(getNextTheme(currentTheme));
  });
}

const storedTheme = localStorage.getItem("theme");
applyTheme(storedTheme || "system");

// Home page scrolling functionality
const scrollDivider = document.querySelector<HTMLElement>(".scroll-divider");
const whoWeAre = document.querySelector<HTMLElement>(".who-we-are");
const scrollArrow = document.querySelector<HTMLElement>(".scroll-arrow");

if (scrollDivider && whoWeAre && scrollArrow) {
  let isScrolledDown = false;

  function updateArrowDirection() {
    if (!whoWeAre) return;
    if (!scrollArrow) return;
    const whoWeAreTop = whoWeAre.getBoundingClientRect().top;
    const windowHeight = window.innerHeight;

    const newIsScrolledDown = whoWeAreTop < windowHeight * 0.5;

    if (newIsScrolledDown !== isScrolledDown) {
      isScrolledDown = newIsScrolledDown;
      scrollArrow.classList.toggle("scrolled-down", isScrolledDown);
    }
  }

  function ease(t: number, b: number, c: number, d: number) {
    t /= d / 2;
    if (t < 1) return (c / 2) * t * t + b;
    t--;
    return (-c / 2) * (t * (t - 2) - 1) + b;
  }

  function smoothScrollTo(targetPosition: number) {
    const startPosition = window.pageYOffset;
    const distance = targetPosition - startPosition;
    const duration = 1200;
    let start: number | null = null;

    function animation(currentTime: number) {
      if (start === null) start = currentTime;
      const timeElapsed = currentTime - start;
      const run = ease(timeElapsed, startPosition, distance, duration);
      window.scrollTo(0, run);
      if (timeElapsed < duration) requestAnimationFrame(animation);
    }

    requestAnimationFrame(animation);
  }

  scrollDivider.addEventListener("click", () => {
    const targetPosition = isScrolledDown ? 0 : (whoWeAre?.offsetTop ?? 0);
    smoothScrollTo(targetPosition);
  });

  window.addEventListener("scroll", updateArrowDirection, { passive: true });

  updateArrowDirection();
}
