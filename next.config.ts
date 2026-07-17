import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const codexCliTrace = [
  "./node_modules/@openai/codex/bin/codex.js",
];

const onnxRuntimeNodeTrace = [
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
];

// pdf-parse drives pdfjs-dist, which loads CJK CMap tables and standard font
// data from package-relative paths at runtime. Path-based asset loads are
// invisible to output file tracing, so without these includes Korean court
// PDFs extract to 0 chars in production ("Official source body too short").
// @napi-rs/canvas is pdf-parse's native peer; include the linux builds the
// Vercel runtime needs (same pattern as onnxruntime-node above).
// The narrow cmaps/standard_fonts include was not enough: pdf-parse also
// path-loads its bundled pdf.worker.mjs (its own cmap/worker defaults are
// commented out upstream), and pdfjs-dist path-loads worker/build files, so
// both packages must ship whole (~80MB total, within the function limit).
const pdfExtractionTrace = [
  "./node_modules/pdf-parse/**/*",
  "./node_modules/pdfjs-dist/**/*",
  "./node_modules/@napi-rs/canvas/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-gnu/**/*",
  "./node_modules/@napi-rs/canvas-linux-x64-musl/**/*",
  "./node_modules/@napi-rs/canvas-linux-arm64-gnu/**/*",
  "./node_modules/@napi-rs/canvas-linux-arm64-musl/**/*",
];

const deploymentCacheTraceExcludes = [
  ".env",
  ".env.*",
  "data/model-cache/**/*",
  "runtime-artifacts/model-cache/**/*",
  "node_modules/@openai/codex-linux-*",
  "node_modules/@openai/codex-linux-*/**/*",
];

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingExcludes: {
    "*": deploymentCacheTraceExcludes,
  },
  outputFileTracingIncludes: {
    "/api/ai/agent": [...codexCliTrace, ...onnxRuntimeNodeTrace],
    "/api/ai/chat": onnxRuntimeNodeTrace,
    "/api/ai/consult": onnxRuntimeNodeTrace,
    "/api/codex/exec": codexCliTrace,
    "/api/knowledge/monitor": pdfExtractionTrace,
    "/api/synonyms/suggest": onnxRuntimeNodeTrace,
  },
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-web", "pdf-parse"],
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai", "127.0.0.1", "localhost"],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
