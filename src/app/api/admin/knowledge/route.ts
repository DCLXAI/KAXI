import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAdminContext, requireAdmin } from "@/lib/api/security";
import { recordRequestAudit } from "@/lib/audit";
import { staticKnowledgeItems, toAdminKnowledgeItem } from "@/lib/admin/serializers";
import type { AdminKnowledgeItem } from "@/lib/admin/types";
import {
  analyzeKnowledgeDocumentDiff,
  approveKnowledgeDocument,
  calculateKnowledgeImpact,
  discardKnowledgeDocument,
  recheckKnowledgeDocument,
} from "@/lib/knowledge/repository";

export const runtime = "nodejs";

type KnowledgeAction =
  | "approve"
  | "discard"
  | "recheck"
  | "diff"
  | "bulkApproveCandidates"
  | "bulkDiscardCandidates";

function isKnowledgeAction(value: unknown): value is KnowledgeAction {
  return (
    value === "approve" ||
    value === "discard" ||
    value === "recheck" ||
    value === "diff" ||
    value === "bulkApproveCandidates" ||
    value === "bulkDiscardCandidates"
  );
}

async function withImpact(item: AdminKnowledgeItem): Promise<AdminKnowledgeItem> {
  return {
    ...item,
    impact: await calculateKnowledgeImpact({
      docId: item.docId,
      title: item.title,
      sourceUrl: item.sourceUrl,
      topic: item.topic,
    }),
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

async function pendingCandidateDocIds(requestedDocIds: string[]): Promise<string[]> {
  if (requestedDocIds.length === 0) return [];

  const documents = await db.knowledgeDocument.findMany({
    where: {
      reviewStatus: "PENDING",
      docId: { in: requestedDocIds },
    },
    select: { docId: true },
    orderBy: { lastCheckedAt: "desc" },
  });
  return documents.map((document) => document.docId);
}

export async function GET(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin", "viewer"] });
    if (unauthorized) return unauthorized;

    const documents = await db.knowledgeDocument.findMany({
      include: { chunks: true },
      orderBy: [{ reviewStatus: "asc" }, { lastCheckedAt: "desc" }],
    });

    if (documents.length === 0) {
      const staticDocuments = await Promise.all(staticKnowledgeItems().map(withImpact));
      return NextResponse.json({ documents: staticDocuments, source: "static" });
    }

    const serialized = await Promise.all(documents.map((document) => withImpact(toAdminKnowledgeItem(document))));
    return NextResponse.json({ documents: serialized, source: "db" });
  } catch (err) {
    console.error("[GET /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const unauthorized = await requireAdmin(req, { roles: ["owner", "admin"] });
    if (unauthorized) return unauthorized;
    const context = await getAdminContext(req);
    const body = (await req.json().catch(() => ({}))) as {
      docId?: string;
      action?: string;
      title?: string;
      content?: string;
      sourceUrl?: string;
      sourceType?: string;
      language?: string;
      jurisdiction?: string;
      topic?: string;
      supersedes?: unknown;
      supersededBy?: string | null;
      docIds?: string[];
    };

    if (!isKnowledgeAction(body.action)) {
      return NextResponse.json({ error: "valid action is required" }, { status: 400 });
    }

    const actor = context?.actor || "admin";

    if (body.action === "bulkApproveCandidates" || body.action === "bulkDiscardCandidates") {
      const action = body.action === "bulkApproveCandidates" ? "approve" : "discard";
      const targetDocIds = await pendingCandidateDocIds(stringList(body.docIds));
      const results: Array<{
        docId: string;
        ok: boolean;
        reviewStatus?: string;
        error?: string;
      }> = [];
      const documents: AdminKnowledgeItem[] = [];

      for (const docId of targetDocIds) {
        try {
          const result = action === "approve"
            ? await approveKnowledgeDocument({ docId, actor })
            : {
                document: await discardKnowledgeDocument({ docId, actor }),
                diff: await analyzeKnowledgeDocumentDiff({ docId, actor }),
              };
          results.push({
            docId,
            ok: true,
            reviewStatus: result.document.reviewStatus,
          });
          documents.push(
            await withImpact({
              ...toAdminKnowledgeItem(result.document),
              diff: result.diff,
            })
          );
        } catch (err) {
          results.push({
            docId,
            ok: false,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }

      const processed = results.filter((result) => result.ok).length;
      const failed = results.length - processed;
      await recordRequestAudit(req, {
        actor,
        actorRole: context?.role || "admin",
        action: body.action === "bulkApproveCandidates" ? "knowledge.bulk_approve_candidates" : "knowledge.bulk_discard_candidates",
        targetType: "knowledgeDocument",
        metadata: {
          requested: targetDocIds.length,
          processed,
          failed,
          docIds: targetDocIds,
        },
        success: failed === 0,
      });

      return NextResponse.json({
        ok: failed === 0,
        action: body.action,
        requested: targetDocIds.length,
        processed,
        failed,
        results,
        documents,
      }, { status: failed > 0 ? 207 : 200 });
    }

    if (!body.docId) {
      return NextResponse.json({ error: "docId is required" }, { status: 400 });
    }

    const mutationInput = {
      docId: body.docId,
      actor,
      title: body.title,
      content: body.content,
      sourceUrl: body.sourceUrl,
      sourceType: body.sourceType,
      language: body.language,
      jurisdiction: body.jurisdiction,
      topic: body.topic,
      supersedes: body.supersedes,
      supersededBy: body.supersededBy,
    };

    if (body.action === "diff") {
      const diff = await analyzeKnowledgeDocumentDiff(mutationInput);
      await recordRequestAudit(req, {
        actor,
        actorRole: context?.role || "admin",
        action: "knowledge.diff",
        targetType: "knowledgeDocument",
        targetId: body.docId,
        metadata: {
          changed: diff.changed,
          addedChunks: diff.addedChunks,
          removedChunks: diff.removedChunks,
          impact: {
            ruleCount: diff.impact.ruleCount,
            userCount: diff.impact.userCount,
          },
        },
      });
      return NextResponse.json({ ok: true, diff });
    }

    const result =
      body.action === "approve"
        ? await approveKnowledgeDocument(mutationInput)
        : body.action === "recheck"
          ? await recheckKnowledgeDocument(mutationInput)
          : { document: await discardKnowledgeDocument(mutationInput), diff: await analyzeKnowledgeDocumentDiff(mutationInput) };

    if (!result.document) {
      return NextResponse.json(
        {
          error: "문서가 아직 DB에 없습니다. 변경 사항을 검토한 뒤 승인하면 production RAG에 반영됩니다.",
          diff: result.diff,
        },
        { status: 409 }
      );
    }

    await recordRequestAudit(req, {
      actor,
      actorRole: context?.role || "admin",
      action: `knowledge.${body.action}`,
      targetType: "knowledgeDocument",
      targetId: result.document.docId,
      metadata: {
        reviewStatus: result.document.reviewStatus,
        validTo: result.document.validTo?.toISOString() || null,
        changed: result.diff.changed,
        impact: {
          ruleCount: result.diff.impact.ruleCount,
          userCount: result.diff.impact.userCount,
        },
      },
    });

    const document = await withImpact({
      ...toAdminKnowledgeItem(result.document),
      diff: result.diff,
    });

    return NextResponse.json({ ok: true, document, diff: result.diff });
  } catch (err) {
    console.error("[PATCH /api/admin/knowledge]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
