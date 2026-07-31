import { createHash, randomBytes, timingSafeEqual } from "crypto";

// P0-1b. P0-1a made the deletion endpoint act only on records the caller proved
// were theirs, and left one gap open on purpose: a person who is not signed in
// and no longer holds the lead_access cookie could prove nothing, so their
// request was audited and dropped. That is a defensible containment posture and
// an indefensible permanent one — they still have the right to have their data
// erased.
//
// This closes it with the only proof available for a bare contact address:
// possession of the address itself. A one-time link is sent to it, and the
// request is honoured when that link comes back.
//
// Two things are deliberately never stored:
//
//   the address  only its HMAC, so the table cannot be read back into a list of
//                people who asked to be deleted
//   the token    only its digest, so a database copy does not let the holder
//                redeem anyone's link
//
// The token carries no meaning of its own — it is a lookup key, not a signed
// claim like the lead_access cookie. That is why it can be revoked by deleting a
// row, and why a stolen database gives an attacker nothing to replay.

export const DELETION_TOKEN_BYTES = 32;

/**
 * How long a verification link is good for.
 *
 * A deletion request is not something people act on within minutes — they read
 * the mail when they read their mail — so a five-minute window would mostly
 * produce expired links and abandoned requests. A day is long enough to be
 * usable and short enough that a link sitting in an old inbox is not a standing
 * key to someone's records.
 */
export const DELETION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type DeletionRequestStatus =
  | "pending_verification"
  | "verified"
  | "expired"
  | "superseded"
  | "rejected";

/** A fresh token and the digest to store for it. The token is returned once. */
export function issueDeletionToken(): { token: string; tokenHash: string } {
  const token = randomBytes(DELETION_TOKEN_BYTES).toString("base64url");
  return { token, tokenHash: hashDeletionToken(token) };
}

/**
 * The digest stored for a token.
 *
 * Plain SHA-256 rather than an HMAC: the token is 32 bytes of CSPRNG output, so
 * there is no dictionary to defend against and a keyed digest would only add a
 * secret that has to exist before deletion requests can work. The address hash
 * next to it IS keyed, because an email address is guessable and an unkeyed hash
 * of one is reversible by anyone with a list of addresses.
 */
export function hashDeletionToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** Constant-time compare, for callers that hold two digests. */
export function deletionTokenHashMatches(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface DeletionTokenRecord {
  status: string;
  expiresAt: Date | null;
  verifiedAt: Date | null;
}

export type DeletionTokenRejection =
  | "not_found"
  | "already_used"
  | "expired"
  | "not_pending";

/**
 * Whether a stored request may still be redeemed.
 *
 * Returns a reason rather than a boolean because the caller records it — but
 * never returns it. "This token was already used" and "no such token" must look
 * identical from outside, or the endpoint becomes a way to test whether a link
 * you found somewhere is live.
 */
export function checkDeletionToken(
  record: DeletionTokenRecord | null,
  now = new Date(),
): { ok: true } | { ok: false; reason: DeletionTokenRejection } {
  if (!record) return { ok: false, reason: "not_found" };
  if (record.verifiedAt) return { ok: false, reason: "already_used" };
  if (record.status !== "pending_verification") {
    return { ok: false, reason: record.status === "expired" ? "expired" : "not_pending" };
  }
  if (!record.expiresAt || record.expiresAt.getTime() <= now.getTime()) {
    return { ok: false, reason: "expired" };
  }
  return { ok: true };
}

/** The absolute path the verification link points at. */
export function deletionVerifyPath(token: string): string {
  return `/api/privacy/delete-request/verify?token=${encodeURIComponent(token)}`;
}

const COPY: Record<string, { subject: string; body: string }> = {
  ko: {
    subject: "[KARXY] 개인정보 삭제 요청 확인",
    body:
      "KARXY에 개인정보 삭제 요청이 접수되었습니다.\n"
      + "본인이 요청한 것이 맞다면 아래 링크를 눌러 확인해 주세요. 확인 후에만 삭제가 진행됩니다.\n"
      + "링크는 24시간 동안만 유효하며 한 번만 사용할 수 있습니다.\n\n"
      + "요청한 적이 없다면 이 메일을 무시하셔도 됩니다. 아무 것도 삭제되지 않습니다.",
  },
  en: {
    subject: "[KARXY] Confirm your data deletion request",
    body:
      "We received a request to delete your data at KARXY.\n"
      + "If this was you, use the link below to confirm. Nothing is deleted until you do.\n"
      + "The link is valid for 24 hours and can be used once.\n\n"
      + "If you did not make this request, you can ignore this email. Nothing will be deleted.",
  },
  vi: {
    subject: "[KARXY] Xác nhận yêu cầu xóa dữ liệu",
    body:
      "Chúng tôi đã nhận được yêu cầu xóa dữ liệu của bạn tại KARXY.\n"
      + "Nếu đúng là bạn, hãy nhấn vào liên kết bên dưới để xác nhận. Không có gì bị xóa cho đến khi bạn xác nhận.\n"
      + "Liên kết có hiệu lực trong 24 giờ và chỉ dùng được một lần.\n\n"
      + "Nếu bạn không gửi yêu cầu này, hãy bỏ qua email. Sẽ không có gì bị xóa.",
  },
  mn: {
    subject: "[KARXY] Мэдээлэл устгах хүсэлтээ баталгаажуулна уу",
    body:
      "KARXY-д таны мэдээллийг устгах хүсэлт ирлээ.\n"
      + "Хэрэв энэ нь та мөн бол доорх холбоосоор баталгаажуулна уу. Баталгаажуулах хүртэл юу ч устахгүй.\n"
      + "Холбоос 24 цагийн турш хүчинтэй бөгөөд нэг удаа ашиглагдана.\n\n"
      + "Хэрэв та ийм хүсэлт гаргаагүй бол энэ захидлыг үл тоовол болно. Юу ч устахгүй.",
  },
};

/** Verification mail copy for a locale, falling back to Korean. */
export function deletionVerificationCopy(locale: string) {
  return COPY[locale] ?? COPY.ko!;
}
