import type { PrismaClient } from "@prisma/client";
import { assertTenantContext, type TenantContext } from "@/application/tenancy/tenant-context";
import { db } from "@/lib/db";

function tenantId(tenantContext: TenantContext): string {
  assertTenantContext(tenantContext);
  return tenantContext.tenantId;
}

export async function findTenantMessage(
  tenantContext: TenantContext,
  id: bigint,
  client: PrismaClient = db,
) {
  return client.chatMessage.findFirst({ where: { id, tenantId: tenantId(tenantContext) } });
}

export async function findTenantAttachment(
  tenantContext: TenantContext,
  id: string,
  client: PrismaClient = db,
) {
  return client.chatAttachment.findFirst({ where: { id, tenantId: tenantId(tenantContext) } });
}

export async function findTenantHandoff(
  tenantContext: TenantContext,
  id: bigint,
  client: PrismaClient = db,
) {
  return client.handoffTask.findFirst({ where: { id, tenantId: tenantId(tenantContext) } });
}

export async function findTenantCase(
  tenantContext: TenantContext,
  id: string,
  client: PrismaClient = db,
) {
  return client.escalationCase.findFirst({
    where: { id, organization: { tenantId: tenantId(tenantContext) } },
  });
}

/** Identifier-only export manifest; protected field export is a separate privacy workflow. */
export async function buildTenantExportManifest(
  tenantContext: TenantContext,
  client: PrismaClient = db,
) {
  const scopedTenantId = tenantId(tenantContext);
  const [tenant, organizations, sessions, messages, attachments, handoffs, outbox] = await Promise.all([
    client.tenant.findUniqueOrThrow({ where: { id: scopedTenantId } }),
    client.organization.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
    client.chatSession.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
    client.chatMessage.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
    client.chatAttachment.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
    client.handoffTask.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
    client.outboxEvent.findMany({ where: { tenantId: scopedTenantId }, select: { id: true } }),
  ]);
  return {
    schemaVersion: 1,
    tenant: {
      id: tenant.id,
      slug: tenant.slug,
      retentionDays: tenant.retentionDays,
      keyVersion: tenant.keyVersion,
    },
    organizationIds: organizations.map((row) => row.id),
    sessionIds: sessions.map((row) => row.id),
    messageIds: messages.map((row) => row.id.toString()),
    attachmentIds: attachments.map((row) => row.id),
    handoffIds: handoffs.map((row) => row.id.toString()),
    outboxIds: outbox.map((row) => row.id),
  };
}

export async function purgeExpiredTenantData(
  tenantContext: TenantContext,
  options: { now?: Date; client?: PrismaClient } = {},
) {
  const client = options.client || db;
  const scopedTenantId = tenantId(tenantContext);
  const now = options.now || new Date();
  return client.$transaction(async (tx) => {
    const outbox = await tx.outboxEvent.deleteMany({
      where: { tenantId: scopedTenantId, retentionUntil: { lte: now } },
    });
    const sessions = await tx.chatSession.deleteMany({
      where: { tenantId: scopedTenantId, retentionUntil: { lte: now } },
    });
    return { tenantId: scopedTenantId, outboxDeleted: outbox.count, sessionsDeleted: sessions.count };
  });
}
