import type { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getClientIp } from "@/lib/api/security";

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
  req: NextRequest,
  input: Omit<AuditInput, "ip" | "userAgent">
): Promise<void> {
  await recordAuditLog({
    ...input,
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") || null,
  });
}
