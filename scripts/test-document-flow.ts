import { existsSync, mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHash } from "crypto";
import { prepareTestDb } from "./prepare-test-db";

function fail(message: string): never {
  console.error(`FAIL ${message}`);
  process.exit(1);
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) fail(message);
}

async function json(res: Response) {
  const body = await res.json();
  return { ok: res.ok, status: res.status, body };
}

function sha256(value: Buffer): string {
  return createHash("sha256").update(value).digest("hex");
}

const tmpDir = mkdtempSync(join(tmpdir(), "kaxi-document-test-"));
process.env.DOCUMENT_UPLOAD_SIGNING_SECRET = "test-document-upload-secret";
process.env.DOCUMENT_UPLOAD_DIR = join(tmpDir, "uploads");
process.env.ADMIN_API_KEY = "test-admin-key";
prepareTestDb("document flow");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
const listRoute = await import("../src/app/api/documents/route");
const intentRoute = await import("../src/app/api/documents/upload-intent/route");
const directRoute = await import("../src/app/api/documents/upload-direct/route");
const reviewRoute = await import("../src/app/api/admin/documents/[id]/review/route");
const { getDocumentWorkspaceIssue } = await import("../src/lib/documents/workspace-availability");

function request(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    headers,
    body: init.body || undefined,
  });
}

function adminRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("x-admin-key", "test-admin-key");
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  return new NextRequest(`http://localhost${path}`, {
    method: init.method,
    headers,
    body: init.body || undefined,
  });
}

try {
  const blockedHostedUpload = getDocumentWorkspaceIssue("upload", {
    ...process.env,
    VERCEL: "1",
    DATABASE_URL: "",
    DOCUMENT_UPLOAD_STORAGE_BACKEND: "local",
    DOCUMENT_UPLOAD_SIGNING_SECRET: "",
  });
  assert(blockedHostedUpload, "hosted upload without Postgres should report workspace unavailable");
  assert(
    blockedHostedUpload.metadata.writableDatabase === false,
    "missing hosted Postgres should not be considered writable"
  );
  assert(
    blockedHostedUpload.metadata.storageWritable === false,
    "hosted local document storage should not be considered writable"
  );
  const hostedDatabaseUpload = getDocumentWorkspaceIssue("upload", {
    ...process.env,
    VERCEL: "1",
    DATABASE_URL: "postgres://user:pass@example.com:5432/kaxi",
    DOCUMENT_UPLOAD_STORAGE_BACKEND: "database",
    DOCUMENT_UPLOAD_SIGNING_SECRET: "configured",
  });
  assert(!hostedDatabaseUpload, "hosted postgres database document storage should be available");

  const studentRef = "student-flow-test-001";
  const listBefore = await json(await listRoute.GET(request(`/api/documents?studentRef=${studentRef}`)));
  assert(listBefore.ok, "student document list should load");
  assert(listBefore.body.documents.length >= 6, "student document list should include default document items");
  assert(
    listBefore.body.documents.some((doc: { status: string }) => doc.status === "NOT_UPLOADED"),
    "default document state should include NOT_UPLOADED"
  );

  const pdf = Buffer.from("%PDF-1.4\nKAXI test document\n%%EOF\n", "utf8");
  const hash = sha256(pdf);
  const intent = await json(
    await intentRoute.POST(
      request("/api/documents/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          studentRef,
          documentType: "passport",
          originalName: "passport.pdf",
          mimeType: "application/pdf",
          sizeBytes: pdf.byteLength,
          sha256: hash,
        }),
      })
    )
  );
  assert(intent.ok, `upload intent should succeed: ${JSON.stringify(intent.body)}`);
  assert(intent.body.uploadUrl.includes("/api/documents/upload-direct"), "intent should return direct upload URL");

  const upload = await json(
    await directRoute.PUT(
      new NextRequest(intent.body.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/pdf",
          "x-kaxi-file-sha256": hash,
        },
        body: new Blob([pdf], { type: "application/pdf" }),
      })
    )
  );
  assert(upload.ok, `direct upload should succeed: ${JSON.stringify(upload.body)}`);
  assert(upload.body.document.status === "UPLOADED", "uploaded document status should be UPLOADED");

  const uploadedFile = await db.uploadedFile.findFirst({ where: { sha256: hash } });
  assert(uploadedFile, "UploadedFile should be persisted");
  assert(uploadedFile.mimeType === "application/pdf", "UploadedFile MIME should be stored");
  assert(uploadedFile.sizeBytes === pdf.byteLength, "UploadedFile size should be stored");
  assert(existsSync(join(process.env.DOCUMENT_UPLOAD_DIR!, uploadedFile.storageKey)), "uploaded bytes should be stored");

  process.env.DOCUMENT_UPLOAD_STORAGE_BACKEND = "database";
  const dbBackedPdf = Buffer.from("%PDF-1.4\nKAXI database backed document\n%%EOF\n", "utf8");
  const dbBackedHash = sha256(dbBackedPdf);
  const databaseIntent = await json(
    await intentRoute.POST(
      request("/api/documents/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          studentRef,
          documentType: "transcript",
          originalName: "transcript.pdf",
          mimeType: "application/pdf",
          sizeBytes: dbBackedPdf.byteLength,
          sha256: dbBackedHash,
        }),
      })
    )
  );
  assert(databaseIntent.ok, `database upload intent should succeed: ${JSON.stringify(databaseIntent.body)}`);

  const databaseUpload = await json(
    await directRoute.PUT(
      new NextRequest(databaseIntent.body.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/pdf",
          "x-kaxi-file-sha256": dbBackedHash,
        },
        body: new Blob([dbBackedPdf], { type: "application/pdf" }),
      })
    )
  );
  assert(databaseUpload.ok, `database-backed upload should succeed: ${JSON.stringify(databaseUpload.body)}`);
  const databaseBlob = await db.documentFileBlob.findUnique({
    where: { storageKey: databaseIntent.body.storageKey },
  });
  assert(databaseBlob, "DocumentFileBlob should store database-backed upload bytes");
  assert(databaseBlob.sizeBytes === dbBackedPdf.byteLength, "DocumentFileBlob size should match upload");
  assert(databaseBlob.sha256 === dbBackedHash, "DocumentFileBlob sha256 should match upload");
  assert(Buffer.from(databaseBlob.bytes).equals(dbBackedPdf), "DocumentFileBlob bytes should match upload");
  process.env.DOCUMENT_UPLOAD_STORAGE_BACKEND = "local";

  const uploadedDoc = await db.documentItem.findFirst({
    where: { documentType: "passport" },
  });
  assert(uploadedDoc?.status === "UPLOADED", "DocumentItem should be UPLOADED after student upload");
  assert(uploadedDoc.reviewStatus === "PENDING", "DocumentItem review should be PENDING after student upload");

  const uploadAudit = await db.auditEvent.findFirst({
    where: { targetId: uploadedDoc.id, action: "document.uploaded" },
  });
  assert(uploadAudit, "student upload should create AuditEvent");

  const tampered = Buffer.from("not the same file", "utf8");
  const tamperedUpload = await json(
    await directRoute.PUT(
      new NextRequest(intent.body.uploadUrl, {
        method: "PUT",
        headers: {
          "content-type": "application/pdf",
          "x-kaxi-file-sha256": hash,
        },
        body: new Blob([tampered], { type: "application/pdf" }),
      })
    )
  );
  assert(!tamperedUpload.ok && tamperedUpload.status === 400, "hash mismatch upload should fail");

  const badMime = await json(
    await intentRoute.POST(
      request("/api/documents/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          studentRef,
          documentType: "financial_proof",
          originalName: "malware.exe",
          mimeType: "application/x-msdownload",
          sizeBytes: 100,
          sha256: "a".repeat(64),
        }),
      })
    )
  );
  assert(!badMime.ok, "unsupported MIME type should be rejected");

  const tooLarge = await json(
    await intentRoute.POST(
      request("/api/documents/upload-intent", {
        method: "POST",
        body: JSON.stringify({
          studentRef,
          documentType: "financial_proof",
          originalName: "large.pdf",
          mimeType: "application/pdf",
          sizeBytes: 11 * 1024 * 1024,
          sha256: "b".repeat(64),
        }),
      })
    )
  );
  assert(!tooLarge.ok, "oversized file should be rejected");

  const ocrProcessing = await json(
    await reviewRoute.PATCH(
      adminRequest(`/api/admin/documents/${uploadedDoc.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "OCR_PROCESSING",
          reviewStatus: "PENDING",
          reviewNote: "OCR 비동기 처리 대기",
        }),
      }),
      { params: Promise.resolve({ id: uploadedDoc.id }) }
    )
  );
  assert(ocrProcessing.ok, `OCR processing transition should succeed: ${JSON.stringify(ocrProcessing.body)}`);
  assert(ocrProcessing.body.document.status === "OCR_PROCESSING", "admin review should support OCR_PROCESSING");

  const reviewed = await json(
    await reviewRoute.PATCH(
      adminRequest(`/api/admin/documents/${uploadedDoc.id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          status: "APPROVED",
          reviewStatus: "APPROVED",
          reviewNote: "행정사 검수 승인",
        }),
      }),
      { params: Promise.resolve({ id: uploadedDoc.id }) }
    )
  );
  assert(reviewed.ok, `admin review should succeed: ${JSON.stringify(reviewed.body)}`);
  assert(reviewed.body.document.status === "APPROVED", "admin review should set document status APPROVED");
  assert(reviewed.body.document.reviewStatus === "APPROVED", "admin review should set reviewStatus APPROVED");

  const reviewAudit = await db.auditEvent.findFirst({
    where: { targetId: uploadedDoc.id, action: "document.reviewed" },
  });
  assert(reviewAudit, "admin review should create AuditEvent");

  const adminLogs = await db.adminAuditLog.findMany({ where: { targetId: uploadedDoc.id } });
  assert(adminLogs.length >= 3, "upload, OCR transition, and review should be mirrored to AdminAuditLog");

  console.log("PASS document flow: signed upload, validation, admin review, audit logs");
} finally {
  await db.$disconnect();
  rmSync(tmpDir, { recursive: true, force: true });
}
