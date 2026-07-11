import { createClient } from "@supabase/supabase-js";
import { db } from "@/lib/db";
import { preparePiiField, readPiiField } from "@/lib/privacy/pii";

const ACTIVE_STATUSES = new Set(["open", "review", "contact_requested", "contact_received", "assigned", "in_progress"]);
const ACTIONS = new Set(["assign", "start", "contacted", "resolve", "close", "reopen"]);

export type HandoffAction = "assign" | "start" | "contacted" | "resolve" | "close" | "reopen";

export type AdminHandoffTask = {
  id: string;
  sessionId: string;
  tenantId: string;
  status: string;
  riskLevel: string;
  leadStage: string;
  assignee: string | null;
  assigneeUserId: string | null;
  organizationId: string | null;
  assignedAt: string | null;
  slaPolicy: string | null;
  slaTier: string | null;
  slaMinutes: number | null;
  slaDueAt: string | null;
  slaStatus: string | null;
  question: string;
  answer: string;
  notes: string | null;
  source: string;
  locale: string;
  leadId: string | null;
  leadStatus: string | null;
  contactId: string | null;
  contactType: string | null;
  contactValue: string | null;
  contactName: string | null;
  hasContact: boolean;
  sources: Array<{ title?: string; source?: string; sourceUrl?: string; checkedAt?: string }>;
  contactReceivedAt: string | null;
  consentAcceptedAt: string | null;
  consentNoticeVersion: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
};

export type AdminHandoffAssignee = {
  id: string;
  email: string | null;
  organizationId: string;
  organizationName: string;
};

type LeadRow = {
  id: string;
  locale?: string | null;
  source?: string | null;
  status?: string | null;
  name?: string | null;
  name_ciphertext?: string | null;
  question?: string | null;
  question_ciphertext?: string | null;
  answer?: string | null;
  answer_ciphertext?: string | null;
  notes?: string | null;
  notes_ciphertext?: string | null;
};

type ContactRow = {
  id: string;
  contact_type?: string | null;
  contact_value?: string | null;
  contact_ciphertext?: string | null;
  name?: string | null;
  name_ciphertext?: string | null;
  status?: string | null;
};

type MessageRow = { id: string | number; sources_json?: string | null };
type ConsentRow = {
  session_id: string;
  accepted_at?: string | null;
  notice_version?: string | null;
};

function isolatedTestRuntime() {
  const runtimeDatabase = process.env.DATABASE_URL?.trim() || "";
  return Boolean(
    process.env.TEST_DATABASE_URL &&
    /^postgres(?:ql)?:\/\/(?:[^@]+@)?(?:localhost|127\.0\.0\.1|\[::1\])/i.test(runtimeDatabase),
  );
}

function serviceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!url || !key) throw new Error("SUPABASE_HANDOFFS_NOT_CONFIGURED");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function text(value: unknown) {
  return typeof value === "string" ? value : value == null ? null : String(value);
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function finiteInteger(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null;
}

function assignmentMetadata(value: unknown) {
  const metadata = record(value);
  const assignment = record(metadata.assignment);
  const sla = record(metadata.sla);
  return {
    assigneeUserId: text(assignment.assigneeUserId),
    organizationId: text(assignment.organizationId),
    assignedAt: text(assignment.assignedAt),
    slaPolicy: text(sla.policyVersion),
    slaTier: text(sla.tier),
    slaMinutes: finiteInteger(sla.minutes),
    slaDueAt: text(sla.dueAt),
    slaStatus: text(sla.status),
  };
}

function resolvedSlaStatus(taskStatus: string, dueAt: string | null, storedStatus: string | null) {
  if (["resolved", "closed", "duplicate"].includes(taskStatus)) return storedStatus || "completed";
  if (storedStatus && storedStatus !== "pending") return storedStatus;
  if (dueAt && new Date(dueAt).getTime() < Date.now()) return "overdue";
  return dueAt ? "pending" : null;
}

function markFirstResponse(value: unknown, respondedAt: Date) {
  const metadata = record(value);
  const sla = record(metadata.sla);
  const dueAt = text(sla.dueAt);
  if (!dueAt || text(sla.firstResponseAt)) return null;
  const breached = respondedAt.getTime() > new Date(dueAt).getTime();
  return {
    ...metadata,
    sla: {
      ...sla,
      status: breached ? "breached" : "met",
      firstResponseAt: respondedAt.toISOString(),
      ...(breached ? { breachedAt: respondedAt.toISOString() } : {}),
    },
  };
}

function parseSources(value: unknown): AdminHandoffTask["sources"] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && typeof item === "object").slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function readableField(
  revealPii: boolean,
  plaintext: unknown,
  ciphertext: unknown,
) {
  const safePlaintext = text(plaintext);
  return revealPii ? readPiiField(safePlaintext, text(ciphertext)) : safePlaintext;
}

export async function listAdminHandoffs(options: { revealPii: boolean; limit?: number }) {
  if (isolatedTestRuntime()) {
    return {
      tasks: [] as AdminHandoffTask[],
      assignees: [] as AdminHandoffAssignee[],
      counts: { total: 0, active: 0, urgent: 0, unassigned: 0, contactReady: 0, overdue: 0 },
    };
  }

  const supabase = serviceClient();
  const [tasksResult, partnerUsers] = await Promise.all([
    supabase
      .from("handoff_tasks")
      .select("id,source_chat_message_id,session_id,tenant_id,question,question_ciphertext,answer,answer_ciphertext,risk_level,lead_stage,status,assignee,notes,notes_ciphertext,lead_id,lead_contact_id,contact_received_at,handoff_metadata,created_at,updated_at,closed_at")
      .order("created_at", { ascending: false })
      .limit(Math.min(200, Math.max(1, Math.trunc(options.limit || 100)))),
    db.user.findMany({
      where: { role: "PARTNER_AGENT", organization: { type: "PARTNER_AGENT_OFFICE" } },
      select: { id: true, email: true, organizationId: true, organization: { select: { name: true } } },
      orderBy: { email: "asc" },
    }),
  ]);
  if (tasksResult.error) throw tasksResult.error;
  const taskRows = tasksResult.data || [];

  const leadIds = [...new Set(taskRows.map((row) => text(row.lead_id)).filter(Boolean))] as string[];
  const contactIds = [...new Set(taskRows.map((row) => text(row.lead_contact_id)).filter(Boolean))] as string[];
  const messageIds = [...new Set(taskRows.map((row) => text(row.source_chat_message_id)).filter(Boolean))] as string[];
  const sessionIds = [...new Set(taskRows.map((row) => text(row.session_id)).filter(Boolean))] as string[];

  const [leadRows, contactRows, messageRows, consentRows] = await Promise.all([
    (async () => {
      if (leadIds.length === 0) return [] as LeadRow[];
      const result = await supabase.from("leads").select("id,locale,source,status,name,name_ciphertext,question,question_ciphertext,answer,answer_ciphertext,notes,notes_ciphertext").in("id", leadIds);
      if (result.error) throw result.error;
      return (result.data || []) as LeadRow[];
    })(),
    (async () => {
      if (contactIds.length === 0) return [] as ContactRow[];
      const result = await supabase.from("lead_contacts").select("id,contact_type,contact_value,contact_ciphertext,name,name_ciphertext,status").in("id", contactIds);
      if (result.error) throw result.error;
      return (result.data || []) as ContactRow[];
    })(),
    (async () => {
      if (messageIds.length === 0) return [] as MessageRow[];
      const result = await supabase.from("chat_messages").select("id,sources_json").in("id", messageIds);
      if (result.error) throw result.error;
      return (result.data || []) as MessageRow[];
    })(),
    (async () => {
      if (sessionIds.length === 0) return [] as ConsentRow[];
      const result = await supabase
        .from("handoff_consent_evidence")
        .select("session_id,accepted_at,notice_version")
        .in("session_id", sessionIds)
        .eq("accepted", true)
        .order("accepted_at", { ascending: false });
      if (result.error) {
        if (result.error.code === "42P01" || result.error.code === "PGRST205") return [] as ConsentRow[];
        throw result.error;
      }
      return (result.data || []) as ConsentRow[];
    })(),
  ]);

  const leads = new Map<string, LeadRow>(leadRows.map((row) => [String(row.id), row] as const));
  const contacts = new Map<string, ContactRow>(contactRows.map((row) => [String(row.id), row] as const));
  const messages = new Map<string, MessageRow>(messageRows.map((row) => [String(row.id), row] as const));
  const consents = new Map<string, ConsentRow>();
  for (const row of consentRows) {
    if (!consents.has(String(row.session_id))) consents.set(String(row.session_id), row);
  }

  const tasks = taskRows.map((row): AdminHandoffTask => {
    const lead = row.lead_id ? leads.get(String(row.lead_id)) : undefined;
    const contact = row.lead_contact_id ? contacts.get(String(row.lead_contact_id)) : undefined;
    const message = row.source_chat_message_id ? messages.get(String(row.source_chat_message_id)) : undefined;
    const consent = consents.get(String(row.session_id));
    const question = readableField(options.revealPii, row.question, row.question_ciphertext)
      || readableField(options.revealPii, lead?.question, lead?.question_ciphertext)
      || "";
    const answer = readableField(options.revealPii, row.answer, row.answer_ciphertext)
      || readableField(options.revealPii, lead?.answer, lead?.answer_ciphertext)
      || "";
    const notes = readableField(options.revealPii, row.notes, row.notes_ciphertext)
      || readableField(options.revealPii, lead?.notes, lead?.notes_ciphertext);
    const contactValue = readableField(options.revealPii, contact?.contact_value, contact?.contact_ciphertext);
    const contactName = readableField(options.revealPii, contact?.name || lead?.name, contact?.name_ciphertext || lead?.name_ciphertext);
    const assignment = assignmentMetadata(row.handoff_metadata);
    const status = String(row.status || "open");

    return {
      id: String(row.id),
      sessionId: String(row.session_id),
      tenantId: String(row.tenant_id || "default"),
      status,
      riskLevel: String(row.risk_level || "medium"),
      leadStage: String(row.lead_stage || "review"),
      assignee: text(row.assignee),
      assigneeUserId: assignment.assigneeUserId,
      organizationId: assignment.organizationId,
      assignedAt: assignment.assignedAt,
      slaPolicy: assignment.slaPolicy,
      slaTier: assignment.slaTier,
      slaMinutes: assignment.slaMinutes,
      slaDueAt: assignment.slaDueAt,
      slaStatus: resolvedSlaStatus(status, assignment.slaDueAt, assignment.slaStatus),
      question,
      answer,
      notes,
      source: String(lead?.source || "kaxi-site"),
      locale: String(lead?.locale || "ko"),
      leadId: text(row.lead_id),
      leadStatus: text(lead?.status),
      contactId: text(row.lead_contact_id),
      contactType: text(contact?.contact_type),
      contactValue,
      contactName,
      hasContact: Boolean(contactValue),
      sources: parseSources(message?.sources_json),
      contactReceivedAt: text(row.contact_received_at),
      consentAcceptedAt: text(consent?.accepted_at),
      consentNoticeVersion: text(consent?.notice_version),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      closedAt: text(row.closed_at),
    };
  });

  const active = tasks.filter((task) => ACTIVE_STATUSES.has(task.status));
  return {
    tasks,
    assignees: partnerUsers
      .filter((user): user is typeof user & { organizationId: string } => Boolean(user.organizationId))
      .map((user) => ({
        id: user.id,
        email: user.email,
        organizationId: user.organizationId,
        organizationName: user.organization?.name || user.organizationId,
      })),
    counts: {
      total: tasks.length,
      active: active.length,
      urgent: active.filter((task) => task.riskLevel === "high" || task.leadStage === "urgent").length,
      unassigned: active.filter((task) => !task.assignee).length,
      contactReady: active.filter((task) => task.hasContact).length,
      overdue: active.filter((task) => task.slaStatus === "overdue").length,
    },
  };
}

export async function updateAdminHandoff(input: {
  id: string;
  action: HandoffAction;
  actor: string;
  assignee?: string;
  assigneeUserId?: string;
  organizationId?: string;
  slaMinutes?: number;
  slaPolicy?: string;
  note?: string;
}) {
  if (isolatedTestRuntime()) throw new Error("SUPABASE_HANDOFFS_DISABLED_IN_TEST");
  if (!ACTIONS.has(input.action)) throw new Error("HANDOFF_ACTION_INVALID");
  const supabase = serviceClient();
  const found = await supabase
    .from("handoff_tasks")
    .select("id,status,risk_level,lead_stage,assignee,lead_id,lead_contact_id,contact_received_at,handoff_metadata")
    .eq("id", input.id)
    .maybeSingle();
  if (found.error) throw found.error;
  if (!found.data) throw new Error("HANDOFF_NOT_FOUND");

  const now = new Date();
  const nowIso = now.toISOString();
  const update: Record<string, unknown> = {};
  let assignee = input.assignee?.trim().slice(0, 160);
  if (input.action === "assign") {
    const assigneeUserId = input.assigneeUserId?.trim();
    if (!assigneeUserId) throw new Error("HANDOFF_ASSIGNEE_INVALID");
    const user = await db.user.findUnique({
      where: { id: assigneeUserId },
      include: { organization: true },
    });
    if (
      !user
      || user.role !== "PARTNER_AGENT"
      || !user.organizationId
      || user.organization?.type !== "PARTNER_AGENT_OFFICE"
      || (input.organizationId && input.organizationId !== user.organizationId)
    ) {
      throw new Error("HANDOFF_ASSIGNEE_INVALID");
    }
    assignee = user.email || user.id;
    const requestedMinutes = finiteInteger(input.slaMinutes);
    const defaultMinutes = found.data.risk_level === "high" || found.data.lead_stage === "urgent" ? 120 : 1440;
    const slaMinutes = requestedMinutes ?? defaultMinutes;
    if (slaMinutes < 15 || slaMinutes > 10_080) throw new Error("HANDOFF_SLA_INVALID");
    const dueAt = new Date(now.getTime() + slaMinutes * 60_000);
    update.handoff_metadata = {
      ...record(found.data.handoff_metadata),
      assignment: {
        organizationId: user.organizationId,
        assigneeUserId: user.id,
        assignedAt: nowIso,
        assignedBy: input.actor.slice(0, 160),
      },
      sla: {
        policyVersion: input.slaPolicy?.trim().slice(0, 80) || "kaxi-handoff-v1",
        tier: slaMinutes === 120 ? "urgent-2h" : slaMinutes === 1440 ? "standard-24h" : "custom",
        minutes: slaMinutes,
        startsAt: nowIso,
        dueAt: dueAt.toISOString(),
        status: "pending",
      },
    };
    update.assignee = assignee;
    update.status = found.data.status === "open" ? "review" : found.data.status;
  } else if (input.action === "start") {
    update.assignee = assignee || found.data.assignee || input.actor.slice(0, 160);
    update.status = "in_progress";
    update.closed_at = null;
    const metadata = markFirstResponse(found.data.handoff_metadata, now);
    if (metadata) update.handoff_metadata = metadata;
  } else if (input.action === "contacted") {
    if (!found.data.lead_contact_id) throw new Error("HANDOFF_CONTACT_REQUIRED");
    update.assignee = assignee || found.data.assignee || input.actor.slice(0, 160);
    update.status = "in_progress";
    update.closed_at = null;
    const metadata = markFirstResponse(found.data.handoff_metadata, now);
    if (metadata) update.handoff_metadata = metadata;
  } else if (input.action === "resolve") {
    update.status = "resolved";
    update.closed_at = nowIso;
  } else if (input.action === "close") {
    update.status = "closed";
    update.closed_at = nowIso;
  } else if (input.action === "reopen") {
    update.status = found.data.contact_received_at ? "contact_received" : "open";
    update.closed_at = null;
  }

  if (input.note?.trim()) {
    const protectedNote = preparePiiField(input.note, { kind: "text", maxPlainLength: 2_000 });
    update.notes = protectedNote.plaintext;
    update.notes_ciphertext = protectedNote.ciphertext;
    update.notes_hash = protectedNote.hash;
    update.notes_redacted = protectedNote.redacted;
  }

  const updated = await supabase
    .from("handoff_tasks")
    .update(update)
    .eq("id", input.id)
    .select("id,status,assignee,lead_id,lead_contact_id,closed_at,updated_at")
    .single();
  if (updated.error) throw updated.error;

  const leadStatus = input.action === "contacted"
    ? "contacted"
    : input.action === "resolve"
      ? "resolved"
      : input.action === "close"
        ? "closed"
        : input.action === "reopen"
          ? "contact_received"
          : input.action === "start"
            ? "in_progress"
            : null;
  if (found.data.lead_id && leadStatus) {
    const leadUpdate = await supabase.from("leads").update({ status: leadStatus }).eq("id", found.data.lead_id);
    if (leadUpdate.error) throw leadUpdate.error;
  }
  if (found.data.lead_contact_id && input.action === "contacted") {
    const contactUpdate = await supabase.from("lead_contacts").update({ status: "contacted" }).eq("id", found.data.lead_contact_id);
    if (contactUpdate.error) throw contactUpdate.error;
  }
  if (found.data.lead_contact_id && (input.action === "resolve" || input.action === "close")) {
    const contactUpdate = await supabase.from("lead_contacts").update({ status: "handled" }).eq("id", found.data.lead_contact_id);
    if (contactUpdate.error) throw contactUpdate.error;
  }

  return {
    id: String(updated.data.id),
    status: String(updated.data.status),
    assignee: text(updated.data.assignee),
    closedAt: text(updated.data.closed_at),
    updatedAt: String(updated.data.updated_at),
  };
}
