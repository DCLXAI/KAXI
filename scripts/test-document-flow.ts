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
process.env.DATA_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.PII_HASH_SECRET = "abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789";
process.env.AI_PROVIDER = "kimi";
process.env.OPENAI_API_KEY = "";
prepareTestDb("document flow");

const { NextRequest } = await import("next/server");
const { db } = await import("../src/lib/db");
// NOTE: Routes now require a student session (Supabase env is absent in tests,
// so route-level calls assert the 401 contract). Repository/crypto functions
// and the token-authenticated upload-direct route are exercised directly below.
const reviewRoute = await import("../src/app/api/admin/documents/[id]/review/route");
const listRoute = await import("../src/app/api/documents/route");
const intentRoute = await import("../src/app/api/documents/upload-intent/route");
const directRoute = await import("../src/app/api/documents/upload-direct/route");
const { getDocumentWorkspaceIssue } = await import("../src/lib/documents/workspace-availability");
const {
  getDocumentStorageInfo,
  localUploadPath,
  persistSupabaseUploadedBytes,
  readSupabaseUploadedBytes,
} = await import("../src/lib/documents/storage");
const { processDocumentOcr } = await import("../src/lib/documents/ocr");
const { VISA_DOCUMENT_REQUIREMENT_SEEDS } = await import("../src/lib/documents/visa-document-matrix");
const { DOCUMENT_WORKSPACE_ROLES } = await import("../src/lib/documents/access");

function cloneJson(value: unknown) {
  return JSON.parse(JSON.stringify(value));
}

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
  {
    const res = await listRoute.GET();
    const { status, body } = { status: res.status, body: await res.json() };
    assert(status === 401, `GET /api/documents without session must be 401, got ${status}`);
    assert(body.code === "forbidden", "401 body must carry AuthBridgeError code");
    assert(!JSON.stringify(body).includes("studentRef"), "response must not reference studentRef");
  }
  {
    const res = await intentRoute.POST(
      request("/api/documents/upload-intent", {
        method: "POST",
        body: JSON.stringify({ documentType: "passport", originalName: "a.pdf", mimeType: "application/pdf", sizeBytes: 10, sha256: "0".repeat(64) }),
      })
    );
    assert(res.status === 401, `upload-intent without session must be 401, got ${res.status}`);
  }

  const { getStudentProfileForUser, listDocumentsForProfile, commitDocumentUpload: commitUpload, validateDocumentUpload } =
    await import("../src/lib/documents/repository");

  // 세션 사용자 시드 (auth bridge가 만드는 형태와 동일)
  const seededUser = await db.user.create({
    data: {
      role: "STUDENT",
      locale: "ko",
      email: "doc-test-student@kaxi.local",
      authUserId: "11111111-2222-4333-8444-555555555555",
    },
  });

  const profile = await getStudentProfileForUser(seededUser.id);
  assert(profile.userId === seededUser.id, "getStudentProfileForUser must bind profile to the seeded user");

  // 멱등성: 두 번 호출해도 같은 프로필
  const profileAgain = await getStudentProfileForUser(seededUser.id);
  assert(profileAgain.id === profile.id, "getStudentProfileForUser must be idempotent");

  assert(
    (["STUDENT", "PARTNER_AGENT", "PLATFORM_ADMIN"] as const).every((role) => DOCUMENT_WORKSPACE_ROLES.includes(role)),
    "document workspace should be available to every authenticated KAXI role"
  );
  const adminUser = await db.user.create({
    data: {
      role: "PLATFORM_ADMIN",
      locale: "ko",
      email: "doc-test-admin@kaxi.local",
      authUserId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
    },
  });
  const adminProfile = await getStudentProfileForUser(adminUser.id);
  assert(adminProfile.userId === adminUser.id, "a platform admin should receive a personal document profile");

  // 유령 신원(zaloUid doc:*) 생성 금지
  const ghostUsers = await db.user.count({ where: { zaloUid: { startsWith: "doc:" } } });
  assert(ghostUsers === 0, "no doc:* ghost users may be created");

  const emptyList = await listDocumentsForProfile(profile.id);
  assert(Array.isArray(emptyList) && emptyList.length > 0, "listDocumentsForProfile returns the default checklist");
  assert(emptyList.every((d) => d.status === "NOT_UPLOADED"), "fresh profile has no uploaded documents");

  await db.chatSession.create({
    data: {
      id: "queue-session-row",
      sessionKey: "queue-session-test",
      source: "kaxi-site",
      channel: "kaxi-site",
    },
  });
  await db.chatAttachment.create({
    data: {
      id: "queue-attachment-test",
      sessionKey: "queue-session-test",
      bucket: "test-private-bucket",
      storageKey: "chat-attachments/quarantine/queue-test.pdf",
      originalName: "queue-test.pdf",
      mimeType: "application/pdf",
      sizeBytes: 128,
      sha256: "a".repeat(64),
    },
  });
  await db.chatAttachmentJob.create({
    data: { attachmentId: "queue-attachment-test" },
  });
  const firstClaim = await db.$queryRaw<Array<{ status: string; attempts: number; lock_token: string | null }>>`
    SELECT status, attempts, lock_token
    FROM public.kaxi_claim_chat_attachment_jobs(1, 120)
  `;
  assert(
    firstClaim.length === 1 && firstClaim[0]?.status === "processing" && firstClaim[0]?.attempts === 1 && firstClaim[0]?.lock_token,
    "attachment queue should atomically claim a queued job with a lease token",
  );
  const duplicateClaim = await db.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM public.kaxi_claim_chat_attachment_jobs(1, 120)
  `;
  assert(duplicateClaim.length === 0, "freshly leased attachment job must not be claimed twice");
  await db.chatAttachmentJob.update({
    where: { attachmentId: "queue-attachment-test" },
    data: { lockedAt: new Date(Date.now() - 5 * 60 * 1000) },
  });
  const reclaimed = await db.$queryRaw<Array<{ attempts: number }>>`
    SELECT attempts FROM public.kaxi_claim_chat_attachment_jobs(1, 30)
  `;
  assert(reclaimed[0]?.attempts === 2, "expired attachment job lease should be reclaimable");
  await db.chatSession.delete({ where: { sessionKey: "queue-session-test" } });

  assert(
    localUploadPath("student/passport.pdf").startsWith(process.env.DOCUMENT_UPLOAD_DIR!),
    "local storage keys should resolve inside the upload root",
  );
  let traversalBlocked = false;
  try {
    localUploadPath("../outside.pdf");
  } catch {
    traversalBlocked = true;
  }
  assert(traversalBlocked, "local storage should reject path traversal keys");

  const passportRequirement = VISA_DOCUMENT_REQUIREMENT_SEEDS.find((seed) => seed.code === "d2_issuance_passport");
  assert(passportRequirement, "test setup should include D-2 passport requirement seed");
  await db.visaDocumentRequirement.create({
    data: {
      ...passportRequirement,
      reviewStatus: "APPROVED",
      lastCheckedAt: new Date(passportRequirement.lastCheckedAt),
      sourceRefs: cloneJson(passportRequirement.sourceRefs),
      requiredFields: cloneJson(passportRequirement.requiredFields),
      validationRules: cloneJson(passportRequirement.validationRules),
    },
  });

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
  const hostedSupabaseUpload = getDocumentWorkspaceIssue("upload", {
    ...process.env,
    VERCEL: "1",
    DATABASE_URL: "postgres://user:pass@example.com:5432/kaxi",
    DOCUMENT_UPLOAD_STORAGE_BACKEND: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
    SUPABASE_STORAGE_BUCKET: "kaxi-documents",
    DOCUMENT_UPLOAD_SIGNING_SECRET: "configured",
  });
  assert(!hostedSupabaseUpload, "hosted supabase document storage should be available when service role is configured");
  const supabaseInfo = getDocumentStorageInfo({
    ...process.env,
    DOCUMENT_UPLOAD_STORAGE_BACKEND: "supabase",
    NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role",
  });
  assert(supabaseInfo.kind === "supabase" && supabaseInfo.writable, "supabase storage backend should be detected");

  const mockObjects = new Map<string, Buffer>();
  const mockSupabaseClient = {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    storage: {
      from: () => ({
        upload: async (path: string, fileBody: unknown) => {
          mockObjects.set(path, Buffer.from(fileBody as Uint8Array));
          return { data: {}, error: null };
        },
        download: async (path: string) => {
          const data = mockObjects.get(path);
          return data ? { data, error: null } : { data: null, error: { message: "not found" } };
        },
        createSignedUrl: async (path: string, expiresIn: number) => ({
          data: { signedUrl: `https://signed.example/${path}?exp=${expiresIn}` },
          error: null,
        }),
      }),
    },
  };
  await persistSupabaseUploadedBytes("mock/storage.pdf", Buffer.from("mock"), "application/pdf", mockSupabaseClient);
  const mockRead = await readSupabaseUploadedBytes("mock/storage.pdf", mockSupabaseClient);
  assert(mockRead.equals(Buffer.from("mock")), "supabase storage mock should persist and read bytes");

  // NOTE: Routes now require a student session (Supabase env is absent in tests,
  // so route-level calls assert the 401 contract). Repository/crypto functions
  // and the token-authenticated upload-direct route are exercised directly below.
  const { signDocumentUploadPayload } = await import("../src/lib/documents/crypto");
  const { DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS } = await import("../src/lib/documents/config");
  const { createDocumentStorageKey: makeStorageKey } = await import("../src/lib/documents/repository");

  const fileBytes = Buffer.from("KAXI test passport bytes");
  const fileSha = sha256(fileBytes);
  const storageKey = makeStorageKey({
    studentProfileId: profile.id,
    documentType: "passport",
    originalName: "passport.pdf",
    sha256: fileSha,
  });
  const uploadToken = signDocumentUploadPayload(
    {
      studentProfileId: profile.id,
      documentType: "passport",
      originalName: "passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: fileBytes.byteLength,
      sha256: fileSha,
      storageKey,
      exp: Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS,
    },
    "test-document-upload-secret"
  );
  const verifiedPayload = (await import("../src/lib/documents/crypto")).verifyDocumentUploadToken(
    uploadToken,
    "test-document-upload-secret"
  );
  assert(
    verifiedPayload?.studentProfileId === profile.id,
    "signed upload token must round-trip studentProfileId"
  );

  // Route-level coverage: upload-direct is token-authenticated (no Supabase session needed),
  // so exercise the actual PUT handler with a valid signed token and a tampered one.
  const routeBytes = Buffer.from("KAXI transcript route-level bytes");
  const routeSha = sha256(routeBytes);
  const routeStorageKey = makeStorageKey({
    studentProfileId: profile.id,
    documentType: "transcript",
    originalName: "transcript-route.pdf",
    sha256: routeSha,
  });
  const routePayload = {
    studentProfileId: profile.id,
    documentType: "transcript",
    originalName: "transcript-route.pdf",
    mimeType: "application/pdf",
    sizeBytes: routeBytes.byteLength,
    sha256: routeSha,
    storageKey: routeStorageKey,
    exp: Math.floor(Date.now() / 1000) + DOCUMENT_UPLOAD_TOKEN_TTL_SECONDS,
  };
  const routeToken = signDocumentUploadPayload(routePayload, "test-document-upload-secret");
  const routeVerified = (await import("../src/lib/documents/crypto")).verifyDocumentUploadToken(
    routeToken,
    "test-document-upload-secret"
  );
  assert(routeVerified && routeVerified.studentProfileId === profile.id, "route token must verify");
  const putRes = await directRoute.PUT(
    new NextRequest("http://localhost/api/documents/upload-direct", {
      method: "PUT",
      headers: {
        "content-type": routeVerified.mimeType,
        "x-kaxi-file-sha256": routeVerified.sha256,
        "x-kaxi-upload-token": routeToken,
      },
      body: routeBytes,
    })
  );
  const putBody = await putRes.json();
  assert(putRes.ok, `upload-direct route must accept a valid signed token, got ${putRes.status}: ${JSON.stringify(putBody)}`);
  assert(putBody.document?.documentType === "transcript", "route response must carry the committed document");

  // The signed token must live in the header, never the URL query string.
  const legacyQueryPutRes = await directRoute.PUT(
    new NextRequest(`http://localhost/api/documents/upload-direct?token=${encodeURIComponent(routeToken)}`, {
      method: "PUT",
      headers: { "content-type": routeVerified.mimeType, "x-kaxi-file-sha256": routeVerified.sha256 },
      body: routeBytes,
    })
  );
  assert(
    legacyQueryPutRes.status === 401,
    `upload-direct must ignore a URL query token, got ${legacyQueryPutRes.status}`
  );

  const tamperedPutRes = await directRoute.PUT(
    new NextRequest("http://localhost/api/documents/upload-direct", {
      method: "PUT",
      headers: { "x-kaxi-upload-token": "tampered" },
    })
  );
  assert(tamperedPutRes.status === 401, `upload-direct route must reject a tampered token, got ${tamperedPutRes.status}`);

  const committed = await commitUpload(
    {
      studentProfileId: profile.id,
      documentType: "passport",
      originalName: "passport.pdf",
      mimeType: "application/pdf",
      sizeBytes: fileBytes.byteLength,
      sha256: fileSha,
      storageKey,
      bytes: fileBytes,
    },
    { actor: `student:${profile.id}`, actorRole: "student", action: "document.uploaded" }
  );
  assert(committed.status === "UPLOADED", "commitDocumentUpload should mark the document UPLOADED");

  const listAfter = await listDocumentsForProfile(profile.id);
  const passport = listAfter.find((d) => d.documentType === "passport");
  assert(passport && passport.status !== "NOT_UPLOADED", "committed upload must appear in profile document list");

  const processed = await processDocumentOcr(committed.id, { actor: "test", actorRole: "student" });
  assert(processed.status === "NEEDS_REVIEW", "missing Claude key should degrade uploaded document to NEEDS_REVIEW");
  assert(processed.reviewStatus === "NEEDS_HUMAN_REVIEW", "missing Claude key should require human review");

  const uploadedFile = await db.uploadedFile.findFirst({ where: { sha256: fileSha } });
  assert(uploadedFile, "UploadedFile should be persisted");
  assert(uploadedFile.mimeType === "application/pdf", "UploadedFile MIME should be stored");
  assert(uploadedFile.sizeBytes === fileBytes.byteLength, "UploadedFile size should be stored");
  assert(existsSync(join(process.env.DOCUMENT_UPLOAD_DIR!, uploadedFile.storageKey)), "uploaded bytes should be stored");

  process.env.DOCUMENT_UPLOAD_STORAGE_BACKEND = "database";
  const dbBackedPdf = Buffer.from("%PDF-1.4\nKAXI database backed document\n%%EOF\n", "utf8");
  const dbBackedHash = sha256(dbBackedPdf);
  const dbBackedStorageKey = makeStorageKey({
    studentProfileId: profile.id,
    documentType: "transcript",
    originalName: "transcript.pdf",
    sha256: dbBackedHash,
  });
  const dbBackedResult = await commitUpload(
    {
      studentProfileId: profile.id,
      documentType: "transcript",
      originalName: "transcript.pdf",
      mimeType: "application/pdf",
      sizeBytes: dbBackedPdf.byteLength,
      sha256: dbBackedHash,
      storageKey: dbBackedStorageKey,
      bytes: dbBackedPdf,
    },
    { actor: `student:${profile.id}`, actorRole: "student", action: "document.uploaded" }
  );
  assert(dbBackedResult.status === "UPLOADED", "database-backed upload should commit as UPLOADED");
  const databaseBlob = await db.documentFileBlob.findUnique({
    where: { storageKey: dbBackedStorageKey },
  });
  assert(databaseBlob, "DocumentFileBlob should store database-backed upload bytes");
  assert(databaseBlob.sizeBytes === dbBackedPdf.byteLength, "DocumentFileBlob size should match upload");
  assert(databaseBlob.sha256 === dbBackedHash, "DocumentFileBlob sha256 should match upload");
  assert(Buffer.from(databaseBlob.bytes).equals(dbBackedPdf), "DocumentFileBlob bytes should match upload");
  process.env.DOCUMENT_UPLOAD_STORAGE_BACKEND = "local";

  const uploadedDoc = await db.documentItem.findFirst({
    where: { documentType: "passport" },
  });
  assert(uploadedDoc?.status === "NEEDS_REVIEW", "DocumentItem should be NEEDS_REVIEW when OCR is skipped");
  assert(uploadedDoc.reviewStatus === "NEEDS_HUMAN_REVIEW", "DocumentItem review should require human review when OCR is skipped");
  assert(uploadedDoc.ocrProcessedAt, "OCR skipped path should still record ocrProcessedAt");

  const uploadAudit = await db.auditEvent.findFirst({
    where: { targetId: uploadedDoc.id, action: "document.uploaded" },
  });
  assert(uploadAudit, "student upload should create AuditEvent");
  const ocrSkippedAudit = await db.auditEvent.findFirst({
    where: { targetId: uploadedDoc.id, action: "document.ocr_skipped" },
  });
  assert(ocrSkippedAudit, "missing Claude key should create OCR skipped AuditEvent");

  process.env.DOCUMENT_OCR_MOCK_RESPONSE_JSON = JSON.stringify({
    documentType: "passport",
    confidence: 0.94,
    passport: {
      passportNumber: "P1234567",
      fullName: "KAXI TEST",
      expirationDate: "2099-12-31",
    },
    financialProof: null,
    common: null,
  });
  const ocrDone = await processDocumentOcr(uploadedDoc.id, {
    actor: "test",
    actorRole: "test",
  });
  assert(ocrDone.status === "OCR_DONE", `mock OCR should complete: ${JSON.stringify(ocrDone)}`);
  assert(ocrDone.ocrExtractedCiphertext, "mock OCR should persist encrypted extraction");
  assert(ocrDone.ocrExtractedRedacted, "mock OCR should persist redacted extraction for UI");
  assert(ocrDone.expiresAt?.getFullYear() === 2099, "mock OCR should update passport expiry");
  delete process.env.DOCUMENT_OCR_MOCK_RESPONSE_JSON;

  const tampered = Buffer.from("not the same file", "utf8");
  let tamperedRejected = false;
  try {
    await commitUpload(
      {
        studentProfileId: profile.id,
        documentType: "passport",
        originalName: "passport.pdf",
        mimeType: "application/pdf",
        sizeBytes: fileBytes.byteLength,
        sha256: fileSha,
        storageKey,
        bytes: tampered,
      },
      { actor: `student:${profile.id}`, actorRole: "student", action: "document.uploaded" }
    );
  } catch {
    tamperedRejected = true;
  }
  assert(tamperedRejected, "hash/length mismatch upload should be rejected");

  let badMimeRejected = false;
  try {
    validateDocumentUpload({
      originalName: "malware.exe",
      mimeType: "application/x-msdownload",
      sizeBytes: 100,
      sha256: "a".repeat(64),
    });
  } catch {
    badMimeRejected = true;
  }
  assert(badMimeRejected, "unsupported MIME type should be rejected");

  let tooLargeRejected = false;
  try {
    validateDocumentUpload({
      originalName: "large.pdf",
      mimeType: "application/pdf",
      sizeBytes: 11 * 1024 * 1024,
      sha256: "b".repeat(64),
    });
  } catch {
    tooLargeRejected = true;
  }
  assert(tooLargeRejected, "oversized file should be rejected");

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
