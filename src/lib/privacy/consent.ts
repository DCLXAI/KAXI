import { createHash } from "crypto";
import { ConsentScope, ConsentStatus, Prisma, UserRole } from "@prisma/client";
import { db } from "@/lib/db";
import { recordAuditLog } from "@/lib/audit";

export const PARTNER_ROUTING_CONSENT_VERSION = "partner-routing-2026-07-01";

export const PARTNER_ROUTING_CONSENT_SCOPES = [
  ConsentScope.THIRD_PARTY_PROVISION,
  ConsentScope.PROCESSING_CONSIGNMENT,
  ConsentScope.OVERSEAS_TRANSFER,
] as const;

export type PartnerRoutingConsentScope = (typeof PARTNER_ROUTING_CONSENT_SCOPES)[number];

export interface PartnerRoutingConsentInput {
  thirdPartyProvision?: boolean;
  processingConsignment?: boolean;
  overseasTransfer?: boolean;
  version?: string;
  locale?: string;
  source?: string;
}

export interface PrivacyAuditContext {
  actor: string;
  actorRole: string;
  ip?: string | null;
  userAgent?: string | null;
}

export class ConsentRequiredError extends Error {
  readonly status = 428;
  readonly code = "CONSENT_REQUIRED";
  readonly missingScopes: PartnerRoutingConsentScope[];

  constructor(missingScopes: PartnerRoutingConsentScope[]) {
    super("Explicit partner routing consent is required.");
    this.name = "ConsentRequiredError";
    this.missingScopes = missingScopes;
  }
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function leadConsentUserKey(leadId: string): string {
  return `lead:${leadId}`;
}

function syntheticEmailForLead(leadId: string): string {
  const digest = createHash("sha256").update(leadId).digest("hex").slice(0, 24);
  return `${digest}@consent.kaxi.local`;
}

function normalizeLocale(locale: string | undefined): string {
  const value = locale?.trim().toLowerCase() || "ko";
  return /^[a-z]{2}(?:-[a-z0-9]{2,8})?$/.test(value) ? value.slice(0, 16) : "ko";
}

function normalizeVersion(version: string | undefined): string {
  const value = version?.trim() || PARTNER_ROUTING_CONSENT_VERSION;
  return value.slice(0, 80);
}

function hasExplicitPartnerRoutingConsent(input: PartnerRoutingConsentInput | null | undefined): boolean {
  return Boolean(
    input?.thirdPartyProvision &&
      input.processingConsignment &&
      input.overseasTransfer
  );
}

function partnerRoutingNotice(partnerType: string) {
  return {
    recipientCategory: "selected_partner",
    partnerType,
    dataItems: [
      "lead_id",
      "contact_or_contact_hash",
      "consultation_topic",
      "visa_or_study_context_user_provided",
    ],
    purpose: "partner_consultation_routing_and_response",
    retention: "until_request_handling_ends_plus_partner_legal_or_contract_retention",
    thirdPartyProvision: {
      required: true,
      reason: "independent_partner_service_relationship",
    },
    processingConsignment: {
      disclosed: true,
      reason: "platform_operations_and_request_handling_support",
    },
    overseasTransfer: {
      disclosed: true,
      reason: "partner_or_infrastructure_access_may_occur_outside_korea",
    },
  };
}

export async function recordPrivacyProcessingEvent(input: {
  action: string;
  targetType: string;
  targetId?: string | null;
  actorUserId?: string | null;
  context: PrivacyAuditContext;
  success?: boolean;
  metadata?: Record<string, unknown>;
}) {
  await db.auditEvent.create({
    data: {
      actorUserId: input.actorUserId || null,
      actorRole: input.context.actorRole,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId || null,
      success: input.success !== false,
      ip: input.context.ip || null,
      userAgent: input.context.userAgent || null,
      metadata: jsonValue(input.metadata || {}),
    },
  });

  await recordAuditLog({
    actor: input.context.actor,
    actorRole: input.context.actorRole,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId || null,
    ip: input.context.ip || null,
    userAgent: input.context.userAgent || null,
    success: input.success !== false,
    metadata: input.metadata || {},
  });
}

export async function ensureLeadConsentUser(leadId: string, locale = "ko") {
  const zaloUid = leadConsentUserKey(leadId);
  return db.user.upsert({
    where: { zaloUid },
    update: {
      role: UserRole.STUDENT,
      locale: normalizeLocale(locale),
    },
    create: {
      role: UserRole.STUDENT,
      locale: normalizeLocale(locale),
      zaloUid,
      email: syntheticEmailForLead(leadId),
    },
  });
}

async function activeConsentScopes(userId: string, now = new Date()): Promise<Set<PartnerRoutingConsentScope>> {
  const consents = await db.consent.findMany({
    where: {
      userId,
      scope: { in: [...PARTNER_ROUTING_CONSENT_SCOPES] },
      status: ConsentStatus.GRANTED,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { grantedAt: "desc" },
  });

  return new Set(consents.map((consent) => consent.scope as PartnerRoutingConsentScope));
}

export async function ensurePartnerRoutingConsentForLead(input: {
  leadId: string;
  partnerType: string;
  consent?: PartnerRoutingConsentInput | null;
  context: PrivacyAuditContext;
}) {
  const locale = normalizeLocale(input.consent?.locale);
  const version = normalizeVersion(input.consent?.version);
  const user = await ensureLeadConsentUser(input.leadId, locale);
  const notice = partnerRoutingNotice(input.partnerType);
  const now = new Date();
  let grantedNow = false;

  if (hasExplicitPartnerRoutingConsent(input.consent)) {
    await db.$transaction(
      PARTNER_ROUTING_CONSENT_SCOPES.map((scope) =>
        db.consent.create({
          data: {
            userId: user.id,
            scope,
            status: ConsentStatus.GRANTED,
            version,
            locale,
            grantedAt: now,
            evidenceJson: jsonValue({
              leadId: input.leadId,
              partnerType: input.partnerType,
              source: input.consent?.source || "partner-request-form",
              notice,
              explicit: true,
              consentedAt: now.toISOString(),
              ip: input.context.ip || null,
              userAgent: input.context.userAgent || null,
            }),
          },
        })
      )
    );

    grantedNow = true;
    await recordPrivacyProcessingEvent({
      action: "privacy.consent.granted",
      targetType: "Consent",
      targetId: user.id,
      actorUserId: user.id,
      context: input.context,
      metadata: {
        leadId: input.leadId,
        partnerType: input.partnerType,
        scopes: PARTNER_ROUTING_CONSENT_SCOPES,
        version,
        locale,
        notice,
      },
    });
  }

  const activeScopes = await activeConsentScopes(user.id);
  const missingScopes = PARTNER_ROUTING_CONSENT_SCOPES.filter((scope) => !activeScopes.has(scope));
  if (missingScopes.length > 0) {
    await recordPrivacyProcessingEvent({
      action: "privacy.consent.missing",
      targetType: "Lead",
      targetId: input.leadId,
      actorUserId: user.id,
      context: input.context,
      success: false,
      metadata: {
        leadId: input.leadId,
        partnerType: input.partnerType,
        requiredScopes: PARTNER_ROUTING_CONSENT_SCOPES,
        missingScopes,
      },
    });
    throw new ConsentRequiredError(missingScopes);
  }

  return {
    userId: user.id,
    grantedNow,
    scopes: [...activeScopes],
    version,
    locale,
    notice,
  };
}

export async function withdrawLeadConsentsForPrivacyRequest(input: {
  leadIds: string[];
  context: PrivacyAuditContext;
  reason: string;
}) {
  const leadIds = [...new Set(input.leadIds.filter(Boolean))];
  if (leadIds.length === 0) return { users: 0, consents: 0 };

  const users = await db.user.findMany({
    where: { zaloUid: { in: leadIds.map(leadConsentUserKey) } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return { users: 0, consents: 0 };

  const now = new Date();
  const result = await db.consent.updateMany({
    where: {
      userId: { in: userIds },
      status: ConsentStatus.GRANTED,
    },
    data: {
      status: ConsentStatus.WITHDRAWN,
      withdrawnAt: now,
    },
  });

  if (result.count > 0) {
    await recordPrivacyProcessingEvent({
      action: "privacy.consent.withdrawn",
      targetType: "Consent",
      targetId: userIds.join(",").slice(0, 190),
      context: input.context,
      metadata: {
        leadIds,
        reason: input.reason,
        users: userIds.length,
        consents: result.count,
      },
    });
  }

  return { users: userIds.length, consents: result.count };
}

export async function expireLeadConsentsForRetention(input: {
  leadIds: string[];
  context: PrivacyAuditContext;
  reason: string;
}) {
  const leadIds = [...new Set(input.leadIds.filter(Boolean))];
  if (leadIds.length === 0) return { users: 0, consents: 0 };

  const users = await db.user.findMany({
    where: { zaloUid: { in: leadIds.map(leadConsentUserKey) } },
    select: { id: true },
  });
  const userIds = users.map((user) => user.id);
  if (userIds.length === 0) return { users: 0, consents: 0 };

  const now = new Date();
  const result = await db.consent.updateMany({
    where: {
      userId: { in: userIds },
      status: ConsentStatus.GRANTED,
    },
    data: {
      status: ConsentStatus.EXPIRED,
      expiresAt: now,
    },
  });

  if (result.count > 0) {
    await recordPrivacyProcessingEvent({
      action: "privacy.consent.expired",
      targetType: "Consent",
      targetId: userIds.join(",").slice(0, 190),
      context: input.context,
      metadata: {
        leadIds,
        reason: input.reason,
        users: userIds.length,
        consents: result.count,
      },
    });
  }

  return { users: userIds.length, consents: result.count };
}
