import type { NextConfig } from "next";

const codexCliTrace = [
  "./node_modules/@openai/codex/bin/codex.js",
  "./node_modules/@openai/codex-linux-x64/**/*",
  "./node_modules/@openai/codex-linux-arm64/**/*",
];

const onnxRuntimeNodeTrace = [
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
];

const nextConfig: NextConfig = {
  output: "standalone",
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
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-web"],
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai", "127.0.0.1", "localhost"],
};

export default nextConfig;
