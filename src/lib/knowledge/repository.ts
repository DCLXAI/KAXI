import { createHash } from "crypto";
import { Prisma } from "@prisma/client";
import type { Lang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import {
  getKnowledgeDocsWithMetadata,
  getRagDocumentMetadata,
  KNOWLEDGE_DOCS,
  pickLangText,
  type KnowledgeDoc,
  type RagDocumentMetadata,
  type ReviewStatus,
  type SourceType,
} from "@/lib/data/knowledge";

type KnowledgeDocumentWithChunks = Prisma.KnowledgeDocumentGetPayload<{
  include: { chunks: true };
}>;

type ComplianceRuleVersionWithRule = Prisma.ComplianceRuleVersionGetPayload<{
  include: { rule: true };
}>;

export interface KnowledgeImpactRule {
  id: string;
  ruleId: string;
  code: string;
  version: number;
  reviewStatus: string;
  sourceRefs: string[];
}

export interface KnowledgeImpactUser {
  chatLogId: string;
  createdAt: string;
  lang: string;
  source: string;
}

export interface KnowledgeImpactSummary {
  sourceDocIds: string[];
  ruleCount: number;
  userCount: number;
  rules: KnowledgeImpactRule[];
  users: KnowledgeImpactUser[];
}

export interface KnowledgeDiffSummary {
  changed: boolean;
  addedChunks: number;
  removedChunks: number;
  unchangedChunks: number;
  currentChunkCount: number;
  candidateChunkCount: number;
  candidateContentHash: string;
  impact: KnowledgeImpactSummary;
}

export interface ProductionKnowledgeDocs {
  docs: KnowledgeDoc[];
  source: "db" | "static" | "mixed";
  signature: string;
}

interface KnowledgeMutationInput {
  docId: string;
  actor: string;
  title?: string;
  content?: string;
  sourceUrl?: string;
  sourceType?: string;
  language?: string;
  jurisdiction?: string;
  topic?: string;
  supersedes?: unknown;
  supersededBy?: string | null;
  now?: Date;
}

interface KnowledgeCandidate {
  docId: string;
  title: string;
  content: string;
  sourceUrl: string;
  sourceType: SourceType;
  language: string;
  jurisdiction: "KR" | "KAXI";
  topic: KnowledgeDoc["category"];
  validFrom: Date;
  supersedes: string[];
  supersededBy: string | null;
}

const KNOWLEDGE_CATEGORIES = new Set<KnowledgeDoc["category"]>([
  "visa",
  "cost",
  "documents",
  "school",
  "legal",
  "process",
  "warning",
]);

const SOURCE_TYPES = new Set<SourceType>([
  "official_government",
  "official_law",
  "internal_analysis",
  "internal_policy",
]);

const KOREA_TIME_ZONE = "Asia/Seoul";

function dateInKorea(value: Date): string {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  const part = (type: string) => parts.find((item) => item.type === type)?.value || "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function toDateOnly(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return dateInKorea(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return dateInKorea(date);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function reviewAfterDate(lastCheckedAt: Date): string {
  const days = Number.parseInt(process.env.KNOWLEDGE_REVIEW_AFTER_DAYS || "92", 10);
  return toDateOnly(addDays(lastCheckedAt, Number.isFinite(days) && days > 0 ? days : 92)) || "2099-12-31";
}

function normalizeSourceType(value: string | null | undefined): SourceType {
  return SOURCE_TYPES.has(value as SourceType) ? (value as SourceType) : "internal_analysis";
}

function normalizeJurisdiction(value: string | null | undefined): "KR" | "KAXI" {
  return value === "KAXI" ? "KAXI" : "KR";
}

function normalizeTopic(value: string | null | undefined): KnowledgeDoc["category"] {
  return KNOWLEDGE_CATEGORIES.has(value as KnowledgeDoc["category"])
    ? (value as KnowledgeDoc["category"])
    : "process";
}

function normalizeReviewStatus(value: string): ReviewStatus {
  if (value === "APPROVED") return "approved";
  if (value === "REJECTED") return "deprecated";
  return "needs_review";
}

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function inputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function sameLangText(value: string) {
  return { ko: value, vi: value, mn: value, en: value };
}

function staticDocContent(doc: KnowledgeDoc): string {
  return (["ko", "en", "vi", "mn"] as Lang[])
    .map((lang) => `# ${pickLangText(doc.title, lang)}\n${pickLangText(doc.content, lang)}`)
    .join("\n\n");
}

function splitKnowledgeChunks(content: string, maxChars = 2800): string[] {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (paragraphs.length === 0) return [content.trim()].filter(Boolean);

  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if ((current + "\n\n" + paragraph).trim().length > maxChars && current) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = [current, paragraph].filter(Boolean).join("\n\n");
    }
  }
  if (current.trim()) chunks.push(current.trim());

  return chunks.flatMap((chunk) => {
    if (chunk.length <= maxChars) return [chunk];
    const parts: string[] = [];
    for (let i = 0; i < chunk.length; i += maxChars) {
      parts.push(chunk.slice(i, i + maxChars));
    }
    return parts;
  });
}

function sourceLabelFromUrl(sourceUrl: string, fallback: string): string {
  const url = sourceUrl.toLowerCase();
  if (url.includes("hikorea.go.kr")) return "하이코리아";
  if (url.includes("studyinkorea")) return "Study in Korea";
  if (url.includes("immigration") || url.includes("visa.go.kr")) return "법무부";
  if (url.includes("moe.go.kr")) return "교육부";
  if (url.includes("law.go.kr")) return "국가법령정보센터";
  if (url.includes("topik.go.kr")) return "국립국제교육원/TOPIK";
  if (url.startsWith("internal://")) return "KAXI";
  return fallback;
}

function sourceOwner(sourceType: SourceType): "official" | "internal" {
  return sourceType.startsWith("official_") ? "official" : "internal";
}

const MONITOR_CANDIDATE_SUFFIX_RE = /__candidate__[a-f0-9]{12,}$/i;
const REVIEW_CANDIDATE_TITLE_RE = /^\s*\[검토 후보\]\s*/;

function publicDocIdForDocument(document: KnowledgeDocumentWithChunks): string {
  const supersedes = asStringArray(document.supersedes);
  if (MONITOR_CANDIDATE_SUFFIX_RE.test(document.docId) && supersedes.length > 0) {
    return supersedes[0];
  }
  return document.docId.replace(MONITOR_CANDIDATE_SUFFIX_RE, "");
}

function publicTitleForDocument(document: KnowledgeDocumentWithChunks): string {
  return document.title.replace(REVIEW_CANDIDATE_TITLE_RE, "").trim() || document.title;
}

export function toRagMetadataFromDocument(
  document: KnowledgeDocumentWithChunks,
  lang: Lang = "ko"
): RagDocumentMetadata {
  const topic = normalizeTopic(document.topic);
  const sourceType = normalizeSourceType(document.sourceType);
  const docId = publicDocIdForDocument(document);
  const supersedes = asStringArray(document.supersedes).filter((item) => item !== docId);
  return {
    doc_id: docId,
    title: publicTitleForDocument(document),
    source_url: document.sourceUrl,
    source_type: sourceType,
    language: lang,
    jurisdiction: normalizeJurisdiction(document.jurisdiction),
    topic,
    valid_from: toDateOnly(document.validFrom) || "1970-01-01",
    valid_to: toDateOnly(document.validTo),
    last_checked_at: toDateOnly(document.lastCheckedAt) || "1970-01-01",
    checked_by: document.checkedBy,
    review_status: normalizeReviewStatus(document.reviewStatus),
    supersedes,
    superseded_by: document.supersededBy,
    review_after: reviewAfterDate(document.lastCheckedAt),
    source_label: sourceLabelFromUrl(document.sourceUrl, document.title),
    owner: sourceOwner(sourceType),
  };
}

export function toKnowledgeDocFromDocument(document: KnowledgeDocumentWithChunks): KnowledgeDoc {
  const content =
    document.chunks
      .slice()
      .sort((a, b) => a.chunkIndex - b.chunkIndex)
      .map((chunk) => chunk.content.trim())
      .filter(Boolean)
      .join("\n\n") || document.title;
  const topic = normalizeTopic(document.topic);
  const publicDocId = publicDocIdForDocument(document);
  const publicTitle = publicTitleForDocument(document);
  return {
    id: publicDocId,
    category: topic,
    title: sameLangText(publicTitle),
    keywords: Array.from(
      new Set(
        [
          publicDocId,
          document.docId,
          publicTitle,
          document.title,
          document.topic,
          document.sourceType,
          document.sourceUrl,
          sourceLabelFromUrl(document.sourceUrl, document.title),
        ]
          .join(" ")
          .toLowerCase()
          .split(/[\s/.:_-]+/)
          .filter((item) => item.length > 1)
      )
    ),
    content: sameLangText(content),
    source: document.sourceUrl || document.docId,
    ragMeta: toRagMetadataFromDocument(document, "ko"),
  };
}

function isApprovedCurrent(document: KnowledgeDocumentWithChunks, now = new Date()): boolean {
  return (
    document.reviewStatus === "APPROVED" &&
    !document.supersededBy &&
    document.validFrom.getTime() <= now.getTime() &&
    (!document.validTo || document.validTo.getTime() >= now.getTime()) &&
    document.chunks.length > 0
  );
}

async function loadKnowledgeGovernanceRows(): Promise<KnowledgeDocumentWithChunks[]> {
  return db.knowledgeDocument.findMany({
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }],
  });
}

function staticDocsWithDbOverrides(
  rows: KnowledgeDocumentWithChunks[],
  now: Date
): KnowledgeDoc[] {
  const rowsByDocId = new Map(rows.map((row) => [row.docId, row]));
  const dbDocs = rows.filter((row) => isApprovedCurrent(row, now)).map(toKnowledgeDocFromDocument);
  const supersededStaticDocIds = new Set(
    rows
      .filter((row) => isApprovedCurrent(row, now))
      .flatMap((row) => asStringArray(row.supersedes))
  );
  const staticDocs = getKnowledgeDocsWithMetadata({ referenceDate: now })
    .filter((doc) => !rowsByDocId.has(doc.id) && !supersededStaticDocIds.has(doc.id))
    .map(({ sourceMeta: _sourceMeta, ...doc }) => doc);
  return [...dbDocs, ...staticDocs];
}

function docsSignature(source: ProductionKnowledgeDocs["source"], docs: KnowledgeDoc[]): string {
  return `${source}:${docs
    .map((doc) => {
      const meta = getRagDocumentMetadata(doc, "ko");
      return [doc.id, meta.review_status, meta.superseded_by || "", meta.last_checked_at, hashText(pickLangText(doc.content, "ko"))].join("@");
    })
    .join("|")}`;
}

export async function getProductionKnowledgeDocsForRag(
  options: { referenceDate?: Date; mode?: string } = {}
): Promise<ProductionKnowledgeDocs> {
  const now = options.referenceDate || new Date();
  const mode = options.mode || process.env.KNOWLEDGE_RAG_SOURCE || "governed";

  if (mode === "static") {
    const docs = getKnowledgeDocsWithMetadata({ referenceDate: now }).map(({ sourceMeta: _sourceMeta, ...doc }) => doc);
    return { docs, source: "static", signature: docsSignature("static", docs) };
  }

  const rows = await loadKnowledgeGovernanceRows();
  const approvedDbDocs = rows.filter((row) => isApprovedCurrent(row, now)).map(toKnowledgeDocFromDocument);
  if (mode === "db" || mode === "strict_db") {
    return { docs: approvedDbDocs, source: "db", signature: docsSignature("db", approvedDbDocs) };
  }

  const docs = staticDocsWithDbOverrides(rows, now);
  const source = approvedDbDocs.length > 0 ? "mixed" : "static";
  return { docs, source, signature: docsSignature(source, docs) };
}

export async function listApprovedKnowledgeDocsForRag(referenceDate = new Date()): Promise<KnowledgeDoc[]> {
  const rows = await loadKnowledgeGovernanceRows();
  return rows.filter((row) => isApprovedCurrent(row, referenceDate)).map(toKnowledgeDocFromDocument);
}

function staticDocFor(docId: string): KnowledgeDoc | undefined {
  return KNOWLEDGE_DOCS.find((doc) => doc.id === docId);
}

function existingDocumentContent(document: KnowledgeDocumentWithChunks | null | undefined): string | undefined {
  if (!document) return undefined;
  return document.chunks
    .slice()
    .sort((a, b) => a.chunkIndex - b.chunkIndex)
    .map((chunk) => chunk.content.trim())
    .filter(Boolean)
    .join("\n\n") || undefined;
}

function candidateFromInput(
  input: KnowledgeMutationInput,
  existing?: KnowledgeDocumentWithChunks | null
): KnowledgeCandidate {
  const staticDoc = staticDocFor(input.docId);
  const staticMeta = staticDoc ? getRagDocumentMetadata(staticDoc, "ko") : null;
  const title = input.title || existing?.title || (staticDoc ? pickLangText(staticDoc.title, "ko") : input.docId);
  const content = input.content || existingDocumentContent(existing) || (staticDoc ? staticDocContent(staticDoc) : title);
  return {
    docId: input.docId,
    title,
    content,
    sourceUrl: input.sourceUrl || existing?.sourceUrl || staticMeta?.source_url || "",
    sourceType: normalizeSourceType(input.sourceType || existing?.sourceType || staticMeta?.source_type),
    language: input.language || existing?.language || staticMeta?.language || "ko",
    jurisdiction: normalizeJurisdiction(input.jurisdiction || existing?.jurisdiction || staticMeta?.jurisdiction),
    topic: normalizeTopic(input.topic || existing?.topic || staticDoc?.category || staticMeta?.topic),
    validFrom: staticMeta?.valid_from
      ? new Date(staticMeta.valid_from)
      : existing?.validFrom || input.now || new Date(),
    supersedes: asStringArray(input.supersedes ?? existing?.supersedes ?? staticMeta?.supersedes),
    supersededBy: input.supersededBy ?? existing?.supersededBy ?? staticMeta?.superseded_by ?? null,
  };
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function sourceDocIdsForImpact(input: { docId: string; supersedes?: unknown }): string[] {
  return uniqueStrings([input.docId, ...asStringArray(input.supersedes)]);
}

function impactTokens(input: { docId: string; title?: string; sourceUrl?: string; topic?: string; supersedes?: unknown }): string[] {
  const sourceUrl = input.sourceUrl || "";
  const tokens = new Set<string>([
    ...sourceDocIdsForImpact(input),
    input.title || "",
    sourceUrl,
    input.topic || "",
  ]);
  const lowerUrl = sourceUrl.toLowerCase();
  const title = (input.title || "").toLowerCase();
  if (lowerUrl.includes("studyinkorea")) tokens.add("studyinkorea-visa-documents");
  if (lowerUrl.includes("immigration") || lowerUrl.includes("visa.go.kr")) tokens.add("moj-immigration-visa-navigator");
  if (lowerUrl.includes("law.go.kr") || title.includes("행정사법")) tokens.add("admin-scrivener-act");
  return uniqueStrings(Array.from(tokens)).filter((token) => token.length > 1);
}

function sourceRefsFor(version: ComplianceRuleVersionWithRule): string[] {
  return asStringArray(version.sourceRefs);
}

function matchesAnyToken(value: unknown, tokens: string[]): boolean {
  const text = JSON.stringify(value || "").toLowerCase();
  return tokens.some((token) => text.includes(token.toLowerCase()));
}

export async function calculateKnowledgeImpact(input: {
  docId: string;
  title?: string;
  sourceUrl?: string;
  topic?: string;
  supersedes?: unknown;
}): Promise<KnowledgeImpactSummary> {
  const sourceDocIds = sourceDocIdsForImpact(input);
  const tokens = impactTokens(input);
  if (tokens.length === 0) return { sourceDocIds, ruleCount: 0, userCount: 0, rules: [], users: [] };

  const [versions, chatLogs] = await Promise.all([
    db.complianceRuleVersion.findMany({ include: { rule: true }, orderBy: [{ createdAt: "desc" }] }),
    db.chatLog.findMany({
      where: {
        OR: tokens.map((token) => ({ retrievedDocs: { contains: token } })),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const rules = versions
    .filter((version) => matchesAnyToken(version.sourceRefs, tokens))
    .slice(0, 50)
    .map((version) => ({
      id: version.id,
      ruleId: version.ruleId,
      code: version.rule.code,
      version: version.version,
      reviewStatus: version.reviewStatus,
      sourceRefs: sourceRefsFor(version),
    }));

  const users = chatLogs.map((log) => ({
    chatLogId: log.id,
    createdAt: log.createdAt.toISOString(),
    lang: log.lang,
    source: log.source,
  }));

  return {
    sourceDocIds,
    ruleCount: rules.length,
    userCount: users.length,
    rules,
    users,
  };
}

export async function analyzeKnowledgeDocumentDiff(input: KnowledgeMutationInput): Promise<KnowledgeDiffSummary> {
  const existing = await db.knowledgeDocument.findUnique({
    where: { docId: input.docId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  const candidate = candidateFromInput(input, existing);
  const candidateChunks = splitKnowledgeChunks(candidate.content);
  const candidateHashes = new Set(candidateChunks.map(hashText));
  const currentHashes = new Set((existing?.chunks || []).map((chunk) => chunk.contentHash));
  const addedChunks = Array.from(candidateHashes).filter((hash) => !currentHashes.has(hash)).length;
  const removedChunks = Array.from(currentHashes).filter((hash) => !candidateHashes.has(hash)).length;
  const unchangedChunks = Array.from(candidateHashes).filter((hash) => currentHashes.has(hash)).length;

  return {
    changed: !existing || addedChunks > 0 || removedChunks > 0,
    addedChunks,
    removedChunks,
    unchangedChunks,
    currentChunkCount: existing?.chunks.length || 0,
    candidateChunkCount: candidateChunks.length,
    candidateContentHash: hashText(candidateChunks.join("\n\n")),
    impact: await calculateKnowledgeImpact({
      docId: candidate.docId,
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      topic: candidate.topic,
      supersedes: candidate.supersedes,
    }),
  };
}

export async function upsertPendingKnowledgeCandidate(input: KnowledgeMutationInput): Promise<{
  document: KnowledgeDocumentWithChunks;
  diff: KnowledgeDiffSummary;
}> {
  const now = input.now || new Date();
  const existing = await db.knowledgeDocument.findUnique({
    where: { docId: input.docId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  if (existing?.reviewStatus === "APPROVED" || existing?.reviewStatus === "REJECTED") {
    return {
      document: existing,
      diff: await analyzeKnowledgeDocumentDiff({ ...input, now }),
    };
  }
  const candidate = candidateFromInput({ ...input, now }, existing);
  const chunks = splitKnowledgeChunks(candidate.content);
  const diff = await analyzeKnowledgeDocumentDiff({ ...input, now });

  const document = await db.$transaction(async (tx) => {
    const saved = await tx.knowledgeDocument.upsert({
      where: { docId: candidate.docId },
      update: {
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        language: candidate.language,
        jurisdiction: candidate.jurisdiction,
        topic: candidate.topic,
        validFrom: candidate.validFrom,
        validTo: null,
        lastCheckedAt: now,
        checkedBy: input.actor,
        reviewStatus: "PENDING",
        supersedes: inputJson(candidate.supersedes),
        supersededBy: candidate.supersededBy,
      },
      create: {
        docId: candidate.docId,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        language: candidate.language,
        jurisdiction: candidate.jurisdiction,
        topic: candidate.topic,
        validFrom: candidate.validFrom,
        validTo: null,
        lastCheckedAt: now,
        checkedBy: input.actor,
        reviewStatus: "PENDING",
        supersedes: inputJson(candidate.supersedes),
        supersededBy: candidate.supersededBy,
      },
    });

    await tx.knowledgeChunk.deleteMany({ where: { documentId: saved.id } });
    await tx.knowledgeChunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        documentId: saved.id,
        chunkIndex,
        content,
        contentHash: hashText(content),
      })),
    });

    return tx.knowledgeDocument.findUniqueOrThrow({
      where: { id: saved.id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
  });

  return { document, diff };
}

export async function approveKnowledgeDocument(input: KnowledgeMutationInput): Promise<{
  document: KnowledgeDocumentWithChunks;
  diff: KnowledgeDiffSummary;
}> {
  const now = input.now || new Date();
  const existing = await db.knowledgeDocument.findUnique({
    where: { docId: input.docId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  const candidate = candidateFromInput({ ...input, now }, existing);
  const chunks = splitKnowledgeChunks(candidate.content);
  const diff = await analyzeKnowledgeDocumentDiff({ ...input, now });

  const document = await db.$transaction(async (tx) => {
    const saved = await tx.knowledgeDocument.upsert({
      where: { docId: candidate.docId },
      update: {
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        language: candidate.language,
        jurisdiction: candidate.jurisdiction,
        topic: candidate.topic,
        validFrom: candidate.validFrom,
        validTo: null,
        lastCheckedAt: now,
        checkedBy: input.actor,
        reviewStatus: "APPROVED",
        supersedes: inputJson(candidate.supersedes),
        supersededBy: candidate.supersededBy,
      },
      create: {
        docId: candidate.docId,
        title: candidate.title,
        sourceUrl: candidate.sourceUrl,
        sourceType: candidate.sourceType,
        language: candidate.language,
        jurisdiction: candidate.jurisdiction,
        topic: candidate.topic,
        validFrom: candidate.validFrom,
        validTo: null,
        lastCheckedAt: now,
        checkedBy: input.actor,
        reviewStatus: "APPROVED",
        supersedes: inputJson(candidate.supersedes),
        supersededBy: candidate.supersededBy,
      },
    });

    await tx.knowledgeChunk.deleteMany({ where: { documentId: saved.id } });
    await tx.knowledgeChunk.createMany({
      data: chunks.map((content, chunkIndex) => ({
        documentId: saved.id,
        chunkIndex,
        content,
        contentHash: hashText(content),
      })),
    });

    if (candidate.supersedes.length > 0) {
      const rows = await tx.knowledgeDocument.findMany({
        where: { NOT: { id: saved.id } },
        select: { id: true, docId: true, supersedes: true },
      });
      const supersededIds = rows
        .filter((row) =>
          candidate.supersedes.includes(row.docId) ||
          asStringArray(row.supersedes).some((docId) => candidate.supersedes.includes(docId))
        )
        .map((row) => row.id);
      if (supersededIds.length > 0) {
        await tx.knowledgeDocument.updateMany({
          where: { id: { in: supersededIds } },
          data: { supersededBy: saved.docId, validTo: now },
        });
      }
    }

    return tx.knowledgeDocument.findUniqueOrThrow({
      where: { id: saved.id },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
  });

  return { document, diff };
}

export async function recheckKnowledgeDocument(input: KnowledgeMutationInput): Promise<{
  document: KnowledgeDocumentWithChunks | null;
  diff: KnowledgeDiffSummary;
}> {
  const now = input.now || new Date();
  const diff = await analyzeKnowledgeDocumentDiff({ ...input, now });
  if (diff.changed) {
    const document = await db.knowledgeDocument.findUnique({
      where: { docId: input.docId },
      include: { chunks: { orderBy: { chunkIndex: "asc" } } },
    });
    return { document, diff };
  }

  const document = await db.knowledgeDocument.update({
    where: { docId: input.docId },
    data: {
      lastCheckedAt: now,
      checkedBy: input.actor,
    },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  return { document, diff };
}

export async function discardKnowledgeDocument(input: KnowledgeMutationInput): Promise<KnowledgeDocumentWithChunks> {
  const now = input.now || new Date();
  const existing = await db.knowledgeDocument.findUnique({
    where: { docId: input.docId },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
  const candidate = candidateFromInput({ ...input, now }, existing);

  const document = await db.knowledgeDocument.upsert({
    where: { docId: candidate.docId },
    update: {
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      sourceType: candidate.sourceType,
      language: candidate.language,
      jurisdiction: candidate.jurisdiction,
      topic: candidate.topic,
      validTo: now,
      lastCheckedAt: now,
      checkedBy: input.actor,
      reviewStatus: "REJECTED",
      supersededBy: input.supersededBy || candidate.supersededBy,
    },
    create: {
      docId: candidate.docId,
      title: candidate.title,
      sourceUrl: candidate.sourceUrl,
      sourceType: candidate.sourceType,
      language: candidate.language,
      jurisdiction: candidate.jurisdiction,
      topic: candidate.topic,
      validFrom: candidate.validFrom,
      validTo: now,
      lastCheckedAt: now,
      checkedBy: input.actor,
      reviewStatus: "REJECTED",
      supersedes: inputJson(candidate.supersedes),
      supersededBy: input.supersededBy || candidate.supersededBy,
    },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });

  await db.knowledgeChunk.deleteMany({ where: { documentId: document.id } });
  return db.knowledgeDocument.findUniqueOrThrow({
    where: { id: document.id },
    include: { chunks: { orderBy: { chunkIndex: "asc" } } },
  });
}
