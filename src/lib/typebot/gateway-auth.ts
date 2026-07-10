import { timingSafeEqual } from "crypto";

export const TYPEBOT_GATEWAY_HEADER = "x-kaxi-typebot-token";

function configuredSecret(env: NodeJS.ProcessEnv = process.env) {
  const value = env.TYPEBOT_GATEWAY_SECRET?.trim() || "";
  if (value.length < 32 || /^(replace-with-|change_me)/i.test(value)) return "";
  return value;
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function isTypebotGatewayAuthConfigured(env: NodeJS.ProcessEnv = process.env) {
  return Boolean(configuredSecret(env));
}

export function verifyTypebotGatewayHeaders(
  headers: Pick<Headers, "get">,
  env: NodeJS.ProcessEnv = process.env,
) {
  const expected = configuredSecret(env);
  if (!expected) return false;

  const direct = headers.get(TYPEBOT_GATEWAY_HEADER)?.trim() || "";
  const authorization = headers.get("authorization") || "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim() || "";
  const provided = direct || bearer;
  return Boolean(provided) && safeEqual(provided, expected);
}
