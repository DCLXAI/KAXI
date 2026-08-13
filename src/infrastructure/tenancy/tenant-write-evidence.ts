import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

const TENANT_TABLES = [
  "Organization",
  "chat_sessions",
  "chat_messages",
  "handoff_tasks",
  "leads",
  "n8n_audit_messages",
  "outbox_events",
  "worker_jobs",
  "handoff_updates",
  "handoff_consent_evidence",
  "retrieval_runs",
  "chat_attachments",
  "chat_attachment_jobs",
] as const;

type DefaultRowCount = { table_name: string; row_count: bigint };
type ColumnPosture = { table_name: string; is_nullable: string; column_default: string | null };
type WriteCount = { source: string; row_count: bigint };

export async function collectTenantWriteEvidence(since: Date) {
  const [defaultRows, columnPosture, recentWrites, metadataDefaults] = await Promise.all([
    db.$queryRaw<DefaultRowCount[]>(Prisma.sql`
      SELECT 'Organization' AS table_name, count(*)::bigint AS row_count FROM public."Organization" WHERE tenant_id = 'default'
      UNION ALL SELECT 'chat_sessions', count(*)::bigint FROM public.chat_sessions WHERE tenant_id = 'default'
      UNION ALL SELECT 'chat_messages', count(*)::bigint FROM public.chat_messages WHERE tenant_id = 'default'
      UNION ALL SELECT 'handoff_tasks', count(*)::bigint FROM public.handoff_tasks WHERE tenant_id = 'default'
      UNION ALL SELECT 'leads', count(*)::bigint FROM public.leads WHERE tenant_id = 'default'
      UNION ALL SELECT 'n8n_audit_messages', count(*)::bigint FROM public.n8n_audit_messages WHERE tenant_id = 'default'
      UNION ALL SELECT 'outbox_events', count(*)::bigint FROM public.outbox_events WHERE tenant_id = 'default'
      UNION ALL SELECT 'worker_jobs', count(*)::bigint FROM public.worker_jobs WHERE tenant_id = 'default'
      UNION ALL SELECT 'handoff_updates', count(*)::bigint FROM public.handoff_updates WHERE tenant_id = 'default'
      UNION ALL SELECT 'handoff_consent_evidence', count(*)::bigint FROM public.handoff_consent_evidence WHERE tenant_id = 'default'
      UNION ALL SELECT 'retrieval_runs', count(*)::bigint FROM public.retrieval_runs WHERE tenant_id = 'default'
      UNION ALL SELECT 'chat_attachments', count(*)::bigint FROM public.chat_attachments WHERE tenant_id = 'default'
      UNION ALL SELECT 'chat_attachment_jobs', count(*)::bigint FROM public.chat_attachment_jobs WHERE tenant_id = 'default'
    `),
    db.$queryRaw<ColumnPosture[]>(Prisma.sql`
      SELECT table_name, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'tenant_id'
        AND table_name IN (${Prisma.join([...TENANT_TABLES])})
      ORDER BY table_name
    `),
    db.$queryRaw<WriteCount[]>(Prisma.sql`
      SELECT 'chat_sessions' AS source, count(*)::bigint AS row_count FROM public.chat_sessions WHERE created_at >= ${since}
      UNION ALL SELECT 'chat_messages', count(*)::bigint FROM public.chat_messages WHERE created_at >= ${since}
      UNION ALL SELECT 'outbox_events', count(*)::bigint FROM public.outbox_events WHERE created_at >= ${since}
      UNION ALL SELECT 'worker_jobs', count(*)::bigint FROM public.worker_jobs WHERE created_at >= ${since}
      UNION ALL SELECT 'chat_attachments', count(*)::bigint FROM public.chat_attachments WHERE created_at >= ${since}
      UNION ALL SELECT 'chat_attachment_jobs', count(*)::bigint FROM public.chat_attachment_jobs WHERE created_at >= ${since}
    `),
    db.$queryRaw<Array<{ row_count: bigint }>>(Prisma.sql`
      SELECT count(*)::bigint AS row_count
      FROM public.knowledge_chunks
      WHERE coalesce(nullif(metadata->>'tenant_id', ''), 'default') = 'default'
    `),
  ]);

  const seenTables = new Set(columnPosture.map((row) => row.table_name));
  const missingColumns = TENANT_TABLES.filter((table) => !seenTables.has(table));
  const unsafeColumns = columnPosture.filter((row) => row.is_nullable !== "NO" || row.column_default !== null);
  const legacyDefaultRows = defaultRows.reduce((sum, row) => sum + Number(row.row_count), 0)
    + Number(metadataDefaults[0]?.row_count || 0);
  const observedWrites = recentWrites.reduce((sum, row) => sum + Number(row.row_count), 0);
  return {
    since,
    expectedTenantTables: TENANT_TABLES.length,
    observedTenantTables: columnPosture.length,
    missingColumns,
    unsafeColumns: unsafeColumns.map((row) => ({
      table: row.table_name,
      nullable: row.is_nullable,
      defaultConfigured: row.column_default !== null,
    })),
    legacyDefaultRows,
    observedWrites,
    writesBySource: Object.fromEntries(recentWrites.map((row) => [row.source, Number(row.row_count)])),
  };
}
