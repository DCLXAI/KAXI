import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { getRuntimeDatabaseInfo, db } from "@/lib/db";

export type DocumentStorageKind = "local" | "blob" | "database" | "disabled" | "unsupported";

export interface DocumentStorageInfo {
  kind: DocumentStorageKind;
  hostedRuntime: boolean;
  writable: boolean;
  durable: boolean;
  blobTokenConfigured: boolean;
  reason: string;
}

function configured(value: string | undefined): boolean {
  const trimmed = value?.trim() || "";
  return Boolean(trimmed) && !/^replace-with-/i.test(trimmed);
}

function isHostedRuntime(env: NodeJS.ProcessEnv): boolean {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

function requestedBackend(env: NodeJS.ProcessEnv): string {
  return (env.DOCUMENT_UPLOAD_STORAGE_BACKEND || "").trim().toLowerCase();
}

export function getDocumentStorageInfo(env: NodeJS.ProcessEnv = process.env): DocumentStorageInfo {
  const hostedRuntime = isHostedRuntime(env);
  const blobTokenConfigured = configured(env.BLOB_READ_WRITE_TOKEN);
  const backend = requestedBackend(env);
  const database = getRuntimeDatabaseInfo(env);

  if (env.DOCUMENT_UPLOAD_STORE_BYTES === "false") {
    return {
      kind: "disabled",
      hostedRuntime,
      writable: !hostedRuntime,
      durable: false,
      blobTokenConfigured,
      reason: hostedRuntime
        ? "Hosted document uploads cannot disable byte storage; configure durable object storage instead."
        : "Document byte storage is disabled; only upload metadata will be persisted.",
    };
  }

  if (backend === "blob" || blobTokenConfigured) {
    return {
      kind: "blob",
      hostedRuntime,
      writable: blobTokenConfigured,
      durable: blobTokenConfigured,
      blobTokenConfigured,
      reason: blobTokenConfigured
        ? "Vercel Blob storage is configured for document bytes."
        : "BLOB_READ_WRITE_TOKEN is required when DOCUMENT_UPLOAD_STORAGE_BACKEND=blob.",
    };
  }

  if (backend === "database" || backend === "db" || backend === "postgres" || backend === "postgresql") {
    return {
      kind: "database",
      hostedRuntime,
      writable: database.writable,
      durable: database.sharedWritable,
      blobTokenConfigured,
      reason: database.writable
        ? "Document bytes are stored in the shared operational database."
        : `Document database storage requires a writable operational database. ${database.reason}`,
    };
  }

  if (backend && backend !== "local") {
    return {
      kind: "unsupported",
      hostedRuntime,
      writable: false,
      durable: false,
      blobTokenConfigured,
      reason: `Unsupported document storage backend: ${backend}.`,
    };
  }

  return {
    kind: "local",
    hostedRuntime,
    writable: !hostedRuntime,
    durable: !hostedRuntime,
    blobTokenConfigured,
    reason: hostedRuntime
      ? "Hosted deployments require durable object storage such as Vercel Blob for document bytes."
      : "Local filesystem storage is writable for development.",
  };
}

export function localUploadPath(storageKey: string): string {
  const root = process.env.DOCUMENT_UPLOAD_DIR || join(process.cwd(), "data", "uploads");
  return join(root, storageKey);
}

export async function persistUploadedBytes(storageKey: string, bytes: Uint8Array, mimeType: string) {
  const storage = getDocumentStorageInfo();
  if (!storage.writable) throw new Error(storage.reason);
  if (storage.kind === "disabled") return;

  if (storage.kind === "blob") {
    const { put } = await import("@vercel/blob");
    await put(storageKey, Buffer.from(bytes), {
      access: "private",
      contentType: mimeType,
      addRandomSuffix: false,
      allowOverwrite: false,
    });
    return;
  }

  if (storage.kind === "database") {
    const buffer = Buffer.from(bytes);
    const { createHash } = await import("crypto");
    const sha256 = createHash("sha256").update(buffer).digest("hex");
    await db.documentFileBlob.create({
      data: {
        storageKey,
        mimeType,
        sizeBytes: buffer.byteLength,
        sha256,
        bytes: buffer,
      },
    });
    return;
  }

  const filePath = localUploadPath(storageKey);
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, bytes);
}
