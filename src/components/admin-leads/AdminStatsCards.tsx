"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, Clock, TrendingUp, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import { pathLabel } from "./i18n";
import type { Stats } from "./types";

interface AdminStatsCardsProps {
  locale: Locale;
  stats: Stats;
}

export function AdminStatsCards({ locale, stats }: AdminStatsCardsProps) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Users className="h-3.5 w-3.5" />
            {locale === "ko" ? "총 리드" : locale === "vi" ? "Tổng lead" : locale === "mn" ? "Нийт лид" : "Total leads"}
          </div>
          <div className="text-2xl font-bold mt-1">{stats.totalLeads}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {locale === "ko" ? `최근 7일 ${stats.recentLeads}건` : `Last 7d: ${stats.recentLeads}`}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Clock className="h-3.5 w-3.5" />
            {locale === "ko" ? "상담 대기" : locale === "vi" ? "Chờ tư vấn" : locale === "mn" ? "Хүлээж буй" : "Pending"}
          </div>
          <div className="text-2xl font-bold mt-1">{stats.pendingRequests}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {locale === "ko" ? `총 요청 ${stats.totalRequests}건` : `Total: ${stats.totalRequests}`}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <AlertTriangle className="h-3.5 w-3.5" />
            {locale === "ko" ? "브로커 이용자" : locale === "vi" ? "Dùng môi giới" : locale === "mn" ? "Зуучлагчтай" : "Broker users"}
          </div>
          <div className="text-2xl font-bold mt-1">{stats.brokerUsers}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {stats.totalLeads > 0 ? `${Math.round((stats.brokerUsers / stats.totalLeads) * 100)}%` : "—"}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <TrendingUp className="h-3.5 w-3.5" />
            {locale === "ko" ? "주요 경로" : locale === "vi" ? "Lộ trình chính" : locale === "mn" ? "Гол маршрут" : "Top path"}
          </div>
          <div className="text-base font-bold mt-1 truncate">
            {stats.byPath.length > 0 ? pathLabel(t, stats.byPath[0].pathKey) : "—"}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {stats.byPath.length > 0 ? `${stats.byPath[0]._count} ${locale === "ko" ? "건" : "leads"}` : ""}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
