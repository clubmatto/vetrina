const https = require("https");
const fs = require("fs");
const path = require("path");

function generateFilename(prompt, index = 0) {
  const base = prompt
    .toLowerCase()
    .split(/\s+/)
    .join("-")
    .replace(/[^a-z0-9-]/g, "");
  const truncated = base.length > 50 ? base.slice(0, 50) : base;
  const ext = ".jpeg";
  const suffix = index > 0 ? `-${index}` : "";

  if (!fs.existsSync(truncated + suffix + ext)) {
    return truncated + suffix + ext;
  }

  for (let i = 1; ; i++) {
    const name = `${truncated}-${i}`;
    if (!fs.existsSync(name + ext)) {
      return name + ext;
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "";
  let outputDir = "";
  let options = {
    aspectRatio: "16:9",
    width: null,
    height: null,
    seed: null,
    n: 1,
    promptOptimizer: false,
  };

  for (const arg of args) {
    if (arg.startsWith("--aspect-ratio=")) {
      options.aspectRatio = arg.split("=")[1];
    } else if (arg.startsWith("--width=")) {
      options.width = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--height=")) {
      options.height = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--seed=")) {
      options.seed = parseInt(arg.split("=")[1], 10);
    } else if (arg.startsWith("--n=")) {
      options.n = parseInt(arg.split("=")[1], 10);
    } else if (arg === "--prompt-optimizer") {
      options.promptOptimizer = true;
    } else if (arg.startsWith("--output-dir=")) {
      outputDir = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error(
      "usage: generate.js <prompt> --output-dir=<path> [--aspect-ratio=16:9] [--width=1024] [--height=1024] [--seed=<number>] [--n=1] [--prompt-optimizer]",
    );
    process.exit(1);
  }

  if (!outputDir) {
    console.error(
      "usage: generate.js <prompt> --output-dir=<path> [--aspect-ratio=16:9] [--width=1024] [--height=1024] [--seed=<number>] [--n=1] [--prompt-optimizer]",
    );
    console.error("error: --output-dir is required");
    process.exit(1);
  }

  return { prompt, outputDir, options };
}

function buildPayload(prompt, options) {
  const payload = {
    model: "image-01",
    prompt,
    response_format: "base64",
    n: options.n,
    prompt_optimizer: options.promptOptimizer,
  };

  if (options.width && options.height) {
    payload.width = options.width;
    payload.height = options.height;
  } else {
    payload.aspect_ratio = options.aspectRatio;
  }

  if (options.seed !== null) {
    payload.seed = options.seed;
  }

  return payload;
}

function main() {
  const { prompt, outputDir, options } = parseArgs();

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    console.error("MINIMAX_API_KEY not set");
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const payload = JSON.stringify(buildPayload(prompt, options));

  const req = https.request(
    {
      hostname: "api.minimax.io",
      port: 443,
      path: "/v1/image_generation",
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    },
    (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          console.error(
            `request failed with status ${res.statusCode}: ${body}`,
          );
          process.exit(1);
        });
        return;
      }

      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        const result = JSON.parse(body);
        const images = result.data?.image_base64 || [];

        for (let i = 0; i < images.length; i++) {
          const decoded = Buffer.from(images[i], "base64");
          const filename = generateFilename(prompt, i);
          const outputPath = path.join(outputDir, filename);
          fs.writeFileSync(outputPath, decoded);
        }
      });
    },
  );

  req.on("error", (err) => {
    console.error(`request failed: ${err}`);
    process.exit(1);
  });

  req.write(payload);
  req.end();
}

main();
