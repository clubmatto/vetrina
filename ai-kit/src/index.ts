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
  .action(() => sync(process.cwd(), version, program.opts()));

program.parse();
