import { getRuntimeDatabaseInfo } from "@/lib/db";
import { getDocumentUploadSigningSecret } from "./crypto";
import { getDocumentStorageInfo } from "./storage";

export type DocumentWorkspaceAction = "list" | "upload";

export interface DocumentWorkspaceIssue {
  code: "DOCUMENT_WORKSPACE_UNAVAILABLE";
  error: string;
  detail: string;
  operatorHint: string;
  readinessPath: "/api/readiness";
  requirements: string[];
  metadata: {
    databaseKind: string;
    databaseSource: string;
    hostedRuntime: boolean;
    writableDatabase: boolean;
    sharedWritableDatabase: boolean;
    activePrismaProvider: string;
    postgresqlConfigured: boolean;
    storageKind?: string;
    storageWritable?: boolean;
    storageDurable?: boolean;
    blobTokenConfigured?: boolean;
    uploadSigningConfigured?: boolean;
  };
}

function uploadSigningConfigured(env: NodeJS.ProcessEnv): boolean {
  return Boolean(getDocumentUploadSigningSecret(env));
}

function databaseRequirements(reason: string): string[] {
  return [
    "운영 문서 쓰기는 Supabase/PostgreSQL 설정과 prisma/postgres migration 적용이 필요합니다.",
    `현재 DB 상태: ${reason}`,
  ];
}

function storageRequirements(reason: string): string[] {
  return [
    "운영 문서 업로드는 DOCUMENT_UPLOAD_STORAGE_BACKEND=database 같은 공유 DB 저장소 또는 Vercel Blob 같은 영구 object storage와 BLOB_READ_WRITE_TOKEN 설정이 필요합니다.",
    `현재 저장소 상태: ${reason}`,
  ];
}

export function getDocumentWorkspaceIssue(
  action: DocumentWorkspaceAction,
  env: NodeJS.ProcessEnv = process.env
): DocumentWorkspaceIssue | null {
  const database = getRuntimeDatabaseInfo(env);
  const storage = getDocumentStorageInfo(env);
  const signingConfigured = action === "upload" ? uploadSigningConfigured(env) : undefined;

  const databaseOk = database.writable;
  const storageOk = action === "list" || storage.writable;
  const signingOk = action === "list" || signingConfigured;
  if (databaseOk && storageOk && signingOk) return null;

  const requirements: string[] = [];
  if (!databaseOk) requirements.push(...databaseRequirements(database.reason));
  if (action === "upload" && !storageOk) requirements.push(...storageRequirements(storage.reason));
  if (action === "upload" && !signingConfigured) {
    requirements.push("업로드 URL 발급 전 DOCUMENT_UPLOAD_SIGNING_SECRET 또는 NEXTAUTH_SECRET을 설정해야 합니다.");
  }

  return {
    code: "DOCUMENT_WORKSPACE_UNAVAILABLE",
    error:
      action === "list"
        ? "Document workspace requires a writable database"
        : "Document upload requires a writable database and durable storage",
    detail: [databaseOk ? "" : database.reason, storageOk ? "" : storage.reason]
      .filter(Boolean)
      .join(" "),
    operatorHint:
      "DB, 문서 저장소, production secret을 설정한 뒤 /api/readiness를 다시 확인하세요.",
    readinessPath: "/api/readiness",
    requirements,
    metadata: {
      databaseKind: database.kind,
      databaseSource: database.source,
      hostedRuntime: database.hostedRuntime,
      writableDatabase: database.writable,
      sharedWritableDatabase: database.sharedWritable,
      activePrismaProvider: database.activePrismaProvider,
      postgresqlConfigured: database.postgresqlConfigured,
      ...(action === "upload"
        ? {
            storageKind: storage.kind,
            storageWritable: storage.writable,
            storageDurable: storage.durable,
            blobTokenConfigured: storage.blobTokenConfigured,
            uploadSigningConfigured: Boolean(signingConfigured),
          }
        : {}),
    },
  };
}
