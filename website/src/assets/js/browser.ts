const dataScript = document.getElementById("generators-data");
const generators: Record<string, { desc: string; samples: string[] }> =
  dataScript ? JSON.parse(dataScript.textContent!) : {};

let browserAnimId = 0;

document.addEventListener("alpine:init", () => {
  Alpine.data("browser", () => ({
    query: "",
    generators,
    output: [] as string[],
    lastSelected: null as string | null,
    get matches() {
      const q = this.query.toLowerCase();
      return Object.entries(this.generators).filter(
        ([name, gen]) =>
          name.includes(q) || gen.desc.toLowerCase().includes(q),
      );
    },
    select(name: string, gen: { desc: string; samples: string[] }) {
      this.lastSelected = name;
      this.query = name;
      this.output = [];
      const samples = gen.samples || [];
      const id = ++browserAnimId;
      let i = 0;

      const next = () => {
        if (i >= samples.length || id !== browserAnimId) return;
        this.output = [...this.output, samples[i++]];
        setTimeout(next, 60);
      };

      setTimeout(next, 100);
    },
    init() {
      this.$watch("query", (val: string) => {
        if (this.lastSelected && val !== this.lastSelected) {
          this.lastSelected = null;
        }
      });
    },
  }));
});
