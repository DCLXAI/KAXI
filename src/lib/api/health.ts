import { publicBuildEnvironment, deploymentBuildEnvironment } from "@/infrastructure/config/build-environment";
import { runtimeEnvironment } from "@/infrastructure/config/runtime-environment";
import packageJson from "../../../package.json";

export function getHealthPayload() {
  return {
    name: "KARXY API",
    status: "ok",
    version: packageJson.version,
    commit: deploymentBuildEnvironment().VERCEL_GIT_COMMIT_SHA || publicBuildEnvironment().NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA || null,
    environment: runtimeEnvironment().VERCEL_ENV || runtimeEnvironment().NODE_ENV || "development",
    checkedAt: new Date().toISOString(),
  };
}
