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

`POST /api/privacy/delete-request` still accepts `leadId`, `contact`, or exact `question`. When a matching lead is found, active consent rows for that lead are marked `WITHDRAWN`.

`/api/privacy/retention` and `bun run privacy:enforce-retention` expire active lead consents when the linked lead reaches deletion or retention expiry. This is independent of whether contact text was already redacted during encrypted storage.

## Verification

`bun run test:privacy` verifies:

- partner routing without consent returns `428` and creates no `PartnerRequest`
- explicit third-party/consignment/overseas consent creates the required `Consent` rows
- partner routing writes privacy audit events
- deletion requests withdraw active consents
- retention expiry marks active consents as `EXPIRED`
- existing PII encryption, redaction, hosted non-Postgres, and serializer guards still pass
