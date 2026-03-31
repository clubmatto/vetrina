---
name: image-gen
description: Generates simple images, placeholders, and backgrounds using MiniMax AI. Use when the user needs to create images from text prompts.
allowed-tools: Bash(image-gen:*)
---

# Image Generation

Generate simple images, placeholders, and backgrounds using MiniMax AI.

## Prerequisites

Requires `MINIMAX_API_KEY` environment variable set with your MiniMax API key.

## Usage

```bash
node scripts/generate.js "a blue sky with clouds" --output-dir=output/

node scripts/generate.js "a warm sunset" --output-dir=output/ --aspect-ratio=16:9

node scripts/generate.js "a solid red background" --output-dir=output/ --aspect-ratio=1:1

node scripts/generate.js "a portrait photo" --output-dir=output/ --width=1024 --height=1024

node scripts/generate.js "a forest" --output-dir=output/ --seed=42 --n=2

node scripts/generate.js "a modern building" --output-dir=output/ --prompt-optimizer
```

## Arguments

| Argument              | Required | Description                                         |
| --------------------- | -------- | --------------------------------------------------- |
| `prompt`              | Yes      | Text description of the image (max 1500 characters) |
| `--output-dir=<path>` | Yes      | Output directory for the generated image            |
| `--aspect-ratio`      | No       | Aspect ratio (default: 16:9)                        |
| `--width=<px>`        | No       | Image width in pixels (512-2048, divisible by 8)    |
| `--height=<px>`       | No       | Image height in pixels (512-2048, divisible by 8)   |
| `--seed=<number>`     | No       | Random seed for reproducible results                |
| `--n=<count>`         | No       | Number of images to generate (1-9, default: 1)      |
| `--prompt-optimizer`  | No       | Enable automatic prompt optimization                |

## Aspect Ratio Options

`1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

## Output

Images are saved to the specified directory with auto-generated filenames based on the prompt. Multiple images get numbered suffixes (e.g., `a-blue-sky.jpeg`, `a-blue-sky-1.jpeg`).
