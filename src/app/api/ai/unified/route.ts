import { NextRequest, NextResponse } from "next/server";
import { GET as getAgentStatus, POST as runActionAgent } from "@/app/api/ai/agent/route";
import { POST as runExpertConsult } from "@/app/api/ai/consult/route";
import type { Lang } from "@/lib/i18n/translations";
import {
  decideUnifiedAiRoute,
  unifiedRouteLabel,
  type UnifiedAiCapability,
  type UnifiedAiRouteDecision,
  type UnifiedExpertMode,
} from "@/lib/ai/unified-router";

export const runtime = "nodejs";
export const maxDuration = 60;

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function text(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function boolean(value: unknown): boolean {
  return value === true;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function supportedLang(value: unknown): Lang {
  return value === "vi" || value === "mn" || value === "en" ? value : "ko";
}

function expertMode(value: unknown): UnifiedExpertMode | null {
  return value === "general" || value === "visa" || value === "documents" || value === "appeal" || value === "business"
    ? value
    : null;
}

function previousCapability(value: unknown): UnifiedAiCapability | null {
  return value === "action" || value === "expert" ? value : null;
}

function forwardedRequest(req: NextRequest, body: Record<string, unknown>): NextRequest {
  const headers = new Headers(req.headers);
  headers.set("content-type", "application/json");
  headers.delete("content-length");
  return new NextRequest(req.url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function responseHeaders(response: Response): Headers {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  headers.delete("content-encoding");
  headers.delete("content-type");
  return headers;
}

function humanReviewText(lang: Lang): string {
  return {
    ko: "개별 판단이나 대행이 필요한 사안으로, 검증된 전문가 확인이 필요합니다.",
    vi: "Trường hợp này cần đánh giá cá nhân hoặc đại diện, vì vậy cần chuyên gia đã xác minh kiểm tra.",
    mn: "Энэ тохиолдолд хувь хүний үнэлгээ эсвэл төлөөлөл шаардлагатай тул баталгаажсан мэргэжилтэн шалгах хэрэгтэй.",
    en: "This case needs individual assessment or representation, so a verified expert should review it.",
  }[lang];
}

function expertPlan(lang: Lang): string[] {
  return {
    ko: ["질문 안전 분류", "공식 문서 검색", "법적 경계 확인"],
    vi: ["Phân loại an toàn", "Tìm nguồn chính thức", "Kiểm tra ranh giới pháp lý"],
    mn: ["Аюулгүй ангилал", "Албан эх сурвалж хайх", "Хуулийн хязгаар шалгах"],
    en: ["Safety classification", "Official-source search", "Legal boundary check"],
  }[lang];
}

export function normalizeExpertResponse(
  raw: Record<string, unknown>,
  decision: UnifiedAiRouteDecision,
  lang: Lang,
  question: string,
  durationMs: number,
) {
  const docs = Array.isArray(raw.retrievedDocs) ? raw.retrievedDocs.map(record) : [];
  const retrieval = record(raw.retrieval);
  const methods = stringArray(retrieval.methods);
  const backend = text(raw.backend, "expert");
  const needsHumanExpert = boolean(raw.needsHumanExpert);
  const disclaimer = text(raw.disclaimer) || text(raw.sourceNotice);
  const sources = docs.map((doc) => {
    const sourceMeta = record(doc.sourceMeta);
    const ragMeta = record(doc.ragMeta);
    const source = text(doc.source, "KAXI knowledge");
    return {
      id: text(doc.id, text(doc.title, source)),
      title: text(doc.title, source),
      label: text(sourceMeta.label, source),
      url: text(sourceMeta.url) || null,
      kind: text(sourceMeta.owner) === "internal" ? "internal" : "knowledge",
      owner: text(sourceMeta.owner) || undefined,
      verifiedAt: text(sourceMeta.verifiedAt) || text(ragMeta.last_checked_at) || undefined,
      reviewAfter: text(sourceMeta.reviewAfter) || undefined,
      sourceType: text(sourceMeta.sourceType) || undefined,
      reviewStatus: text(sourceMeta.reviewStatus) || text(ragMeta.review_status) || undefined,
      checkedBy: text(sourceMeta.checkedBy) || text(ragMeta.checked_by) || undefined,
      basis: text(doc.basis) || undefined,
      excerpt: text(doc.excerpt) || undefined,
    };
  });
  const suggestions = stringArray(raw.suggestedFollowups).map((prompt) => ({
    kind: "followup" as const,
    label: prompt,
    prompt,
  }));

  return {
    answer: text(raw.answer),
    backend,
    toolResults: docs.length > 0
      ? [{
          tool: "search_knowledge",
          args: { mode: decision.mode || "general" },
          result: docs,
          summary: `${sources.length} official sources`,
          success: true,
        }]
      : [],
    iterations: 1,
    durationMs,
    grounded: docs.length > 0,
    routing: decision,
    expert: {
      mode: decision.mode || "general",
      needsHumanExpert,
      disclaimer,
      consultationQuestion: question,
    },
    needsHumanExpert,
    escalationCaseCreated: boolean(raw.escalationCaseCreated),
    meta: {
      summary: `${unifiedRouteLabel(lang, "expert")} · ${sources.length}`,
      plan: expertPlan(lang),
      sources,
      clarifyingQuestions: [],
      suggestions,
      safetyFlags: needsHumanExpert ? [humanReviewText(lang)] : [],
      sourceNotice: disclaimer || undefined,
      quality: {
        backend,
        grounded: docs.length > 0,
        toolCount: docs.length > 0 ? 1 : 0,
        officialSourceCount: sources.length,
        retrievalBackends: methods.length > 0 ? methods : [text(retrieval.backend, "none")],
        pgvectorResultCount: boolean(retrieval.pgvectorUsed) ? Number(retrieval.resultCount || 0) : 0,
        answerSource: backend === "official-summary" ? "official-summary" as const : "llm" as const,
        intentConfidence: backend === "official-summary" ? undefined : "high" as const,
        missingSlotCount: 0,
        durationMs,
      },
    },
  };
}

export async function GET() {
  const response = await getAgentStatus();
  const data = record(await response.json());
  const backendPolicy = record(data.backendPolicy);
  const consultPolicy = record(backendPolicy.consult);
  return NextResponse.json({
    ...data,
    experience: "unified",
    capabilities: {
      action: { ready: data.ok === true },
      expert: { ready: consultPolicy.ready !== false },
    },
  }, { status: response.status, headers: responseHeaders(response) });
}

export async function POST(req: NextRequest) {
  const contentLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(contentLength) && contentLength > 100_000) {
    return NextResponse.json({ error: "Request body is too large" }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = record(await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const question = text(body.question);
  if (!question) return NextResponse.json({ error: "Question is required" }, { status: 400 });

  const lang = supportedLang(body.lang);
  const decision = decideUnifiedAiRoute(question, {
    previousCapability: previousCapability(body.previousCapability),
    previousExpertMode: expertMode(body.previousExpertMode),
  });
  const startedAt = Date.now();
  const delegatedBody = decision.capability === "expert"
    ? { ...body, mode: decision.mode || "general" }
    : body;
  const response = decision.capability === "expert"
    ? await runExpertConsult(forwardedRequest(req, delegatedBody))
    : await runActionAgent(forwardedRequest(req, delegatedBody));
  const data = record(await response.json());

  if (!response.ok) {
    return NextResponse.json({ ...data, routing: decision }, {
      status: response.status,
      headers: responseHeaders(response),
    });
  }

  const normalized = decision.capability === "expert"
    ? normalizeExpertResponse(data, decision, lang, question, Date.now() - startedAt)
    : { ...data, routing: decision };

  return NextResponse.json(normalized, {
    status: response.status,
    headers: responseHeaders(response),
  });
}
