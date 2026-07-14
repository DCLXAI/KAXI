import Link from "next/link";
import { FileText, FolderKanban, Stethoscope } from "lucide-react";
import { db } from "@/lib/db";
import { requireKaxiPageUser } from "@/lib/supabase/auth";
import { tr, translationKey } from "@/lib/i18n/translations";
import { workspaceCopy, workspaceDateLocale, workspaceLocale, workspaceStatusLabel } from "@/lib/i18n/workspace";
import { WorkspaceLanguageSwitcher } from "@/components/workspace/WorkspaceLanguageSwitcher";
import { WorkspaceNotifications } from "@/components/workspace/WorkspaceNotifications";
import { KaxiCat } from "@/components/brand/KaxiCat";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: Date | null | undefined, locale: ReturnType<typeof workspaceLocale>) {
  return value ? new Intl.DateTimeFormat(workspaceDateLocale[locale]).format(value) : "-";
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <KaxiCat state="nap" size={48} />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function StudentMyPage() {
  const user = await requireKaxiPageUser("student");
  const locale = workspaceLocale(user.locale);
  const copy = workspaceCopy[locale];
  const profile = await db.studentProfile.findUnique({
    where: { userId: user.id },
    include: {
      documents: { include: { file: true }, orderBy: { documentType: "asc" } },
      escalationCases: { orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] },
    },
  });

  const diagnoses = await db.diagnosisLead.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, pathKey: true, estimatedCost: true, createdAt: true },
  });
  const money = new Intl.NumberFormat(workspaceDateLocale[locale]);

  return (
    <main lang={locale} className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <KaxiCat state="happy" size={40} />
            <div>
              <h1 className="font-serif text-3xl tracking-tight">{tr("student_my_page", locale)}</h1>
              <p className="text-sm text-muted-foreground">{user.email || user.id}</p>
            </div>
          </div>
          <WorkspaceLanguageSwitcher locale={locale} />
        </div>

        <WorkspaceNotifications locale={locale} />

        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <FolderKanban className="h-4 w-4" />
                {tr("student_cases", locale)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!profile || profile.escalationCases.length === 0 ? (
                <EmptyState label={tr("empty_state", locale)} />
              ) : (
                profile.escalationCases.map((caseItem) => (
                  <div key={caseItem.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{caseItem.summary}</div>
                      <Badge variant="outline">{workspaceStatusLabel(caseItem.status, locale)}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {caseItem.category} · {formatDate(caseItem.updatedAt, locale)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-serif text-base">
                <FileText className="h-4 w-4" />
                {tr("student_documents", locale)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!profile || profile.documents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center">
                  <KaxiCat state="nap" size={48} />
                  <p className="text-sm text-muted-foreground">
                    {tr("empty_state", locale)} <Link href={`/${locale}/docs`} className="underline">{copy.upload}</Link>
                  </p>
                </div>
              ) : (
                profile.documents.map((doc) => (
                  <div key={doc.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium">{doc.documentType}</div>
                      <div className="flex gap-1">
                        <Badge variant="outline">{workspaceStatusLabel(doc.status, locale)}</Badge>
                        <Badge variant="secondary">{workspaceStatusLabel(doc.reviewStatus, locale)}</Badge>
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {doc.file?.originalName || "-"} · {copy.expires}: {formatDate(doc.expiresAt, locale)}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-serif text-base">
              <Stethoscope className="h-4 w-4" />
              {tr("student_diagnoses", locale)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {diagnoses.length === 0 ? (
              <EmptyState label={tr("diagnosis_empty", locale)} />
            ) : (
              diagnoses.map((diag) => (
                <div key={diag.id} className="rounded-md border bg-background px-3 py-2 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{tr(translationKey(diag.pathKey, "goal_language"), locale)}</div>
                    <Badge variant="outline">{tr("diagnosis_view", locale)}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {money.format(diag.estimatedCost)} KRW · {formatDate(diag.createdAt, locale)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
