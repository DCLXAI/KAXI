import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { listPartnerCases } from "@/lib/cases/repository";
import { requireKaxiPageUser } from "@/lib/supabase/auth";
import { tr } from "@/lib/i18n/translations";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatDate(value: Date | null | undefined) {
  return value ? new Intl.DateTimeFormat("ko-KR").format(value) : "-";
}

export default async function PartnerWorkspacePage() {
  const user = await requireKaxiPageUser("partner");
  const cases = user.organizationId ? await listPartnerCases(user.organizationId) : [];

  return (
    <main className="min-h-screen bg-muted/30 px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{tr("partner_workspace", "ko")}</h1>
          <p className="text-sm text-muted-foreground">{user.email || user.id}</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BriefcaseBusiness className="h-4 w-4" />
              {tr("partner_assigned_cases", "ko")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cases.length === 0 ? (
              <div className="text-sm text-muted-foreground">{tr("empty_state", "ko")}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="py-2 pr-3 font-medium">Case</th>
                      <th className="py-2 pr-3 font-medium">Student</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Matched</th>
                      <th className="py-2 font-medium">Open</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map((caseItem) => (
                      <tr key={caseItem.id} className="border-b last:border-0">
                        <td className="py-3 pr-3">
                          <div className="font-medium">{caseItem.summary}</div>
                          <div className="text-xs text-muted-foreground">{caseItem.category}</div>
                        </td>
                        <td className="py-3 pr-3">{caseItem.studentProfile.user.email || caseItem.studentProfile.id}</td>
                        <td className="py-3 pr-3">
                          <Badge variant={caseItem.riskLevel === "HIGH" ? "destructive" : "outline"}>
                            {caseItem.status}
                          </Badge>
                        </td>
                        <td className="py-3 pr-3 font-mono text-xs">{formatDate(caseItem.matchedAt)}</td>
                        <td className="py-3">
                          <Link href={`/partner/cases/${caseItem.id}`} className="font-medium underline">
                            상세
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
