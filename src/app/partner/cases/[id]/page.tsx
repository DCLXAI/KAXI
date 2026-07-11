import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { assertPartnerCaseScope } from "@/lib/cases/repository";
import { PartnerCaseActions } from "@/components/partner/PartnerCaseActions";
import { requireKaxiPageUser } from "@/lib/supabase/auth";
import { workspaceCopy, workspaceDateLocale, workspaceLocale, workspaceStatusLabel } from "@/lib/i18n/workspace";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type PageParams = {
  params: Promise<{ id: string }>;
};

function formatDate(value: Date | null | undefined, locale: ReturnType<typeof workspaceLocale>) {
  return value ? new Intl.DateTimeFormat(workspaceDateLocale[locale], { dateStyle: "short", timeStyle: "short" }).format(value) : "-";
}

export default async function PartnerCaseDetailPage({ params }: PageParams) {
  const user = await requireKaxiPageUser("partner");
  const locale = workspaceLocale(user.locale);
  const copy = workspaceCopy[locale];
  const { id } = await params;
  if (!user.organizationId) notFound();
  await assertPartnerCaseScope(id, user.organizationId);
  const caseItem = await db.escalationCase.findUnique({
    where: { id },
    include: {
      studentProfile: { include: { user: true, documents: { include: { file: true } } } },
      reviews: { orderBy: { reviewedAt: "desc" } },
      timelineEvents: { orderBy: { createdAt: "desc" } },
      documentLinks: { include: { documentItem: true }, orderBy: { createdAt: "desc" } },
    },
  });
  if (!caseItem) notFound();

  return (
    <main lang={locale} className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <Button variant="outline" size="sm" asChild>
          <Link href="/partner">
            <ArrowLeft className="h-4 w-4" />
            {copy.backToList}
          </Link>
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-2 flex flex-wrap gap-2">
              <Badge variant={caseItem.riskLevel === "HIGH" ? "destructive" : "outline"}>{workspaceStatusLabel(caseItem.status, locale)}</Badge>
              <Badge variant="secondary">{caseItem.category}</Badge>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">{caseItem.summary}</h1>
            <p className="text-sm text-muted-foreground">
              {caseItem.studentProfile.user.email || caseItem.studentProfile.id} · {caseItem.studentProfile.visaType || "-"}
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <div className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{copy.caseSummary}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p>{caseItem.conversationSummary || copy.noSummary}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  <div>
                    <div className="text-xs text-muted-foreground">{copy.assigned}</div>
                    <div>{formatDate(caseItem.matchedAt, locale)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{copy.accepted}</div>
                    <div>{formatDate(caseItem.acceptedAt, locale)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">{copy.closed}</div>
                    <div>{formatDate(caseItem.closedAt, locale)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{copy.documentStatus}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caseItem.studentProfile.documents.map((doc) => (
                  <div key={doc.id} className="rounded-md border px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{doc.documentType}</div>
                      <div className="flex gap-1">
                        <Badge variant="outline">{workspaceStatusLabel(doc.status, locale)}</Badge>
                        <Badge variant="secondary">{workspaceStatusLabel(doc.reviewStatus, locale)}</Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{doc.file?.originalName || "-"} · {doc.reviewNote || "-"}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">{copy.timeline}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {caseItem.timelineEvents.length === 0 ? (
                  <div className="text-sm text-muted-foreground">{copy.noEvents}</div>
                ) : (
                  caseItem.timelineEvents.map((event) => (
                    <div key={event.id} className="rounded-md border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium">{event.eventType}</div>
                        <div className="font-mono text-xs text-muted-foreground">{formatDate(event.createdAt, locale)}</div>
                      </div>
                      <div className="mt-1 text-muted-foreground">{event.message || "-"}</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{copy.actions}</CardTitle>
            </CardHeader>
            <CardContent>
              <PartnerCaseActions
                caseId={caseItem.id}
                documentIds={caseItem.studentProfile.documents.map((doc) => doc.id)}
                locale={locale}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
