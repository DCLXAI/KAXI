import { bearerToken, matchesRotatingSecret, primarySecret } from "@/lib/security/rotating-secret";

export const TYPEBOT_GATEWAY_HEADER = "x-kaxi-typebot-token";

function configuredSecret(env: NodeJS.ProcessEnv = process.env) {
  return primarySecret(env, "TYPEBOT_GATEWAY_SECRET");
}

export function isTypebotGatewayAuthConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(configuredSecret(env));
}

export function verifyTypebotGatewayHeaders(
  headers: Pick<Headers, "get">,
  env: NodeJS.ProcessEnv = process.env,
) {
  if (!configuredSecret(env)) return false;

  const direct = headers.get(TYPEBOT_GATEWAY_HEADER)?.trim() || "";
  const provided = direct || bearerToken(headers);
  return matchesRotatingSecret(provided, env, "TYPEBOT_GATEWAY_SECRET");
}
