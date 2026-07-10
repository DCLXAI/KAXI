import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { upsertPendingKnowledgeCandidate } from "@/lib/knowledge/repository";

export const runtime = "nodejs";

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function inferredSourceType(sourceUrl: string) {
  if (/law\.go\.kr/i.test(sourceUrl)) return "official_law";
  if (/\.(go\.kr|ac\.kr)(?:\/|$)/i.test(sourceUrl)) return "official_government";
  return "internal_analysis";
}

function generatedDocId(sourceUrl: string, title: string) {
  const digest = createHash("sha256").update(`${sourceUrl}\n${title}`).digest("hex").slice(0, 20);
  return `admin-ingestion__candidate__${digest}`;
}

export async function POST(req: NextRequest) {
  const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
  if (unauthorized) return unauthorized;

  try {
    const context = await getAdminContext(req);
    const body = await req.json();
    const title = text(body?.title, 240);
    const content = text(body?.content, 150_000);
    const sourceUrl = text(body?.sourceUrl ?? body?.source_url, 2_000);
    if (!title || !content || !sourceUrl) {
      return NextResponse.json({ error: "title, sourceUrl, and content are required" }, { status: 400 });
    }

    const result = await upsertPendingKnowledgeCandidate({
      docId: text(body?.docId ?? body?.doc_id, 240) || generatedDocId(sourceUrl, title),
      actor: context?.actor || "kaxi-admin",
      title,
      content,
      sourceUrl,
      sourceType: text(body?.sourceType ?? body?.source_type, 80) || inferredSourceType(sourceUrl),
      language: text(body?.language, 8) || "ko",
      jurisdiction: text(body?.jurisdiction, 16) || "KR",
      topic: text(body?.category ?? body?.topic, 80) || "process",
      supersedes: body?.supersedes,
      chunkMaxChars: 1_200,
    });

    return NextResponse.json(
      {
        ok: true,
        status: "pending_review",
        document: {
          id: result.document.id,
          docId: result.document.docId,
          reviewStatus: result.document.reviewStatus,
          chunkCount: result.document.chunks.length,
        },
        diff: result.diff,
      },
      { status: 202 },
    );
  } catch (error) {
    console.error("[POST /api/admin/rag-ingestion]", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
