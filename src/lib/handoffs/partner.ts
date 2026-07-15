// Partner-facing view of the handoff queue (Task 6).
//
// This module is intentionally small and separate from admin.ts: it is the
// entire authorization boundary between an admin operator (who can see the
// whole queue and record a RAG verdict) and a partner agent (who can only see
// and act on the tasks assigned to them, and can never record that verdict).
import {
  assignmentMetadata,
  isActiveHandoffStatus,
  isolatedTestRuntime,
  listAdminHandoffs,
  serviceClient,
  updateAdminHandoff,
  type AdminHandoffTask,
} from "./admin";

export class PartnerHandoffAssignmentError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "PartnerHandoffAssignmentError";
    this.code = code;
    this.status = status;
  }
}

// The RAG verdict ("resolve" -> resolved/inaccurate/missing_document) feeds
// rag_evaluation_cases and is a content-quality judgment -- it must stay
// admin-only. "assign"/"close"/"reopen" are queue-management actions that
// also stay admin-only. This is a hard allow-list, not a denylist: anything
// that is not exactly "start" or "contacted" is rejected.
export type PartnerHandoffAction = "start" | "contacted";
const PARTNER_HANDOFF_ACTIONS = new Set<PartnerHandoffAction>(["start", "contacted"]);

export function isPartnerHandoffAction(action: unknown): action is PartnerHandoffAction {
  return typeof action === "string" && PARTNER_HANDOFF_ACTIONS.has(action as PartnerHandoffAction);
}

// Pure ownership check: a partner may only ever touch a handoff task that is
// assigned to them. Exported (and used by updatePartnerHandoff below) so the
// boundary itself can be unit-tested directly against fabricated ids,
// independent of any database round trip.
export function assertHandoffAssignedToCaller(assigneeUserId: string | null, callerId: string): void {
  if (!assigneeUserId || assigneeUserId !== callerId) {
    throw new PartnerHandoffAssignmentError(
      "handoff_not_assigned_to_caller",
      "This handoff task is not assigned to you",
      403,
    );
  }
}

// Pure listing-scope filter: exactly what listPartnerHandoffs exposes -- the
// caller's own tasks that are still active (non-terminal). Exported so the
// scoping rule can be unit-tested against fabricated rows without a database.
export function filterHandoffsAssignedTo(tasks: AdminHandoffTask[], userId: string): AdminHandoffTask[] {
  return tasks.filter((task) => task.assigneeUserId === userId && isActiveHandoffStatus(task.status));
}

// List only the caller's own assigned, non-terminal handoff tasks. Reuses
// listAdminHandoffs verbatim -- including its PII redaction/join logic --
// then narrows the result to this caller's scope. revealPii is true because a
// partner is trusted with contact details for cases assigned specifically to
// them (the same trust level admin owner/admin roles get for the full
// queue), matching how GET /api/partner/requests already reveals PII for a
// partner's own matched requests.
export async function listPartnerHandoffs(userId: string): Promise<AdminHandoffTask[]> {
  const { tasks } = await listAdminHandoffs({ revealPii: true });
  return filterHandoffsAssignedTo(tasks, userId);
}

// Update a handoff task on the partner's behalf. Ordering is the whole
// security contract here:
//   1) the action allow-list runs first, unconditionally -- it can never be
//      skipped by any runtime state, and rejects the RAG verdict outright;
//   2) ownership is verified with a read-only lookup BEFORE any mutation is
//      attempted;
//   3) only once both checks pass is the mutation delegated to
//      updateAdminHandoff, so first-response SLA bookkeeping
//      (markFirstResponse) is recorded through the exact same path the admin
//      route uses.
export async function updatePartnerHandoff(input: {
  id: string;
  userId: string;
  action: string;
}) {
  if (!isPartnerHandoffAction(input.action)) {
    throw new PartnerHandoffAssignmentError(
      "handoff_action_not_allowed",
      "This action is not permitted for partner agents",
      400,
    );
  }

  // Guards against production Supabase access in the isolated test runtime
  // (see isolatedTestRuntime in admin.ts). This never engages outside tests.
  if (isolatedTestRuntime()) throw new Error("SUPABASE_HANDOFFS_DISABLED_IN_TEST");

  const supabase = serviceClient();
  const found = await supabase
    .from("handoff_tasks")
    .select("id,handoff_metadata")
    .eq("id", input.id)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) {
    throw new PartnerHandoffAssignmentError("handoff_not_found", "Handoff task not found", 404);
  }

  const assignment = assignmentMetadata(found.data.handoff_metadata);
  assertHandoffAssignedToCaller(assignment.assigneeUserId, input.userId);

  return updateAdminHandoff({ id: input.id, action: input.action, actor: input.userId });
}
