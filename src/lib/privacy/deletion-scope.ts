import { verifyLeadAccessToken } from "@/lib/leads/ownership";

// P0-1a. POST /api/privacy/delete-request took an unauthenticated leadId,
// contact or question and set deleteRequestedAt on every matching row — and
// deleteRequestedAt is not a label, it is what makes the retention sweep in
// privacy/retention.ts hard-delete chat sessions and their storage attachments.
//
// The question path was the worst of the three: it matched hashPii(question),
// and a question like "비자 연장 서류" is typed by many different people, so one
// anonymous request scheduled unrelated users' records for deletion and withdrew
// their consents. A shared string is not an identity, and no amount of
// verification can make it one, so that path is gone rather than gated.
//
// What replaces it: the set of records to act on is DERIVED from a proof the
// caller presented, never from an identifier they typed. The request body
// cannot widen the scope, because nothing in the body reaches these queries.
export type DeletionProof = "session" | "lead_access";

/**
 * The records a verified requester may act on.
 *
 * Every id here came from a proof, not from the request. That is the whole
 * point of the type: a caller cannot name someone else's lead, because they
 * never name a lead at all.
 */
export interface DeletionSubject {
  proof: DeletionProof;
  userId: string | null;
  leadIds: string[];
  sessionKeys: string[];
}

export interface DeletionSubjectLookup {
  /** Diagnosis leads linked to this account. */
  findLeadIdsForUser: (userId: string) => Promise<string[]>;
  /** Canonical chat sessions linked to this account. */
  findSessionKeysForUser: (userId: string) => Promise<string[]>;
  /** Handoff sessions reachable from these leads. */
  findSessionKeysForLeads: (leadIds: string[]) => Promise<string[]>;
}

export interface ResolveDeletionSubjectInput {
  /** The authenticated user's id, or null for an anonymous caller. */
  sessionUserId?: string | null;
  /**
   * The signed lead_access cookie, if the request carried one. The lead id is
   * read from the verified payload — never from the request body, which is why
   * this takes the raw cookie rather than an id plus a cookie to check it
   * against.
   */
  leadAccessToken?: string | null;
  now?: number;
  env?: NodeJS.ProcessEnv;
}

/**
 * Returns what the caller proved they may delete, or null when they proved
 * nothing.
 *
 * Null is not an error. The endpoint accepts the request either way and returns
 * the same response, because a caller who could tell "verified" from
 * "unverified" by the response could also tell whether a record exists.
 */
export async function resolveDeletionSubject(
  lookup: DeletionSubjectLookup,
  input: ResolveDeletionSubjectInput,
): Promise<DeletionSubject | null> {
  const sessionUserId = input.sessionUserId || null;

  if (sessionUserId) {
    const leadIds = await lookup.findLeadIdsForUser(sessionUserId);
    const [ownSessions, leadSessions] = await Promise.all([
      lookup.findSessionKeysForUser(sessionUserId),
      leadIds.length > 0 ? lookup.findSessionKeysForLeads(leadIds) : Promise.resolve([]),
    ]);
    return {
      proof: "session",
      userId: sessionUserId,
      leadIds: unique(leadIds),
      sessionKeys: unique([...ownSessions, ...leadSessions]),
    };
  }

  // An anonymous person who still holds the cookie issued when they saved their
  // diagnosis has proved that one lead is theirs, and nothing else.
  const token = verifyLeadAccessToken(input.leadAccessToken, input.now, input.env);
  if (token) {
    const leadIds = [token.leadId];
    return {
      proof: "lead_access",
      userId: null,
      leadIds,
      sessionKeys: unique(await lookup.findSessionKeysForLeads(leadIds)),
    };
  }

  return null;
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

/**
 * The ownership proofs the deletion endpoint can currently accept.
 *
 * Reported through readiness so the gap is visible rather than implied: a
 * person who is not signed in and no longer holds their lead cookie has no way
 * to prove a contact address is theirs, so their request is recorded and
 * audited but performs nothing. P0-1b adds "contact_token" here together with
 * the verification route that earns it.
 */
export const SUPPORTED_DELETION_PROOFS: readonly DeletionProof[] = ["session", "lead_access"];
