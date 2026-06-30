import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: ["@xenova/transformers", "onnxruntime-web"],
  reactStrictMode: true,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn", "*.z.ai"],
};

export default nextConfig;
