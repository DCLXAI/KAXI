import { ALLOWED_DOCUMENT_MIME_TYPES, maxDocumentUploadBytes } from "../src/lib/documents/config";
import { supabaseDocumentBucket } from "../src/lib/documents/storage";
import { createSupabaseServiceRoleClient } from "../src/lib/supabase/server";

async function main() {
  const bucket = supabaseDocumentBucket();
  const client = await createSupabaseServiceRoleClient();
  const options = {
    public: false,
    fileSizeLimit: maxDocumentUploadBytes(),
    allowedMimeTypes: [...ALLOWED_DOCUMENT_MIME_TYPES],
  };

  const existing = await client.storage.getBucket?.(bucket);
  if (existing?.error) {
    const created = await client.storage.createBucket?.(bucket, options);
    if (created?.error) throw new Error(created.error.message || "Failed to create Supabase Storage bucket");
    console.log(`[supabase-storage] created private bucket ${bucket}`);
    return;
  }

  const updated = await client.storage.updateBucket?.(bucket, options);
  if (updated?.error) throw new Error(updated.error.message || "Failed to update Supabase Storage bucket");
  console.log(`[supabase-storage] verified private bucket ${bucket}`);
}

main().catch((err) => {
  console.error(`[supabase-storage] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
