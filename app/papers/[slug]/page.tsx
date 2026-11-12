import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Article } from "@/components/read/Article";
import { getPaper, papers } from "@/lib/content";

/**
 * An unknown slug must answer HTTP 404, not 200. With Partial Prefetching,
 * Next.js would otherwise send the prerendered App Shell (status 200) for an
 * unlisted slug before this page runs, and notFound() could then only add a
 * noindex tag. 'navigation' makes the request wait for the complete page, so
 * notFound() runs before the response starts. Every paper page is fully static
 * (bundled content, no cookies or headers), so this costs nothing.
 * Tested by tests/http/papers-status.test.ts (npm run test:http).
 */
export const ensureStatic = "navigation";

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
