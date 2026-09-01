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

  # Create wrapper at a fixed path so VHS tapes can reference it by absolute path
  local wrapper_dir="/tmp/ai-kit/bin"
  mkdir -p "$wrapper_dir"
  cat > "$wrapper_dir/ai-kit" << WRAPPER
#!/usr/bin/env bash
exec node "$AI_KIT_SRC_DIR/dist/src/index.js" "\$@"
WRAPPER
  chmod +x "$wrapper_dir/ai-kit"
  echo "  -> ai-kit wrapper created at $wrapper_dir/ai-kit"
}

before_each() {
  local project_dir="$1"
  local demo="$2"
  local theme="$3"

  local demo_dir="$AI_KIT_DEMO_DIR/$demo"
  rm -rf "$demo_dir"
  mkdir -p "$demo_dir"

  case "$demo" in
    basic)
      cat > "$demo_dir/package.json" <<<'{"name":"basic-project"}'
      cat > "$demo_dir/index.ts" <<<'console.log("hello from basic");'
      ;;
    use-case-languages)
      cat > "$demo_dir/package.json" <<<'{"name":"monorepo-project"}'
      cat > "$demo_dir/go.mod" <<<'module example'
      cat > "$demo_dir/main.go" <<<'package main'
      cat > "$demo_dir/build.gradle.kts" <<<''
      cat > "$demo_dir/App.kt" <<<'fun main() {}'
      ;;
    use-case-options)
      cat > "$demo_dir/package.json" <<<'{"name":"options-project"}'
      cat > "$demo_dir/index.ts" <<<'console.log("hello from options");'
      ;;
    use-case-skills)
      cat > "$demo_dir/package.json" <<<'{"name":"skills-project"}'
      cat > "$demo_dir/index.ts" <<<'console.log("hello from skills");'
      ;;
    use-case-smart-updates)
      cat > "$demo_dir/package.json" <<<'{"name":"smart-updates-project"}'
      cat > "$demo_dir/index.ts" <<<'console.log("hello from smart-updates");'
      ;;
    use-case-writing)
      cat > "$demo_dir/package.json" <<<'{"name":"writing-project"}'
      ;;
  esac
}

cleanup() {
  echo "Cleaning up ai-kit demo directories..."
  rm -rf "$AI_KIT_DEMO_DIR"
  rm -f /tmp/ai-kit/bin/ai-kit
}
