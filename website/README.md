# Club Matto Website

A static website built with [Eleventy](https://www.11ty.dev/) using Liquid templating, TypeScript configuration, and a modern build pipeline with PostCSS and ESBuild.

## 🚀 Quick Start

### Install Dependencies

```bash
npm install
```

### Build Static Site

```bash
npm run build
```

### Develop with Live Reload

```bash
npm run dev
```

The development server will be available at http://localhost:8080/

## 📁 Project Structure

```
website/
├── src/                    # Source files
│   ├── _includes/         # Reusable partials (navigation, footer, theme toggle, etc.)
│   ├── _layouts/          # Page layout templates
│   ├── _collections/      # Custom collection definitions
│   ├── _filters/          # Custom Liquid filters
│   ├── _shortcodes/       # Custom shortcodes (Lucide icons, SVG)
│   ├── assets/            # Static assets (CSS, JS, images, SVGs)
│   └── *.liquid           # Page templates (index, writing, products, contact)
├── scripts/               # Build scripts (CSS, JS, manifest processing)
├── _site/                 # Built site (generated, ignored in git)
├── eleventy.config.ts     # Eleventy configuration (TypeScript)
├── package.json           # Dependencies and npm scripts
└── README.md              # This file
```

### Key Files

| Path                       | Purpose                                            |
| -------------------------- | -------------------------------------------------- |
| `src/_layouts/base.liquid` | Main layout template                               |
| `src/index.liquid`         | Home page                                          |
| `src/writing.liquid`       | Writing page                                       |
| `src/products.liquid`      | Products page                                      |
| `src/contact.liquid`       | Contact page                                       |
| `src/assets/css/main.css`  | Global styles (processed with PostCSS + imports)   |
| `src/assets/js/main.js`    | JavaScript entry point (bundled with ESBuild)      |
| `eleventy.config.ts`       | Build configuration with custom filters/shortcodes |
| `scripts/css.ts`           | CSS processing with PostCSS                        |
| `scripts/js.ts`            | JavaScript bundling with ESBuild                   |
| `scripts/manifest.ts`      | Manifest file generation                           |

### Conventions

- **Templating**: Liquid (`.liquid`) with Eleventy.
- **Styling**: CSS with PostCSS and `postcss-import` for modular imports.
- **JavaScript**: ES modules bundled and minified with ESBuild.
- **Configuration**: TypeScript (`eleventy.config.ts`) with type safety.
- **Static assets**: Selective passthrough copy for images and specific SVG files.
- **Icons**: Lucide icons via custom shortcode using `lucide-static`.
- **Module system**: ES modules (`"type": "module"` in package.json).

### Useful Commands

| Command             | Description                                |
| ------------------- | ------------------------------------------ |
| `npm install`       | Install dependencies                       |
| `npm run build`     | Build production site (clean + full build) |
| `npm run dev`       | Start dev server with live reload          |
| `npm run clean`     | Remove `_site` directory                   |
| `npm run lint`      | Run type checking and prettier validation  |
| `npm run typecheck` | Run TypeScript type checking               |

## 🔧 Configuration

### Eleventy (`eleventy.config.ts`)

- Uses TypeScript configuration with proper typing.
- Custom filters: `eq` (equality), `formatDate`, `safe`.
- Custom shortcodes: `lucide` (for Lucide icons), `svg` (for inline SVGs).
- Collections: `posts`, `postsByYear` for blog post organization.
- Global data: `today` (current date).
- Passthrough copies: specific image directory and logo SVG files.
- Liquid as the primary template engine for both pages and markdown.

### Package.json (`package.json`)

- **Scripts**: `build`, `dev`, `clean`, `lint`, `typecheck`, `prettier:*`.
- **Dependencies**: Eleventy v3, `@11ty/eleventy-img`, `@11ty/eleventy-plugin-syntaxhighlight`, `lucide-static`, `esbuild`, `postcss`, `postcss-import`, `tsx`.
- **Type**: `module` (ES modules).
- **Main**: `src/assets/js/main.js` (JavaScript entry point).

### Build Pipeline

The build process involves multiple steps:

1. **CSS**: Processed through PostCSS with `postcss-import` for modular CSS architecture
2. **JavaScript**: Bundled and minified using ESBuild for production
3. **Manifest**: Generated dynamically for asset tracking
4. **Eleventy**: Processes Liquid templates with custom filters and shortcodes
5. **Assets**: Images and specific SVG files are copied directly to output

## 📝 Notes

- The built site is output to `_site/` (ignored by git).
- No CI/CD configuration is present in this subdirectory; see monorepo root for CircleCI and Spacelift configs.
- This is a static site – no database, API, or server-side logic.
- Development uses incremental builds for faster iteration.
- Code formatting enforced with Prettier and `@shopify/prettier-plugin-liquid`.

---

## 🎬 VHS Demo Videos

Terminal demo videos are generated with [VHS](https://github.com/charmbracelet/vhs) and stored in `../assets/vhs/fakedata/` as MP4 files. They're passthrough-copied during build and rendered as `<video autoplay loop muted playsinline>` in Liquid pages.

### OG Image / Link Previews

`og:image` doesn't support MP4. For now, a static PNG thumbnail is extracted from the demo video for social previews:

```bash
ffmpeg -y -i basic-light.mp4 -vframes 1 -update 1 basic-light.png
```

This is a manual step — the PNG lives alongside the MP4 in `../assets/vhs/fakedata/`.

**Potential improvement**: Generate the PNG automatically in `generate.sh`, or use a GIF (which `og:image` supports with animation on some platforms). The trade-off is encoding time vs. preview quality.

_Last updated: 2026-06-22_
