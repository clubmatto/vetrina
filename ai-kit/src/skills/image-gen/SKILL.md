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
node scripts/generate.js "a blue sky with clouds" --output=output/image.jpeg

node scripts/generate.js "a warm sunset" --output=output/sunset.jpeg --aspect-ratio=16:9

node scripts/generate.js "a solid red background" --output=output/red.jpeg --aspect-ratio=1:1
```

## Arguments

| Argument          | Required | Description                                            |
| ----------------- | -------- | ------------------------------------------------------ |
| `prompt`          | Yes      | Text description of the image to generate              |
| `--output=<path>` | Yes      | Output file path for the generated image               |
| `--aspect-ratio`  | No       | Aspect ratio (default: 16:9, options: 16:9, 1:1, 9:16) |
