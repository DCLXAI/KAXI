"use client";

import type { Lang } from "@/lib/i18n/translations";
import { BookOpen, ExternalLink, ShieldCheck } from "lucide-react";

export interface SourceAnnotation {
  id?: string;
  title: string;
  label?: string;
  source?: string;
  url?: string | null;
  kind?: "knowledge" | "school" | "internal" | string;
  owner?: string;
  verifiedAt?: string;
  reviewAfter?: string;
  sourceType?: string;
  reviewStatus?: string;
  checkedBy?: string;
  excerpt?: string;
}

function hostFromUrl(url?: string | null): string {
  if (!url || url.startsWith("internal://")) return "KAXI";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function sourceKind(source: SourceAnnotation, lang: Lang): string {
  if (source.kind === "school") return lang === "ko" ? "학교" : "School";
  if (source.kind === "internal" || source.owner === "internal") return "KAXI";
  if (source.sourceType?.includes("law")) return lang === "ko" ? "법령" : "Law";
  return lang === "ko" ? "공식" : "Official";
}

function checkedText(source: SourceAnnotation, lang: Lang): string | null {
  const checked = source.verifiedAt;
  const status = source.reviewStatus;
  if (!checked && !status) return null;
  if (lang === "ko") {
    return [checked ? `확인일 ${checked}` : null, status ? `검수 ${status}` : null].filter(Boolean).join(" · ");
  }
  return [checked ? `checked ${checked}` : null, status ? `review ${status}` : null].filter(Boolean).join(" · ");
}

export function SourceAnnotations({
  sources,
  lang,
  max = 8,
  title,
}: {
  sources?: SourceAnnotation[];
  lang: Lang;
  max?: number;
  title?: string;
}) {
  const visibleSources = (sources || []).filter((source) => source?.title).slice(0, max);
  if (visibleSources.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        {title || (lang === "ko" ? "답변 근거 주석" : "Answer citations")}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {visibleSources.map((source, index) => {
          const url = source.url && !source.url.startsWith("internal://") ? source.url : null;
          const label = `[${index + 1}] ${source.title}`;
          const className =
            "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted";
          const content = (
            <>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                [{index + 1}]
              </span>
              <span className="max-w-[220px] truncate">{source.title}</span>
              <span className="text-muted-foreground">{hostFromUrl(url)}</span>
              {url && <ExternalLink className="h-3 w-3" />}
            </>
          );

          return url ? (
            <a key={`${source.id || source.title}-${index}`} href={url} target="_blank" rel="noreferrer" className={className} aria-label={label}>
              {content}
            </a>
          ) : (
            <span key={`${source.id || source.title}-${index}`} className={className} aria-label={label}>
              {content}
            </span>
          );
        })}
      </div>

      <div className="space-y-2">
        {visibleSources.map((source, index) => {
          const url = source.url && !source.url.startsWith("internal://") ? source.url : null;
          const checked = checkedText(source, lang);

          return (
            <div key={`${source.id || source.title}-detail-${index}`} className="rounded-md border bg-muted/20 px-3 py-2 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">[{index + 1}]</span>
                    {url ? (
                      <a href={url} target="_blank" rel="noreferrer" className="truncate hover:underline">
                        {source.title}
                      </a>
                    ) : (
                      <span className="truncate">{source.title}</span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {source.label || source.source || hostFromUrl(url)}
                  </div>
                </div>
                <span className="shrink-0 rounded bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {sourceKind(source, lang)}
                </span>
              </div>

              {source.excerpt && (
                <div className="mt-2 rounded border-l-2 border-primary/30 bg-background/70 px-2 py-1.5 leading-relaxed">
                  {lang === "ko" ? "근거: " : "Basis: "}
                  {source.excerpt}
                </div>
              )}

              {checked && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <ShieldCheck className="h-3 w-3" />
                  {checked}
                  {source.checkedBy ? ` · ${source.checkedBy}` : ""}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
