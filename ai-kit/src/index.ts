#!/usr/bin/env node

import { Command } from 'commander';
import { init } from './commands/init.js';
import { update } from './commands/update.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const version = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')).version;

const program = new Command();

program
  .name('ai-kit')
  .description('Distribute AI configuration to your project')
  .version(version)
  .option('--skip-opencode', 'Skip installing opencode.json to project root');

program
  .command('init')
  .description('First-time setup')
  .action(() => init(process.cwd(), version, program.opts()));

program
  .command('update')
  .description('Sync installed content')
  .action(() => update(process.cwd(), version, program.opts()));

program.parse();
