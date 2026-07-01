# KAXI Phase 5 Documents / OCR Flow

Status: implemented for upload and status management
Last updated: 2026-07-01

## Scope

OCR extraction is intentionally deferred to an async worker phase. Phase 5 implements the operational path first:

1. Student document workspace lists required `DocumentItem` slots.
2. Browser computes SHA-256 before upload.
3. Server issues a short-lived signed upload URL.
4. Direct upload endpoint verifies token, MIME, size, and SHA-256.
5. `UploadedFile` and `DocumentItem` are persisted.
6. Administrative scrivener reviews the document and changes status.
7. Every status change writes `AuditEvent` and `AdminAuditLog`.

## Statuses

The active document status set is:

- `NOT_UPLOADED`
- `UPLOADED`
- `OCR_PROCESSING`
- `OCR_DONE`
- `NEEDS_REVIEW`
- `APPROVED`
- `REJECTED`

The DB enum also contains legacy compatibility values such as `MISSING` and `EXPIRED`, but the Phase 5 upload/review UI uses the set above.

## API Flow

Student list:

```text
GET /api/documents?studentRef=<browser-generated-ref>
```

Create signed upload intent:

```text
POST /api/documents/upload-intent
```

Body:

```json
{
  "studentRef": "browser-generated-ref",
  "documentType": "passport",
  "originalName": "passport.pdf",
  "mimeType": "application/pdf",
  "sizeBytes": 12345,
  "sha256": "..."
}
```

Direct upload:

```text
PUT /api/documents/upload-direct?token=<signed-token>
```

Headers:

```text
content-type: application/pdf
x-kaxi-file-sha256: <same sha256>
```

Admin review:

```text
PATCH /api/admin/documents/:id/review
```

Body:

```json
{
  "status": "APPROVED",
  "reviewStatus": "APPROVED",
  "reviewNote": "행정사 검수 승인"
}
```

## Validation

Allowed MIME types:

- `application/pdf`
- `image/jpeg`
- `image/png`
- `image/webp`

Default maximum size is 10 MB. Override with:

```env
DOCUMENT_UPLOAD_MAX_BYTES=10485760
```

Signed upload token secret:

```env
DOCUMENT_UPLOAD_SIGNING_SECRET=...
```

Local byte storage:

```env
DOCUMENT_UPLOAD_DIR=data/uploads
DOCUMENT_UPLOAD_STORE_BYTES=true
```

Production byte storage:

```env
DOCUMENT_UPLOAD_STORAGE_BACKEND=blob
BLOB_READ_WRITE_TOKEN=...
```

Hosted deployments fail closed unless document bytes can be stored durably. Local filesystem storage remains available for development only. Production should use managed object storage such as Vercel Blob, alongside a managed operational database for `DocumentItem`, `UploadedFile`, and audit metadata.

## CI

`bun run test:documents` verifies:

- student document list starts with `NOT_UPLOADED`,
- signed upload intent is created,
- direct upload persists `UploadedFile` and `DocumentItem`,
- MIME, size, and hash mismatch are rejected,
- admin review changes status,
- upload/review state changes are written to audit logs.
