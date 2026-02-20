import {Command} from "commander";
import {sync} from "./commands/sync.js";
import {readFileSync} from "fs";
import {dirname, join} from "path";
import {fileURLToPath} from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(
    readFileSync(join(__dirname, "..", "package.json"), "utf-8"),
).version;

const program = new Command();

program
    .name("ai-kit")
    .description("Distribute AI configuration to your project")
    .version(version)
    .option("--skip-opencode", "Skip installing opencode.json to project root");

program
    .command("sync")
    .description("Initialize or update AI configuration")
    .action(() => sync(process.cwd(), version, program.opts()));

program.parse();
