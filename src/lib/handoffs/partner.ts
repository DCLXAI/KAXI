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

// Pure guard: a partner may only ever `start`/`contacted` a task that is
// still non-terminal. Without this, updatePartnerHandoff has no check that
// stops a partner from calling `start` on their own already-resolved/closed/
// duplicate task -- which is an admin-only reopen capability, not a
// legitimate partner action. isActiveHandoffStatus's active set is exactly
// the complement of {resolved, closed, duplicate} across every status this
// queue uses, so "not active" and "terminal" are the same check here.
// Exported so the guard is unit-testable without a database.
export function assertHandoffNotTerminal(status: string): void {
  if (!isActiveHandoffStatus(status)) {
    throw new PartnerHandoffAssignmentError(
      "handoff_terminal",
      "This handoff task has already been finalized and cannot be reopened",
      409,
    );
  }
}

// Partner-safe projection of AdminHandoffTask. Strips contact PII (contact
// value/name/type, and the raw session/lead/message ids they hang off of)
// and every RAG verdict/retrieval internal (resolutionCode, evaluationCaseId,
// evaluationActive, retrievalRunId/Category, topScore, similarityThreshold,
// noContext[Reason]) per docs/OPERATIONS.md: "Do not expose question or
// contact details in a partner workspace unless the applicable third-party
// and handoff-consent requirements are satisfied." hasContact is kept as a
// plain boolean (not a PII value) so the "mark contacted" action can still be
// gated in the partner UI.
export type PartnerHandoffTask = {
  id: string;
  status: string;
  riskLevel: string;
  slaTier: string | null;
  slaMinutes: number | null;
  slaDueAt: string | null;
  slaStatus: string | null;
  question: string;
  hasContact: boolean;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export function serializePartnerHandoffTask(task: AdminHandoffTask): PartnerHandoffTask {
  return {
    id: task.id,
    status: task.status,
    riskLevel: task.riskLevel,
    slaTier: task.slaTier,
    slaMinutes: task.slaMinutes,
    slaDueAt: task.slaDueAt,
    slaStatus: task.slaStatus,
    question: task.question,
    hasContact: task.hasContact,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
    closedAt: task.closedAt,
  };
}

// List only the caller's own assigned, non-terminal handoff tasks, scoped at
// the QUERY level (see listAdminHandoffs' assigneeUserId filter) so a
// partner's own task cannot silently drop off a global newest-100 window.
// filterHandoffsAssignedTo still runs as a defense-in-depth second pass for
// the active-status narrowing. revealPii is false: no per-task
// handoff-consent check exists yet to gate PII reveal the way
// assignPartnerRequest gates on consent scopes (src/lib/partners/
// assignment.ts:65-78), so this defaults to the safe side -- no PII --
// rather than ever defaulting to reveal. The result is the whitelisted
// PartnerHandoffTask shape, not the raw AdminHandoffTask (which carries RAG
// verdict/retrieval internals no partner may see).
export async function listPartnerHandoffs(userId: string): Promise<PartnerHandoffTask[]> {
  const { tasks } = await listAdminHandoffs({ revealPii: false, assigneeUserId: userId });
  return filterHandoffsAssignedTo(tasks, userId).map(serializePartnerHandoffTask);
}

// Known updateAdminHandoff failure codes that are reachable from a partner's
// allowed actions (start/contacted) and represent an ordinary precondition
// failure, not a genuinely unexpected error. updateAdminHandoff throws plain
// Errors (not PartnerHandoffAssignmentError) for these, so without this map
// they fall through to a generic 500 in the route instead of a 4xx.
const KNOWN_ADMIN_HANDOFF_ERROR_STATUS: Record<string, number> = {
  HANDOFF_CONTACT_REQUIRED: 409,
};

// Update a handoff task on the partner's behalf. Ordering is the whole
// security contract here:
//   1) the action allow-list runs first, unconditionally -- it can never be
//      skipped by any runtime state, and rejects the RAG verdict outright;
//   2) ownership is verified with a read-only lookup BEFORE any mutation is
//      attempted;
//   3) the task must be non-terminal -- otherwise "start" is a reopen
//      primitive a partner could use on their own resolved/closed/duplicate
//      task, which is an admin-only capability;
//   4) only once all three checks pass is the mutation delegated to
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
    .select("id,status,handoff_metadata")
    .eq("id", input.id)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) {
    throw new PartnerHandoffAssignmentError("handoff_not_found", "Handoff task not found", 404);
  }

  const assignment = assignmentMetadata(found.data.handoff_metadata);
  assertHandoffAssignedToCaller(assignment.assigneeUserId, input.userId);
  assertHandoffNotTerminal(String(found.data.status));

  try {
    return await updateAdminHandoff({ id: input.id, action: input.action, actor: input.userId });
  } catch (error) {
    if (error instanceof PartnerHandoffAssignmentError) throw error;
    const code = error instanceof Error ? error.message : "";
    const status = KNOWN_ADMIN_HANDOFF_ERROR_STATUS[code];
    if (status) {
      throw new PartnerHandoffAssignmentError(code.toLowerCase(), error instanceof Error ? error.message : "Request could not be completed", status);
    }
    throw error;
  }
}
