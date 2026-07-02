import type { NextConfig } from "next";

const DEFAULT_AUTH_URL = "https://kaxi.vercel.app";

function normalizePublicUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    return url.origin;
  } catch {
    return null;
  }
}

const nextAuthUrl =
  normalizePublicUrl(process.env.NEXTAUTH_URL) ||
  normalizePublicUrl(process.env.NEXTAUTH_URL_INTERNAL) ||
  normalizePublicUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
  normalizePublicUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
  normalizePublicUrl(process.env.VERCEL_URL) ||
  DEFAULT_AUTH_URL;

process.env.NEXTAUTH_URL = nextAuthUrl;
process.env.NEXTAUTH_URL_INTERNAL = normalizePublicUrl(process.env.NEXTAUTH_URL_INTERNAL) || nextAuthUrl;

const codexCliTrace = [
  "./node_modules/@openai/codex/bin/codex.js",
  "./node_modules/@openai/codex-linux-x64/**/*",
  "./node_modules/@openai/codex-linux-arm64/**/*",
];

const onnxRuntimeNodeTrace = [
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/x64/**/*",
  "./node_modules/onnxruntime-node/bin/napi-v3/linux/arm64/**/*",
];

const deploymentCacheTraceExcludes = [
  "data/model-cache/**/*",
  "runtime-artifacts/model-cache/**/*",
];

const nextConfig: NextConfig = {
  env: {
    NEXTAUTH_URL: nextAuthUrl,
    NEXTAUTH_URL_INTERNAL: normalizePublicUrl(process.env.NEXTAUTH_URL_INTERNAL) || nextAuthUrl,
  },
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
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-web"],
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai", "127.0.0.1", "localhost"],
};

export default nextConfig;
