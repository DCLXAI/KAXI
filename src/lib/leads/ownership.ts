import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { primarySecret, rotatingSecrets } from "@/lib/security/rotating-secret";

// P0-4. createPartnerRequest() used to take leadId straight from the request
// body and write nickname and contact onto whatever lead it named, so an
// unverified id let a caller overwrite a stranger's details and have a consent
// snapshot recorded against their lead. P0-0 contained that by refusing to reuse
// ANY caller-supplied id — correct, but it also broke the legitimate link
// between a user's diagnosis and their partner request.
//
// This restores the link by proving ownership instead of assuming it:
//
//   authenticated  DiagnosisLead.userId === the session user's id
//   anonymous      a signed, HttpOnly lead_access cookie naming that lead
//
// The body's leadId is only ever a lookup hint. Nothing here trusts it.
//
// The cookie is signed with its own secret rather than borrowing
// CHAT_SESSION_SIGNING_SECRET: one secret per purpose means a leak of one does
// not forge the other, and it lets the two rotate independently. If the secret
// is absent the anonymous path simply cannot produce a proof, which degrades to
// exactly the P0-0 behaviour — a fresh anonymous lead — rather than to trusting
// the body. That is deliberate: this must be safe to deploy before the secret
// exists in the environment.
export const LEAD_ACCESS_COOKIE = "kaxi_lead_access";
export const LEAD_ACCESS_SECRET_KEY = "LEAD_ACCESS_SIGNING_SECRET";

// A diagnosis is worth returning to for a while, but an access proof that never
// expires is a bearer token on a shared machine. One week, renewed whenever the
// owner saves a new diagnosis.
export const LEAD_ACCESS_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

type LeadAccessPayload = {
  v: 1;
  leadId: string;
  issuedAt: number;
  expiresAt: number;
  nonce: string;
};

export type LeadOwnershipProof = "session" | "lead_access";

export interface ResolvedLeadOwnership {
  /** The lead the caller demonstrably owns, or null when nothing was proven. */
  leadId: string | null;
  proof: LeadOwnershipProof | null;
  /**
   * Why a proof was not accepted. Never returned to the client — an attacker
   * must not learn whether a lead exists — but recorded in the audit trail.
   */
  reason:
    | "verified"
    | "no_lead_requested"
    | "no_proof_available"
    | "cookie_missing_or_invalid"
    | "cookie_names_other_lead"
    | "not_owned_by_session_user"
    | "lead_not_found";
}

function equal(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isLeadAccessConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(primarySecret(env, LEAD_ACCESS_SECRET_KEY));
}

export function issueLeadAccessToken(leadId: string, now = Date.now(), env: NodeJS.ProcessEnv = process.env): string | null {
  const secret = primarySecret(env, LEAD_ACCESS_SECRET_KEY);
  if (!secret || !leadId) return null;

  const issuedAt = Math.floor(now / 1000);
  const payload: LeadAccessPayload = {
    v: 1,
    leadId,
    issuedAt,
    expiresAt: issuedAt + LEAD_ACCESS_MAX_AGE_SECONDS,
    nonce: randomUUID(),
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = createHmac("sha256", secret).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyLeadAccessToken(
  token: string | undefined | null,
  now = Date.now(),
  env: NodeJS.ProcessEnv = process.env,
): LeadAccessPayload | null {
  const [encoded, signature] = String(token || "").split(".");
  if (!encoded || !signature) return null;

  // Accepts PREVIOUS as well as PRIMARY so a secret rotation does not log every
  // anonymous user out of their own diagnosis mid-window.
  const candidates = rotatingSecrets(env, LEAD_ACCESS_SECRET_KEY);
  if (candidates.length === 0) return null;
  const validSignature = candidates.some((candidate) =>
    equal(signature, createHmac("sha256", candidate as string).update(encoded).digest("base64url")),
  );
  if (!validSignature) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as LeadAccessPayload;
    const nowSeconds = Math.floor(now / 1000);
    if (
      payload.v !== 1 ||
      typeof payload.leadId !== "string" ||
      !payload.leadId ||
      !Number.isInteger(payload.issuedAt) ||
      !Number.isInteger(payload.expiresAt) ||
      // A token claiming to be from the future is forged or from a badly skewed
      // clock; neither is a reason to trust it.
      payload.issuedAt > nowSeconds + 60 ||
      payload.expiresAt <= nowSeconds ||
      // A signed token cannot buy itself a longer life than the policy allows.
      payload.expiresAt - payload.issuedAt > LEAD_ACCESS_MAX_AGE_SECONDS
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export interface LeadOwnershipLookup {
  /** Returns the lead's owning userId, or undefined when no such lead exists. */
  findLeadOwner: (leadId: string) => Promise<{ userId: string | null } | null>;
}

export interface ResolveOwnedLeadInput {
  requestedLeadId?: string | null;
  /** The signed cookie value, if the request carried one. */
  leadAccessToken?: string | null;
  /** The authenticated user's id, or null for an anonymous caller. */
  sessionUserId?: string | null;
  now?: number;
  env?: NodeJS.ProcessEnv;
}

/**
 * Decides whether the caller may act on the lead they named.
 *
 * Returns null rather than throwing, because the caller's correct response to a
 * failed proof is to create a fresh lead — not to error. Telling the client that
 * a lead exists but is not theirs would itself be a disclosure.
 */
export async function resolveOwnedLead(
  lookup: LeadOwnershipLookup,
  input: ResolveOwnedLeadInput,
): Promise<ResolvedLeadOwnership> {
  const requested = String(input.requestedLeadId || "").trim();

  // "anonymous" and "local-*" are the client's own placeholders for "I have no
  // server lead", not ids to look up.
  if (!requested || requested === "anonymous" || requested.startsWith("local-")) {
    return { leadId: null, proof: null, reason: "no_lead_requested" };
  }

  const token = verifyLeadAccessToken(input.leadAccessToken, input.now, input.env);
  const sessionUserId = input.sessionUserId || null;

  if (!sessionUserId && !token) {
    return { leadId: null, proof: null, reason: "no_proof_available" };
  }

  const lead = await lookup.findLeadOwner(requested);
  if (!lead) {
    // Do not distinguish this from a failed proof to the caller. Only the audit
    // trail sees the difference.
    return { leadId: null, proof: null, reason: "lead_not_found" };
  }

  // Session identity wins when present: it is the stronger proof, and it also
  // means a logged-in user cannot be limited by a stale cookie from before they
  // signed in.
  if (sessionUserId) {
    if (lead.userId && lead.userId === sessionUserId) {
      return { leadId: requested, proof: "session", reason: "verified" };
    }
    // An authenticated user holding a valid cookie for an anonymous lead is the
    // ordinary "diagnosed first, signed in after" case, so fall through to the
    // cookie check rather than refusing.
    if (lead.userId) {
      return { leadId: null, proof: null, reason: "not_owned_by_session_user" };
    }
  }

  if (token) {
    if (token.leadId !== requested) {
      return { leadId: null, proof: null, reason: "cookie_names_other_lead" };
    }
    return { leadId: requested, proof: "lead_access", reason: "verified" };
  }

  return { leadId: null, proof: null, reason: "cookie_missing_or_invalid" };
}

export function leadAccessCookieOptions(env: NodeJS.ProcessEnv = process.env) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: LEAD_ACCESS_MAX_AGE_SECONDS,
  };
}
