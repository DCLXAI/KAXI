import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const isVercelBuild = process.env.VERCEL === "1";

const codexCliTrace = [
  "./node_modules/@openai/codex/bin/codex.js",
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
  ...(isVercelBuild ? {} : { output: "standalone" as const }),
  outputFileTracingExcludes: {
    "*": deploymentCacheTraceExcludes,
  },
  outputFileTracingIncludes: {
    "/api/ai/agent": codexCliTrace,
    "/api/codex/exec": codexCliTrace,
  },
  turbopack: {
    root: process.cwd(),
  },
  reactStrictMode: true,
  devIndicators: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai", "127.0.0.1", "localhost"],
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);
