import { db } from "../src/lib/db";
import { persistSupabaseUploadedBytes, readSupabaseUploadedBytes } from "../src/lib/documents/storage";

async function supabaseObjectExists(storageKey: string): Promise<boolean> {
  try {
    await readSupabaseUploadedBytes(storageKey);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const blobs = await db.documentFileBlob.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: "asc" },
  });
  let uploaded = 0;
  let skipped = 0;

  for (const blob of blobs) {
    if (await supabaseObjectExists(blob.storageKey)) {
      skipped += 1;
      continue;
    }
    await persistSupabaseUploadedBytes(blob.storageKey, Buffer.from(blob.bytes), blob.mimeType);
    uploaded += 1;
  }

  console.log(`[document-blob-migration] uploaded=${uploaded} skipped=${skipped} total=${blobs.length}`);
}

main()
  .catch((err) => {
    console.error(`[document-blob-migration] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
