# AI Kit CLI Testing Guide

## How We Test the CLI During Development

### Setup

1. **Build the project:**
   ```bash
   npm run build
   ```

2. **Link globally for local testing:**
   ```bash
   npm link
   ```

3. **Now `ai-kit` command is available globally** - runs from your local `dist/` directory.

### Testing Workflow

1. **Create a test project:**
   ```bash
   mkdir -p /tmp/test-ai-kit-project
   cd /tmp/test-ai-kit-project
   ```

2. **Run init:**
   ```bash
   ai-kit init
   ```

3. **Verify output:**
   ```bash
   ls -la
   ls -la .ai/
   cat .ai/.ai-kit
   ```

4. **Test update:**
   - Bump version in `package.json`
   - Rebuild: `npm run build`
   - Run update: `ai-kit update`

### Debugging

- **Run with tsx for faster iteration:**
  ```bash
  npm run dev -- init
  ```

- **Check built output:**
  ```bash
  cat dist/index.js
  ```

### Common Issues

- **"ENOENT: no such file or directory"** - The CLI is looking for `package.json` in the wrong place. Fixed by using `__dirname` to resolve relative to the compiled JS file.

- **Content files not found** - The paths in `content.ts` use `join(__dirname, '..', 'src', 'commands')` because we need to read from source, not dist.

### Test Output Example

```
$ ai-kit init
  Created commands/interview.md
  Created commands/synth.md
  Created rules/go.md
  ...
  Created opencode.json
  Created AGENTS.md

✓ ai-kit initialized
```

### Manifest Structure

```json
{
  "version": "0.0.1",
  "installedAt": "2026-02-20T10:00:00.000Z",
  "rootFiles": [
    "opencode.json"
  ]
}
```
