import icons from "lucide-static/icon-nodes.json" with { type: "json" };

const DEFAULT_OPTIONS = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  class: "lucide-icon",
};

function attrsToString(attrs) {
  return Object.keys(attrs)
    .map((key) => `${key}="${attrs[key]}"`)
    .join(" ");
}

function createSvg(icon) {
  return icon.map((path) => {
    const name = path[0];
    const values = path[1];
    return `<${name} ${attrsToString(values)} />`;
  });
}

function filterOptions(options) {
  const filteredOptions = { ...options };

  const eleventyProps = [
    "hash",
    "data",
    "loc",
    "lookupProperty",
    "name",
    "_internalProtoAccess",
  ];

  eleventyProps.forEach((prop) => delete filteredOptions[prop]);

  for (const key of Object.keys(filteredOptions)) {
    const val = filteredOptions[key];
    if (
      typeof val === "function" ||
      (typeof val === "object" && val !== null)
    ) {
      delete filteredOptions[key];
    }
  }

  return filteredOptions;
}

function validateIconName(iconName) {
  if (!iconName) {
    throw new Error(`[lucide] the iconName must be specified`);
  }

  const safeIconName = iconName.toLowerCase();
  if (!icons[safeIconName]) {
    throw new Error(`[lucide] the iconName is not correct`);
  }

  return safeIconName;
}

// Main shortcode function
export function lucideShortcode(iconName, options = {}) {
  const safeIconName = validateIconName(iconName);
  const filteredOptions = filterOptions(options);

  const newOptions = {
    width: options.size || options.width || DEFAULT_OPTIONS.width,
    height: options.size || options.height || DEFAULT_OPTIONS.height,
    ...filteredOptions,
  };
  delete newOptions.size;
  const svgProps = { ...DEFAULT_OPTIONS, ...newOptions };

  const svgContent = createSvg(icons[safeIconName]);
  return `<svg ${attrsToString(svgProps)}>${svgContent.join("")}</svg>`;
}

// For convenience, also export a function that adds the shortcode to eleventyConfig
export default function (eleventyConfig) {
  eleventyConfig.addShortcode("lucide", lucideShortcode);
}
