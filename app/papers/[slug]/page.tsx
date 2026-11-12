import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Article } from "@/components/read/Article";
import { getPaper, papers } from "@/lib/content";

/** Every published paper gets a real, pre-built page: teasers and search engines land on something. */
export function generateStaticParams() {
  return papers.map((paper) => ({ slug: paper.slug }));
}

export async function generateMetadata({ params }: PageProps<"/papers/[slug]">): Promise<Metadata> {
  const paper = getPaper((await params).slug);
  if (!paper) return {};
  return { title: paper.title, description: paper.teaser };
}

export default async function PaperPage({ params }: PageProps<"/papers/[slug]">) {
  const paper = getPaper((await params).slug);
  if (!paper) notFound();
  return <Article paper={paper} />;
}
