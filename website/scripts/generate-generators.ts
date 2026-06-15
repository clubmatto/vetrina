import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const repoRoot = path.resolve(process.cwd(), "..");
const fakedataDir = path.join(repoRoot, "fakedata");
const binPath = path.join(fakedataDir, "bin", "fakedata");

if (!fs.existsSync(binPath)) {
  execSync("make build", { cwd: fakedataDir, stdio: "inherit" });
}

const listOutput = execSync(`${binPath} -G`).toString();

const generators: Record<string, { desc: string; samples: string[] }> = {};

for (const line of listOutput.trim().split("\n")) {
  const [namePart, ...descParts] = line.trim().split(/\s+/);
  const name = namePart.replace(/\*$/, "");
  const desc = descParts.join(" ");

  try {
    const out = execSync(`${binPath} -n 10 ${name} 2>/dev/null`, {
      timeout: 5000,
      encoding: "utf-8",
    });
    const samples = out.trim().split("\n").filter(Boolean);
    generators[name] = { desc, samples };
  } catch {
    generators[name] = { desc, samples: [] };
  }
}

const outputPath = path.join(process.cwd(), "src", "_data", "generators.json");
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(generators, null, 2));
