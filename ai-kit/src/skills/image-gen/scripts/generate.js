const https = require("https");
const fs = require("fs");

function parseArgs() {
  const args = process.argv.slice(2);
  let prompt = "";
  let aspectRatio = "16:9";
  let outputPath = "";

  for (const arg of args) {
    if (arg.startsWith("--aspect-ratio=")) {
      aspectRatio = arg.split("=")[1];
    } else if (arg.startsWith("--output=")) {
      outputPath = arg.split("=")[1];
    } else if (!arg.startsWith("--")) {
      prompt = arg;
    }
  }

  if (!prompt) {
    console.error(
      "usage: generate.js <prompt> --output=<path> [--aspect-ratio=16:9]",
    );
    process.exit(1);
  }

  if (!outputPath) {
    console.error(
      "usage: generate.js <prompt> --output=<path> [--aspect-ratio=16:9]",
    );
    console.error("error: --output is required");
    process.exit(1);
  }

  return { prompt, aspectRatio, outputPath };
}

function main() {
  const { prompt, aspectRatio, outputPath } = parseArgs();

  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    console.error("MINIMAX_API_KEY not set");
    process.exit(1);
  }

  const payload = JSON.stringify({
    model: "image-01",
    prompt,
    aspect_ratio: aspectRatio,
    response_format: "base64",
  });

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
        const decoded = Buffer.from(images[0], "base64");
        fs.writeFileSync(outputPath, decoded);
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
