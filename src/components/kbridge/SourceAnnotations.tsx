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
  basis?: string;
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
  if (source.sourceType?.includes("government") || source.owner === "government") {
    return lang === "ko" ? "정부 공식" : "Gov";
  }
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

function reviewAfterText(source: SourceAnnotation, lang: Lang): string | null {
  if (!source.reviewAfter) return null;
  return lang === "ko" ? `재검토 ${source.reviewAfter}` : `review after ${source.reviewAfter}`;
}

function sourceTypeText(source: SourceAnnotation): string | null {
  if (!source.sourceType) return null;
  return source.sourceType.replace(/_/g, " ");
}

function visibleSourceList(sources: SourceAnnotation[] | undefined, max: number): SourceAnnotation[] {
  return (sources || []).filter((source) => source?.title).slice(0, max);
}

export function sourceAnnotationDomId(idPrefix: string, index: number): string {
  const safePrefix = idPrefix.replace(/[^A-Za-z0-9_-]/g, "-");
  return `${safePrefix}-source-${index + 1}`;
}

function markdownTitle(source: SourceAnnotation): string {
  const basis = source.basis || source.excerpt;
  const value = basis ? `${source.title} — ${basis}` : source.title;
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').slice(0, 180);
}

export function linkCitationMarkers(
  markdown: string,
  sources: SourceAnnotation[] | undefined,
  idPrefix: string,
  max = 8
): string {
  const visibleSources = visibleSourceList(sources, max);
  if (!markdown || visibleSources.length === 0) return markdown;

  return markdown.replace(/\[(\d{1,2})\](?!\()/g, (match, rawIndex: string) => {
    const index = Number(rawIndex);
    if (!Number.isInteger(index) || index < 1 || index > visibleSources.length) return match;
    return `[${index}](#${sourceAnnotationDomId(idPrefix, index - 1)} "${markdownTitle(visibleSources[index - 1])}")`;
  });
}

export function SourceAnnotations({
  sources,
  lang,
  max = 8,
  title,
  idPrefix,
}: {
  sources?: SourceAnnotation[];
  lang: Lang;
  max?: number;
  title?: string;
  idPrefix?: string;
}) {
  const visibleSources = visibleSourceList(sources, max);
  if (visibleSources.length === 0) return null;

  return (
    <div className="mt-4 border-t pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-muted-foreground">
        <BookOpen className="h-3 w-3" />
        {title || (lang === "ko" ? "출처 링크와 답변 근거" : "Source links and answer basis")}
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {visibleSources.map((source, index) => {
          const url = source.url && !source.url.startsWith("internal://") ? source.url : null;
          const label = `[${index + 1}] ${source.title}`;
          const kind = sourceKind(source, lang);
          const className =
            "inline-flex max-w-full items-center gap-1.5 rounded-md border bg-background px-2 py-1 text-xs hover:bg-muted";
          const content = (
            <>
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                [{index + 1}]
              </span>
              <span className="max-w-[220px] truncate">{source.title}</span>
              <span className="rounded bg-primary-strong/10 px-1.5 py-0.5 text-[10px] text-primary-strong">{kind}</span>
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
          const reviewAfter = reviewAfterText(source, lang);
          const sourceType = sourceTypeText(source);
          const basis = source.basis || source.excerpt;
          const showExcerpt = source.excerpt && source.excerpt !== basis;

          return (
            <div
              key={`${source.id || source.title}-detail-${index}`}
              id={idPrefix ? sourceAnnotationDomId(idPrefix, index) : undefined}
              className="scroll-mt-24 rounded-md border bg-muted/20 px-3 py-2 text-xs target:border-primary-strong/60 target:bg-primary-strong/5 target:ring-2 target:ring-primary-strong/20"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-medium">
                    <span className="rounded bg-primary-strong/10 px-1.5 py-0.5 text-[10px] text-primary-strong">[{index + 1}]</span>
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

              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="rounded bg-background px-1.5 py-0.5">{hostFromUrl(url)}</span>
                {sourceType && <span className="rounded bg-background px-1.5 py-0.5">{sourceType}</span>}
                {reviewAfter && <span className="rounded bg-background px-1.5 py-0.5">{reviewAfter}</span>}
                {url && (
                  <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5 hover:underline">
                    {lang === "ko" ? "원문" : "Source"}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              {basis && (
                <div className="mt-2 rounded border-l-2 border-primary-strong/30 bg-background/70 px-2 py-1.5 leading-relaxed">
                  <span className="font-medium">{lang === "ko" ? "답변 근거: " : "Answer basis: "}</span>
                  {basis}
                </div>
              )}

              {showExcerpt && (
                <div className="mt-2 rounded bg-background/60 px-2 py-1.5 leading-relaxed text-muted-foreground">
                  <span className="font-medium">{lang === "ko" ? "근거 발췌: " : "Source excerpt: "}</span>
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
