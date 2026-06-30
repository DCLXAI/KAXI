import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingIncludes: {
    "/api/ai/agent": [
      "./node_modules/@openai/codex/bin/codex.js",
      "./node_modules/@openai/codex-linux-x64/**/*",
      "./node_modules/@openai/codex-linux-arm64/**/*",
    ],
    "/api/codex/exec": [
      "./node_modules/@openai/codex/bin/codex.js",
      "./node_modules/@openai/codex-linux-x64/**/*",
      "./node_modules/@openai/codex-linux-arm64/**/*",
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-web"],
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai"],
};

export default nextConfig;
