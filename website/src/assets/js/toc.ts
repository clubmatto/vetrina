const HEADING_SELECTOR = "article.post .post-content h2[id]";

interface TocItem {
  id: string;
  label: string;
}

document.addEventListener("alpine:init", () => {
  Alpine.data("toc", () => ({
    items: [] as TocItem[],
    activeId: "",
    reducedMotion: false,

    init() {
      this.reducedMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      ).matches;

      const headings = Array.from(
        document.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
      );
      this.items = headings.map((heading) => ({
        id: heading.id,
        label: heading.textContent?.trim() ?? "",
      }));

      if (this.items.length < 2) return;

      window.addEventListener("scroll", () => this.updateActive(), {
        passive: true,
      });
      window.addEventListener("resize", () => this.updateActive());
      this.updateActive();
    },

    updateActive() {
      const probeLine = window.scrollY + window.innerHeight * 0.3;
      let current = this.items[0]?.id ?? "";

      for (const item of this.items) {
        const heading = document.getElementById(item.id);
        if (!heading) continue;
        if (heading.getBoundingClientRect().top + window.scrollY <= probeLine) {
          current = item.id;
        }
      }

      // The last section can be too short to ever cross the probe line, so it
      // wins as soon as the page is scrolled to the bottom.
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 4
      ) {
        current = this.items[this.items.length - 1]?.id ?? current;
      }

      this.activeId = current;
    },

    scrollTo(id: string) {
      const heading = document.getElementById(id);
      if (!heading) return;
      heading.scrollIntoView({
        behavior: this.reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    },
  }));
});
