import { db } from "@/lib/db";

export interface AuditInput {
  actor: string;
  actorRole?: string;
  action: string;
  targetType: string;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  success?: boolean;
  metadata?: Record<string, unknown> | string | null;
}

function serializeMetadata(metadata: AuditInput["metadata"]): string | null {
  if (!metadata) return null;
  if (typeof metadata === "string") return metadata.slice(0, 4000);
  return JSON.stringify(metadata).slice(0, 4000);
}

export async function recordAuditLog(input: AuditInput): Promise<void> {
  try {
    await db.adminAuditLog.create({
      data: {
        actor: input.actor || "unknown",
        actorRole: input.actorRole || "admin",
        action: input.action,
        targetType: input.targetType,
        targetId: input.targetId || null,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
        success: input.success !== false,
        metadata: serializeMetadata(input.metadata),
      },
    });
  } catch (err) {
    console.warn("[audit skipped]", err instanceof Error ? err.message : err);
  }
}

export async function recordRequestAudit(
  req: { headers: Headers },
  input: Omit<AuditInput, "ip" | "userAgent">
): Promise<void> {
  const trusted = req.headers.get("x-vercel-forwarded-for")?.trim()
    || req.headers.get("x-real-ip")?.trim();
  const forwarded = req.headers.get("x-forwarded-for")
    ?.split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  await recordAuditLog({
    ...input,
    ip: trusted || forwarded || "unknown",
    userAgent: req.headers.get("user-agent") || null,
  });
}
