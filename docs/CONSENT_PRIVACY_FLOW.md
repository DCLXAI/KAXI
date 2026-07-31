# KAXI Consent / Privacy / Data Flow

Status: implemented MVP guardrail
Last updated: 2026-07-01
Review status: needs legal/privacy counsel review before production launch

## Runtime Rule

Partner routing is blocked unless KAXI has active consent for all required scopes:

- `THIRD_PARTY_PROVISION`
- `PROCESSING_CONSIGNMENT`
- `OVERSEAS_TRANSFER`

`POST /api/partner-requests` accepts a `consent` object from the partner request form. Without either newly captured explicit consent or previously active stored consent for the same lead, the API returns `428 CONSENT_REQUIRED` and does not create a `PartnerRequest`.

```json
{
  "leadId": "lead_id",
  "partnerType": "admin",
  "question": "consultation topic",
  "consent": {
    "thirdPartyProvision": true,
    "processingConsignment": true,
    "overseasTransfer": true,
    "version": "partner-routing-2026-07-01",
    "locale": "ko",
    "source": "partner-request-form"
  }
}
```

## Consent Storage

The existing `Consent` model is used as the source of truth. Lead-based public intake does not yet have a full account identity, so KAXI creates a synthetic student user with `zaloUid = lead:<leadId>` and stores the consent rows against that user.

Each consent row stores:

- scope
- status
- version
- locale
- grant timestamp
- evidence JSON with lead ID, partner type, consent source, IP/user agent, and the third-party/consignment/overseas notice snapshot

## Audit Events

Privacy processing events are written to both audit stores:

- `AuditEvent`
- `AdminAuditLog`

Current actions:

- `privacy.consent.granted`
- `privacy.consent.missing`
- `privacy.consent.withdrawn`
- `privacy.consent.expired`
- `partner.routing.created`

This makes blocked transfers, consent capture, actual partner routing, user deletion requests, and retention expiry reviewable from admin audit surfaces.

## Deletion And Retention

`POST /api/privacy/delete-request` acts only on records whose ownership the caller proved. Two proofs are accepted today:

| proof | who has it |
| --- | --- |
| `session` | a signed-in user — their leads, their partner requests, their chat sessions |
| `lead_access` | an anonymous person still holding the signed `kaxi_lead_access` cookie issued when they saved a diagnosis — that one lead and the sessions reachable from it |
| `contact_token` | anyone else, by redeeming a one-time link mailed to the contact address they named — the records reachable from that address |

Nothing in the request body selects records. The old `question` selector matched `hashPii(question)` across every row, and a question like "비자 연장 서류" is typed by many people, so one anonymous request scheduled strangers' records for deletion; it is refused with `400` rather than verified, because a shared string cannot identify one person's data. A request that names a contact opens a `PrivacyDeletionRequest` row and mails a one-time link to that address. **Nothing is marked until the link comes back**: typing an address is not a proof, possession of it is. The link lasts 24 hours, works once, and a second request for the same address supersedes the first so an old mail cannot be redeemed after a newer one.

Neither the address nor the token is stored. The row keeps `hashPii(contact)` and `sha256(token)`, so a database copy is neither a list of people who asked to be deleted nor a set of redeemable links. Sending requires `SMTP_HOST` and `SMTP_FROM`; readiness fails `privacy.deletion_ownership_proofs` when the channel is advertised but no mail can go out.

A request carrying no proof and no contact is recorded and audited but mutates nothing.

Every outcome returns the same `202` with the same body, so the endpoint cannot be used to probe whether a record exists. Active consent rows for the proven leads are marked `WITHDRAWN`.

`/api/privacy/retention` and `bun run privacy:enforce-retention` expire active lead consents when the linked lead reaches deletion or retention expiry. This is independent of whether contact text was already redacted during encrypted storage.

## Verification

`bun run test:privacy` verifies:

- partner routing without consent returns `428` and creates no `PartnerRequest`
- explicit third-party/consignment/overseas consent creates the required `Consent` rows
- partner routing writes privacy audit events
- deletion requests withdraw active consents
- retention expiry marks active consents as `EXPIRED`
- existing PII encryption, redaction, hosted non-Postgres, and serializer guards still pass
