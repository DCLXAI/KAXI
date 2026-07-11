import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const codexCliTrace = [
  "./node_modules/@openai/codex/bin/codex.js",
];

const onnxRuntimeNodeTrace = [
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
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
