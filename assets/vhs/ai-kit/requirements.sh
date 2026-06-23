#!/usr/bin/env bash
set -euo pipefail

AI_KIT_DEMO_DIR="/tmp/ai-kit"
AI_KIT_SRC_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../ai-kit" && pwd)"

setup() {
  local project_dir="$1"
  shift
  local demos=("$@")

  # Build ai-kit CLI
  echo "Building ai-kit..."
  (cd "$AI_KIT_SRC_DIR" && npm run build)
  echo "  -> ai-kit built"

  # Create wrapper so ai-kit is on PATH in VHS terminal sessions
  local wrapper_dir="$project_dir/bin"
  mkdir -p "$wrapper_dir"
  cat > "$wrapper_dir/ai-kit" << WRAPPER
#!/usr/bin/env bash
exec node "$AI_KIT_SRC_DIR/dist/src/index.js" "\$@"
WRAPPER
  chmod +x "$wrapper_dir/ai-kit"
  export PATH="$wrapper_dir:$PATH"
  echo "  -> ai-kit wrapper created at $wrapper_dir/ai-kit"

  # Create temp project directories for each demo
  for demo in "${demos[@]}"; do
    local demo_dir="$AI_KIT_DEMO_DIR/$demo"
    mkdir -p "$demo_dir"

    case "$demo" in
      basic)
        cat > "$demo_dir/package.json" <<<'{"name":"basic-project"}'
        cat > "$demo_dir/index.ts" <<<'console.log("hello from basic");'
        echo "  -> Setup $demo_dir (TypeScript project)"
        ;;
      use-case-languages)
        cat > "$demo_dir/package.json" <<<'{"name":"monorepo-project"}'
        cat > "$demo_dir/go.mod" <<<'module example'
        cat > "$demo_dir/main.go" <<<'package main'
        cat > "$demo_dir/build.gradle.kts" <<<''
        cat > "$demo_dir/App.kt" <<<'fun main() {}'
        echo "  -> Setup $demo_dir (TypeScript + Go + Kotlin monorepo)"
        ;;
      use-case-options)
        cat > "$demo_dir/package.json" <<<'{"name":"options-project"}'
        cat > "$demo_dir/index.ts" <<<'console.log("hello from options");'
        echo "  -> Setup $demo_dir (TypeScript project)"
        ;;
      use-case-quickstart)
        cat > "$demo_dir/package.json" <<<'{"name":"quickstart-project"}'
        cat > "$demo_dir/index.ts" <<<'console.log("hello from quickstart");'
        echo "  -> Setup $demo_dir (TypeScript project)"
        ;;
      use-case-skills)
        cat > "$demo_dir/package.json" <<<'{"name":"skills-project"}'
        cat > "$demo_dir/index.ts" <<<'console.log("hello from skills");'
        echo "  -> Setup $demo_dir (TypeScript project)"
        ;;
    esac
  done
}

cleanup() {
  echo "Cleaning up ai-kit demo directories..."
  rm -rf "$AI_KIT_DEMO_DIR"
}
