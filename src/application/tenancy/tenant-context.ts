import { createHmac, randomUUID, timingSafeEqual } from "crypto";

export const PLATFORM_TENANT_ID = "platform";

const LEGACY_PLATFORM_TENANT_ID = "default";
const TENANT_ID_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;
const CONTEXT_MARKER = Symbol("kaxi.tenant-context");

export type TenantContextSource =
  | "authenticated-organization"
  | "signed-channel-claim"
  | "signed-worker-claim"
  | "platform-operator"
  | "platform-service"
  | "platform-anonymous-session";

export interface TenantContext {
  readonly tenantId: string;
  readonly principalId: string;
  readonly source: TenantContextSource;
  readonly issuedAt: number;
  readonly [CONTEXT_MARKER]: true;
}

export interface SignedTenantClaims {
  version: 1;
  tenantId: string;
  audience: "n8n" | "worker";
  subject: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
}

function signingSecret(env: NodeJS.ProcessEnv): string {
  const value = env.TENANT_CONTEXT_SIGNING_SECRET?.trim() || "";
  if (value.length < 32 || /^(replace-with-|change_me)/i.test(value)) {
    throw new Error("TENANT_CONTEXT_SIGNING_SECRET_NOT_CONFIGURED");
  }
  return value;
}

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function normalizeTenantId(value: unknown): string {
  const tenantId = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!TENANT_ID_PATTERN.test(tenantId)) throw new Error("TENANT_ID_INVALID");
  return tenantId;
}

/** Compatibility is deliberately isolated here; new writes always use platform. */
export function resolveLegacyPlatformTenantId(value: unknown): string {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!normalized || normalized === LEGACY_PLATFORM_TENANT_ID || normalized === PLATFORM_TENANT_ID) {
    return PLATFORM_TENANT_ID;
  }
  return normalizeTenantId(normalized);
}

function context(input: Omit<TenantContext, typeof CONTEXT_MARKER>): TenantContext {
  return Object.freeze({
    ...input,
    tenantId: normalizeTenantId(input.tenantId),
    [CONTEXT_MARKER]: true as const,
  });
}

export function platformServiceTenantContext(service: string, now = Date.now()): TenantContext {
  const principalId = service.trim();
  if (!principalId) throw new Error("TENANT_PRINCIPAL_REQUIRED");
  return context({ tenantId: PLATFORM_TENANT_ID, principalId, source: "platform-service", issuedAt: now });
}

export function platformAnonymousTenantContext(sessionId: string, now = Date.now()): TenantContext {
  const principalId = sessionId.trim();
  if (!principalId) throw new Error("TENANT_PRINCIPAL_REQUIRED");
  return context({
    tenantId: PLATFORM_TENANT_ID,
    principalId,
    source: "platform-anonymous-session",
    issuedAt: now,
  });
}

/**
 * Cross-tenant operational authority. Delivery code may call this only after
 * authenticating a PLATFORM_ADMIN owner; the distinct source keeps audit and
 * repository policy from confusing operator access with customer access.
 */
export function platformOperatorTenantContext(input: {
  tenantId: string;
  actor: string;
  authorized: true;
  now?: number;
}): TenantContext {
  if (input.authorized !== true || !input.actor.trim()) throw new Error("PLATFORM_OPERATOR_AUTHORITY_REQUIRED");
  return context({
    tenantId: input.tenantId,
    principalId: `platform-operator:${input.actor.trim()}`,
    source: "platform-operator",
    issuedAt: input.now ?? Date.now(),
  });
}

export function tenantContextFromOrganizationAssignment(input: {
  tenantId: string;
  userId: string;
  organizationId: string;
  now?: number;
}): TenantContext {
  if (!input.userId.trim() || !input.organizationId.trim()) throw new Error("TENANT_ASSIGNMENT_INVALID");
  return context({
    tenantId: input.tenantId,
    principalId: `user:${input.userId}:organization:${input.organizationId}`,
    source: "authenticated-organization",
    issuedAt: input.now ?? Date.now(),
  });
}

export function tenantContextFromVerifiedChannelPayload(input: {
  tenantId: unknown;
  purpose: string;
  nonce: string;
  verified: true;
  now?: number;
}): TenantContext {
  if (input.verified !== true || !input.purpose.trim() || !input.nonce.trim()) {
    throw new Error("SIGNED_TENANT_CLAIM_INVALID");
  }
  return context({
    tenantId: resolveLegacyPlatformTenantId(input.tenantId),
    principalId: `${input.purpose}:${input.nonce}`,
    source: "signed-channel-claim",
    issuedAt: input.now ?? Date.now(),
  });
}

export function assertTenantContext(value: unknown): asserts value is TenantContext {
  if (!value || typeof value !== "object" || (value as TenantContext)[CONTEXT_MARKER] !== true) {
    throw new Error("TENANT_CONTEXT_REQUIRED");
  }
  normalizeTenantId((value as TenantContext).tenantId);
  if (!(value as TenantContext).principalId.trim()) throw new Error("TENANT_PRINCIPAL_REQUIRED");
}

export function signTenantClaim(
  tenantContext: TenantContext,
  input: { audience: SignedTenantClaims["audience"]; subject: string; ttlMs?: number; now?: number },
  env: NodeJS.ProcessEnv,
): string {
  assertTenantContext(tenantContext);
  const now = input.now ?? Date.now();
  const subject = input.subject.trim();
  if (!subject) throw new Error("SIGNED_TENANT_CLAIM_SUBJECT_REQUIRED");
  const claims: SignedTenantClaims = {
    version: 1,
    tenantId: tenantContext.tenantId,
    audience: input.audience,
    subject,
    issuedAt: now,
    expiresAt: now + Math.min(Math.max(input.ttlMs ?? 24 * 60 * 60_000, 60_000), 7 * 24 * 60 * 60_000),
    nonce: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const signature = createHmac("sha256", signingSecret(env)).update(`kaxi-tenant-claim\n${encoded}`).digest("hex");
  return `v1.${encoded}.${signature}`;
}

export function verifyTenantClaim(
  token: string,
  input: { audience: SignedTenantClaims["audience"]; subject?: string; now?: number },
  env: NodeJS.ProcessEnv,
): TenantContext {
  const [version, encoded, signature, ...rest] = token.split(".");
  if (rest.length || version !== "v1" || !encoded || !/^[a-f0-9]{64}$/i.test(signature || "")) {
    throw new Error("SIGNED_TENANT_CLAIM_INVALID");
  }
  const expected = createHmac("sha256", signingSecret(env)).update(`kaxi-tenant-claim\n${encoded}`).digest("hex");
  if (!safeEqual(signature.toLowerCase(), expected)) throw new Error("SIGNED_TENANT_CLAIM_INVALID");
  let claims: SignedTenantClaims;
  try {
    claims = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedTenantClaims;
  } catch {
    throw new Error("SIGNED_TENANT_CLAIM_INVALID");
  }
  const now = input.now ?? Date.now();
  if (
    claims.version !== 1
    || claims.audience !== input.audience
    || (input.subject && claims.subject !== input.subject)
    || !Number.isSafeInteger(claims.issuedAt)
    || !Number.isSafeInteger(claims.expiresAt)
    || claims.issuedAt > now + 30_000
    || claims.expiresAt <= now
    || claims.expiresAt - claims.issuedAt > 7 * 24 * 60 * 60_000
    || !/^[0-9a-f-]{36}$/i.test(claims.nonce || "")
  ) {
    throw new Error("SIGNED_TENANT_CLAIM_INVALID");
  }
  return context({
    tenantId: claims.tenantId,
    principalId: claims.subject,
    source: input.audience === "worker" ? "signed-worker-claim" : "signed-channel-claim",
    issuedAt: claims.issuedAt,
  });
}

export function assertSameTenant(tenantContext: TenantContext, rowTenantId: unknown): void {
  assertTenantContext(tenantContext);
  if (tenantContext.tenantId !== normalizeTenantId(rowTenantId)) throw new Error("TENANT_ACCESS_DENIED");
}
