#!/usr/bin/env node
import { Command } from "commander";
import { sync } from "./cmd/sync";
import { readFileSync } from "fs";
import { join } from "path";

const version = JSON.parse(
  readFileSync(join(__dirname, "..", "..", "package.json"), "utf-8"),
).version;

const program = new Command();

program
  .name("@clubmatto/ai-kit")
  .description("The AI configuration CLI from Club Matto")
  .version(version)
  .option("--skip-opencode", "Skip installing opencode.json to project root");

program
  .command("sync")
  .description("Initialize or update AI configuration")
  .option("--all-rules", "Install all language rules regardless of detection")
  .option("--monorepo", "Force treat project as monorepo")
  .option("--single-repo", "Force treat project as single repository")
  .option(
    "--languages <languages>",
    "Specify languages to install rules for (comma-separated)",
  )
  .action((cmdOptions) => {
    const options = { ...program.opts(), ...cmdOptions };

    if (options.languages && typeof options.languages === "string") {
      options.languages = options.languages
        .split(",")
        .map((lang: string) => lang.trim());
    }

    sync(process.cwd(), version, options);
  });

program.parse();
