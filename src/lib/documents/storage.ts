import { mkdir, writeFile } from "fs/promises";
import { dirname, isAbsolute, join, relative, resolve } from "path";
import { getRuntimeDatabaseInfo, db } from "@/lib/db";
import { getSupabaseServerConfig } from "@/lib/supabase/config";
import { createSupabaseServiceRoleClient } from "@/lib/supabase/server";
import type { SupabaseClientLike } from "@/lib/supabase/dynamic";

export type DocumentStorageKind = "local" | "blob" | "database" | "supabase" | "disabled" | "unsupported";

export interface DocumentStorageInfo {
  kind: DocumentStorageKind;
  hostedRuntime: boolean;
  writable: boolean;
  durable: boolean;
  blobTokenConfigured: boolean;
  supabaseConfigured: boolean;
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
  const supabaseConfigured = Boolean(
    configured(env.NEXT_PUBLIC_SUPABASE_URL) &&
      configured(env.SUPABASE_SERVICE_ROLE_KEY) &&
      configured(env.SUPABASE_STORAGE_BUCKET || "kaxi-documents")
  );
  const backend = requestedBackend(env);
  const database = getRuntimeDatabaseInfo(env);

  if (env.DOCUMENT_UPLOAD_STORE_BYTES === "false") {
    return {
      kind: "disabled",
      hostedRuntime,
      writable: !hostedRuntime,
      durable: false,
      blobTokenConfigured,
      supabaseConfigured,
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
      supabaseConfigured,
      reason: blobTokenConfigured
        ? "Vercel Blob storage is configured for document bytes."
        : "BLOB_READ_WRITE_TOKEN is required when DOCUMENT_UPLOAD_STORAGE_BACKEND=blob.",
    };
  }

  if (backend === "supabase" || backend === "storage") {
    return {
      kind: "supabase",
      hostedRuntime,
      writable: supabaseConfigured,
      durable: supabaseConfigured,
      blobTokenConfigured,
      supabaseConfigured,
      reason: supabaseConfigured
        ? "Supabase Storage private bucket is configured for document bytes."
        : "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET are required when DOCUMENT_UPLOAD_STORAGE_BACKEND=supabase.",
    };
  }

  if (backend === "database" || backend === "db" || backend === "postgres" || backend === "postgresql") {
    return {
      kind: "database",
      hostedRuntime,
      writable: database.writable,
      durable: database.sharedWritable,
      blobTokenConfigured,
      supabaseConfigured,
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
      supabaseConfigured,
      reason: `Unsupported document storage backend: ${backend}.`,
    };
  }

  return {
    kind: "local",
    hostedRuntime,
    writable: !hostedRuntime,
    durable: !hostedRuntime,
    blobTokenConfigured,
    supabaseConfigured,
    reason: hostedRuntime
      ? "Hosted deployments require durable object storage such as Vercel Blob for document bytes."
      : "Local filesystem storage is writable for development.",
  };
}

export function supabaseDocumentBucket(env: NodeJS.ProcessEnv = process.env): string {
  return env.SUPABASE_STORAGE_BUCKET?.trim() || "kaxi-documents";
}

async function blobToBuffer(value: Blob | ArrayBuffer | Uint8Array): Promise<Buffer> {
  if (value instanceof Uint8Array) return Buffer.from(value);
  if (value instanceof ArrayBuffer) return Buffer.from(value);
  return Buffer.from(await value.arrayBuffer());
}

export async function persistSupabaseUploadedBytes(
  storageKey: string,
  bytes: Uint8Array,
  mimeType: string,
  client?: SupabaseClientLike
) {
  const config = getSupabaseServerConfig();
  if (!config?.serviceRoleKey && !client) {
    throw new Error("Supabase service role key is required for server-side document storage.");
  }
  const supabase = client || (await createSupabaseServiceRoleClient());
  const result = await supabase.storage.from(supabaseDocumentBucket()).upload(storageKey, Buffer.from(bytes), {
    contentType: mimeType,
    upsert: false,
  });
  if (result.error) throw new Error(result.error.message || "Supabase Storage upload failed");
}

export async function readSupabaseUploadedBytes(storageKey: string, client?: SupabaseClientLike): Promise<Buffer> {
  const supabase = client || (await createSupabaseServiceRoleClient());
  const result = await supabase.storage.from(supabaseDocumentBucket()).download(storageKey);
  if (result.error || !result.data) throw new Error(result.error?.message || "Supabase Storage download failed");
  return blobToBuffer(result.data);
}

export async function createSupabaseSignedDownloadUrl(storageKey: string, expiresInSeconds = 600): Promise<string> {
  const seconds = Math.max(1, Math.min(Math.floor(expiresInSeconds), 600));
  const supabase = await createSupabaseServiceRoleClient();
  const result = await supabase.storage.from(supabaseDocumentBucket()).createSignedUrl(storageKey, seconds);
  if (result.error || !result.data?.signedUrl) {
    throw new Error(result.error?.message || "Supabase Storage signed URL failed");
  }
  return result.data.signedUrl;
}

export function localUploadPath(storageKey: string): string {
  const normalizedKey = storageKey.trim().replaceAll("\\", "/");
  if (
    !normalizedKey ||
    normalizedKey.startsWith("/") ||
    normalizedKey.split("/").some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error("Invalid local document storage key.");
  }

  const configuredRoot = process.env.DOCUMENT_UPLOAD_DIR?.trim();
  const root = resolve(
    /*turbopackIgnore: true*/ configuredRoot ||
      join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads"),
  );
  const filePath = resolve(/*turbopackIgnore: true*/ root, normalizedKey);
  const relativePath = relative(root, filePath);
  if (!relativePath || /^\.\.(?:[\\/]|$)/.test(relativePath) || isAbsolute(relativePath)) {
    throw new Error("Local document storage key escapes the upload root.");
  }
  return filePath;
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

  if (storage.kind === "supabase") {
    await persistSupabaseUploadedBytes(storageKey, bytes, mimeType);
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
  await mkdir(/*turbopackIgnore: true*/ dirname(filePath), { recursive: true });
  await writeFile(/*turbopackIgnore: true*/ filePath, bytes);
}

export async function readUploadedBytes(storageKey: string): Promise<Buffer> {
  const storage = getDocumentStorageInfo();

  if (storage.kind === "supabase") return readSupabaseUploadedBytes(storageKey);

  if (storage.kind === "database") {
    const blob = await db.documentFileBlob.findUnique({ where: { storageKey } });
    if (!blob) throw new Error("DocumentFileBlob not found.");
    return Buffer.from(blob.bytes);
  }

  if (storage.kind === "local") {
    const { readFile } = await import("fs/promises");
    return readFile(/*turbopackIgnore: true*/ localUploadPath(storageKey));
  }

  if (storage.kind === "blob") {
    throw new Error("Reading Vercel Blob document bytes is not implemented for OCR.");
  }

  throw new Error(storage.reason);
}
