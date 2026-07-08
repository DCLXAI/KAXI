"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Locale } from "@/i18n/routing";
import type { Stats } from "./types";

interface AdminNationalityCardProps {
  locale: Locale;
  stats: Stats;
}

export function AdminNationalityCard({ locale, stats }: AdminNationalityCardProps) {
  if (stats.byNationality.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">
          {locale === "ko" ? "국적별 분포" : locale === "vi" ? "Theo quốc tịch" : locale === "mn" ? "Үндэслэлээр" : "By nationality"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {stats.byNationality.map((item) => (
            <Badge key={item.nationality} variant="outline" className="gap-1">
              {item.nationality.toUpperCase()}: {item._count}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
