import { db } from "@/lib/db";
import { createSupabaseServiceRoleClient } from "@/infrastructure/supabase/service-role-client";
import { assertTenantContext, type TenantContext } from "@/application/tenancy/tenant-context";

export interface PromotionStorage {
  move(bucket: string, sourceKey: string, destinationKey: string): Promise<void>;
  exists(bucket: string, key: string): Promise<boolean>;
}

function processedKey(storageKey: string) {
  return storageKey.replace("chat-attachments/quarantine/", "chat-attachments/processed/");
}

export async function planAttachmentPromotion(tenantContext: TenantContext, attachmentId: string) {
  assertTenantContext(tenantContext);
  const attachment = await db.chatAttachment.findFirstOrThrow({
    where: { id: attachmentId, tenantId: tenantContext.tenantId },
  });
  const destinationKey = processedKey(attachment.storageKey);
  return db.chatAttachmentPromotion.upsert({
    where: { attachmentId },
    create: {
      attachmentId,
      sourceKey: attachment.storageKey,
      destinationKey,
      status: "promotion_planned",
    },
    update: {},
  });
}

export async function commitAttachmentPromotion(
  tenantContext: TenantContext,
  attachmentId: string,
  storage: PromotionStorage,
  failureInjection?: { afterObjectMove?: () => void | Promise<void> },
) {
  assertTenantContext(tenantContext);
  const promotion = await planAttachmentPromotion(tenantContext, attachmentId);
  const attachment = await db.chatAttachment.findFirstOrThrow({
    where: { id: attachmentId, tenantId: tenantContext.tenantId },
  });
  if (promotion.status === "ready" && attachment.storageKey === promotion.destinationKey) {
    return { status: "ready" as const, storageKey: promotion.destinationKey, reconciled: false };
  }
  const sourceExists = await storage.exists(attachment.bucket, promotion.sourceKey);
  const destinationExists = await storage.exists(attachment.bucket, promotion.destinationKey);
  if (!destinationExists) {
    if (!sourceExists) throw new Error("PROMOTION_SOURCE_AND_DESTINATION_MISSING");
    await storage.move(attachment.bucket, promotion.sourceKey, promotion.destinationKey);
  }
  await db.chatAttachmentPromotion.update({
    where: { attachmentId },
    data: { status: "object_moved", objectMovedAt: new Date(), attempts: { increment: 1 }, lastError: null },
  });
  await failureInjection?.afterObjectMove?.();

  await db.$transaction([
    db.chatAttachment.update({
      where: { id: attachmentId },
      data: {
        storageKey: promotion.destinationKey,
        status: "ready",
        processingStatus: "completed",
        processedAt: new Date(),
      },
    }),
    db.chatAttachmentPromotion.update({
      where: { attachmentId },
      data: {
        status: "ready",
        pointerCommittedAt: new Date(),
        readyAt: new Date(),
        lastError: null,
      },
    }),
  ]);
  return { status: "ready" as const, storageKey: promotion.destinationKey, reconciled: false };
}

export async function reconcileAttachmentPromotions(options: {
  tenantContext: TenantContext;
  storage?: PromotionStorage;
  limit?: number;
}) {
  assertTenantContext(options.tenantContext);
  const storage = options.storage || supabasePromotionStorage();
  const promotions = await db.chatAttachmentPromotion.findMany({
    where: { status: { not: "ready" }, attachment: { tenantId: options.tenantContext.tenantId } },
    orderBy: { updatedAt: "asc" },
    take: Math.min(100, Math.max(1, options.limit || 25)),
  });
  let ready = 0;
  let failed = 0;
  for (const promotion of promotions) {
    try {
      await commitAttachmentPromotion(options.tenantContext, promotion.attachmentId, storage);
      ready += 1;
    } catch (error) {
      failed += 1;
      await db.chatAttachmentPromotion.update({
        where: { attachmentId: promotion.attachmentId },
        data: {
          status: "reconciliation_failed",
          attempts: { increment: 1 },
          lastError: (error instanceof Error ? error.message : String(error)).slice(0, 1_000),
        },
      });
    }
  }
  return { checked: promotions.length, ready, failed };
}

export function supabasePromotionStorage(): PromotionStorage {
  const supabase = createSupabaseServiceRoleClient();
  return {
    async move(bucket, sourceKey, destinationKey) {
      const moved = await supabase.storage.from(bucket).move(sourceKey, destinationKey);
      if (moved.error) throw moved.error;
    },
    async exists(bucket, key) {
      const slash = key.lastIndexOf("/");
      const path = slash >= 0 ? key.slice(0, slash) : "";
      const name = slash >= 0 ? key.slice(slash + 1) : key;
      const listed = await supabase.storage.from(bucket).list(path, { search: name, limit: 10 });
      if (listed.error) throw listed.error;
      return (listed.data || []).some((item) => item.name === name);
    },
  };
}
