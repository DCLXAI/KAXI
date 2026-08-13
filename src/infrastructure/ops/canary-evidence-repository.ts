import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { collectTraceCoverage } from "@/infrastructure/observability/trace-coverage-repository";
import { collectTenantWriteEvidence } from "@/infrastructure/tenancy/tenant-write-evidence";
import type { CanaryEvidence } from "@/application/ops/canary-gate";

type CountRow = { count: bigint };

async function count(query: Promise<CountRow[]>) {
  const rows = await query;
  return Number(rows[0]?.count || 0);
}

export async function collectCanaryEvidence(since: Date): Promise<CanaryEvidence> {
  const [trace, tenant, criticalOpsEvents, crossTenantEvents, duplicateOpenHandoffs, terminalQueueFailures] = await Promise.all([
    collectTraceCoverage({ since }),
    collectTenantWriteEvidence(since),
    count(db.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT count(*)::bigint AS count
      FROM public.ops_events
      WHERE created_at >= ${since} AND severity = 'critical'
    `)),
    count(db.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT count(*)::bigint AS count
      FROM public.ops_events
      WHERE created_at >= ${since}
        AND (event_type ~* 'cross.?tenant|tenant.?access' OR message ~* 'cross.?tenant')
    `)),
    count(db.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT count(*)::bigint AS count
      FROM (
        SELECT tenant_id,
          coalesce(
            nullif(dedupe_key, ''),
            'message:' || source_chat_message_id::text,
            'session:' || session_id || ':' || coalesce(question_hash, '')
          ) AS logical_key
        FROM public.handoff_tasks
        WHERE status = 'open' AND created_at >= ${since}
        GROUP BY tenant_id, logical_key
        HAVING count(*) > 1
      ) duplicate_groups
    `)),
    count(db.$queryRaw<CountRow[]>(Prisma.sql`
      SELECT (
        (SELECT count(*) FROM public.worker_jobs WHERE created_at >= ${since} AND status = 'dead_letter')
        + (SELECT count(*) FROM public.outbox_events WHERE created_at >= ${since} AND status = 'dead_letter')
        + (SELECT count(*) FROM public.chat_attachment_jobs WHERE created_at >= ${since} AND status = 'failed')
      )::bigint AS count
    `)),
  ]);
  return {
    windowHours: Math.max(0, (Date.now() - since.getTime()) / 3_600_000),
    observedWrites: tenant.observedWrites,
    criticalOpsEvents,
    crossTenantEvents,
    duplicateOpenHandoffs,
    terminalQueueFailures,
    traceCoverage: trace.coverage,
    traceEligibleUnits: trace.eligibleUnits,
    tracePiiViolations: trace.piiViolationCount,
    legacyDefaultRows: tenant.legacyDefaultRows,
    unsafeTenantColumns: tenant.missingColumns.length + tenant.unsafeColumns.length,
    truncated: trace.truncated,
  };
}
