# TODO

## Move `--skip-opencode` from global to sync subcommand

`--skip-opencode` is defined as a global option on `program` in `src/index.ts:17` but
only has meaning for the `sync` command. It works via `{ ...program.opts(), ...cmdOptions }`
spread in `index.ts:30`, but the UX is confusing — it shows in `--help` as a global flag.

Move it to the sync command's `.option()` call and remove it from the program level.

## Respect `.gitignore` patterns in scanner

The file scanner at `src/detection/scanner.ts:3-10` uses a hardcoded ignore list:

```
const IGNORE_DIRS = ["node_modules", ".git", "dist", "build", "target", ".next", ".nuxt"];
```

This misses common directories like `vendor/`, `.venv`, `__pycache__`, `venv/`, etc.
It also doesn't respect per-project `.gitignore` files.

Use the `gitignore` npm package (or parse `.gitignore` manually) to filter scanned files,
with the hardcoded list as a fallback when no `.gitignore` exists.

## Re-enable Spring Boot Detection

Spring Boot detection was temporarily removed to simplify the codebase. The detection
logic required special handling:

- Config files (`application.properties`, `application.yml`, `application.yaml`) could
  appear in nested directories (e.g., `src/main/resources/`)
- Required both config files AND source files (`.java`, `.kt`) to be present
- Required deeper directory scanning (3 levels vs standard 2)
- Implied Kotlin rules when detected

### What was removed

- `spring-boot` detector from `src/detection/language-detectors.ts`
- Special phase 3 detection logic in `src/detection/detect.ts`
- `findConfigFiles` utility from `src/detection/scanner.ts`

### How to re-enable

1. Add back the `spring-boot` detector to `src/detection/language-detectors.ts` with:
   - `configFiles`: `["application.properties", "application.yml", "application.yaml"]`
   - `extensions`: `[".java", ".kt"]`
   - `scanDepth`: `3`

2. Add back the Spring Boot special handling in `src/detection/detect.ts`:
   - After config file check, verify source files exist at depth ≤ 3
   - If detected, also add `kotlin` (Spring Boot implies Kotlin)
   - Add phase 3: check for nested config files at depth 3 with corresponding source files

3. Add back `findConfigFiles` to `src/detection/scanner.ts` for finding config files
   in nested directories

4. Re-add tests for Spring Boot detection

5. Move the `spring-boot.md` rule file back to `src/rules/`

### Rule file location

The `spring-boot.md` rule files have been moved to `.agents/disabled/`:

- `src/rules/spring-boot.md` → `.agents/disabled/spring-boot.md`
- `tests/fixtures/rules/spring-boot.md` → `.agents/disabled/spring-boot.md`

Both files should be restored when Spring Boot detection is re-enabled.
