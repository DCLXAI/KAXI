"use client";

import { useState } from "react";
import { useLangStore, useLeadStore } from "@/store/kbridge";
import { tr, type Lang } from "@/lib/i18n/translations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Trash2, Eye } from "lucide-react";

export function Admin() {
  const { lang } = useLangStore();
  const { leads } = useLeadStore();
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const filtered = leads.filter((l) =>
    !q ||
    l.nickname.toLowerCase().includes(q.toLowerCase()) ||
    l.nationality.toLowerCase().includes(q.toLowerCase())
  );

  const sel = leads.find((l) => l.id === selected);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{tr("admin_title", lang)}</h1>
        <p className="text-muted-foreground mt-2">{tr("admin_subtitle", lang)}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-lg">
              Leads ({leads.length})
            </CardTitle>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-8 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {tr("admin_empty", lang)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_name", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_nationality", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_goal", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_path", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_budget", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_broker", lang)}</th>
                    <th className="py-2 pr-2 font-medium">{tr("admin_col_created", lang)}</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((l) => (
                    <tr key={l.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="py-2 pr-2 font-medium">{l.nickname}</td>
                      <td className="py-2 pr-2">
                        <Badge variant="outline">{l.nationality.toUpperCase()}</Badge>
                      </td>
                      <td className="py-2 pr-2 text-xs">{tr(`goal_${l.goal}` as any, lang)}</td>
                      <td className="py-2 pr-2 text-xs">{tr(l.pathKey as any, lang)}</td>
                      <td className="py-2 pr-2 font-mono text-xs">{l.budget.toLocaleString()}₩</td>
                      <td className="py-2 pr-2">
                        {l.usingBroker ? (
                          <Badge variant="destructive" className="text-xs">
                            {l.brokerCost > 0 ? `${l.brokerCost.toLocaleString()}₩` : tr("yes", lang)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-right">
                        <Button size="sm" variant="ghost" onClick={() => setSelected(l.id)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 상세 모달 */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelected(null)}>
          <Card className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{sel.nickname}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>×</Button>
              </div>
              <CardDescription>
                {new Date(sel.createdAt).toLocaleString()} · {sel.nationality.toUpperCase()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_goal", lang)}</div>
                  <div className="font-medium">{tr(`goal_${sel.goal}` as any, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("result_recommended", lang)}</div>
                  <div className="font-medium">{tr(sel.pathKey as any, lang)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_budget", lang)}</div>
                  <div className="font-medium font-mono">{sel.budget.toLocaleString()}₩</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">{tr("diagnose_q_broker", lang)}</div>
                  <div className="font-medium">
                    {sel.usingBroker ? `${tr("yes", lang)} (${sel.brokerCost.toLocaleString()}₩)` : tr("no", lang)}
                  </div>
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">{tr("result_required_docs", lang)}</div>
                <div className="flex flex-wrap gap-1">
                  {sel.recommendation.requiredDocs.map((k) => (
                    <Badge key={k} variant="outline" className="text-xs">{tr(k as any, lang)}</Badge>
                  ))}
                </div>
              </div>
              {sel.recommendation.warnings.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">{tr("result_warnings", lang)}</div>
                  <ul className="list-disc pl-5 space-y-1 text-xs">
                    {sel.recommendation.warnings.map((w, i) => (
                      <li key={i}>{w[lang]}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
