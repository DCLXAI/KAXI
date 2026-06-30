import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { KaxiPage } from "@/components/kbridge/KaxiPage";
import { VIEW_KEYS, VIEW_METADATA, isViewKey, type ViewKey } from "@/lib/kbridge/views";

type PageProps = {
  params: Promise<{ view: string }>;
};

export function generateStaticParams() {
  return VIEW_KEYS.filter((view) => view !== "home").map((view) => ({ view }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { view } = await params;
  if (!isViewKey(view)) return {};
  return VIEW_METADATA[view];
}

export default async function RoutedKaxiPage({ params }: PageProps) {
  const { view } = await params;
  if (view === "home") redirect("/");
  if (!isViewKey(view)) notFound();
  return <KaxiPage view={view as ViewKey} />;
}
