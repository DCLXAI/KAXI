import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KNOWLEDGE_DOCS, getSourceMetadata } from "@/lib/data/knowledge";

const SOURCE_BY_SLUG = {
  "cost-analysis": "KAXI 분석 (공식 학사운영 지침 기반)",
  "safety-guideline": "KAXI 안전 가이드라인",
} as const;

type SourceSlug = keyof typeof SOURCE_BY_SLUG;
type SourcePageProps = { params: Promise<{ slug: string }> };

function isSourceSlug(value: string): value is SourceSlug {
  return Object.prototype.hasOwnProperty.call(SOURCE_BY_SLUG, value);
}

export function generateStaticParams() {
  return Object.keys(SOURCE_BY_SLUG).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: SourcePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSourceSlug(slug)) return {};
  const source = SOURCE_BY_SLUG[slug];
  return {
    title: `${getSourceMetadata(source).label} | KAXI`,
    description: "KAXI 상담 답변에 사용되는 내부 검토 자료와 검토 기준입니다.",
    robots: { index: false, follow: true },
  };
}

export default async function SourcePage({ params }: SourcePageProps) {
  const { slug } = await params;
  if (!isSourceSlug(slug)) notFound();

  const source = SOURCE_BY_SLUG[slug];
  const metadata = getSourceMetadata(source);
  const documents = KNOWLEDGE_DOCS.filter((document) => document.source === source);
  if (documents.length === 0) notFound();

  return (
    <main className="min-h-dvh bg-white px-5 py-12 text-neutral-900 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <a href="/ko" className="text-sm font-semibold text-neutral-500 hover:text-neutral-900">
          KAXI
        </a>
        <header className="mt-8 border-b border-neutral-200 pb-8">
          <p className="text-sm font-semibold text-neutral-500">상담 답변 출처</p>
          <h1 className="mt-3 text-3xl font-bold tracking-normal sm:text-4xl">{metadata.label}</h1>
          <dl className="mt-5 grid gap-2 text-sm text-neutral-600 sm:grid-cols-2">
            <div>
              <dt className="inline font-semibold text-neutral-800">검토일 </dt>
              <dd className="inline">{metadata.verifiedAt}</dd>
            </div>
            <div>
              <dt className="inline font-semibold text-neutral-800">다음 검토일 </dt>
              <dd className="inline">{metadata.reviewAfter}</dd>
            </div>
          </dl>
          <p className="mt-5 text-sm leading-6 text-neutral-600">
            이 페이지는 KAXI의 내부 분석 또는 안전 정책입니다. 정부기관의 법률 해석이나 비자 발급 보장이
            아니며, 개인 상황에 따른 판단은 공식 기관 또는 자격 있는 전문가의 확인이 필요합니다.
          </p>
        </header>

        <div className="divide-y divide-neutral-200">
          {documents.map((document) => (
            <article key={document.id} id={document.id} className="py-9">
              <p className="text-xs font-bold uppercase text-neutral-500">{document.category}</p>
              <h2 className="mt-2 text-xl font-bold tracking-normal sm:text-2xl">{document.title.ko}</h2>
              <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-neutral-700">
                {document.content.ko}
              </p>
              <details className="mt-5 border-t border-neutral-100 pt-4">
                <summary className="cursor-pointer text-sm font-semibold text-neutral-600">English</summary>
                <p className="mt-3 text-sm leading-6 text-neutral-600">{document.content.en}</p>
              </details>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
