import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

/**
 * The slug is read inside <Suspense>, never at the top of the page. Reading
 * `params` outside a boundary leaves the route with nothing to show until the
 * address is known: `next dev` then reports "encountered URL data during
 * prerendering or a navigation" on every paper, and at times "did not produce
 * a static shell". Every listed slug is still pre-built in full, and
 * ensureStatic above still makes an unknown one answer 404.
 * Tested by tests/browser/paper-routes-dev.spec.ts.
 */
export default function PaperPage({ params }: PageProps<"/papers/[slug]">) {
  return (
    <Suspense fallback={<div aria-busy className="h-40 rounded-2xl bg-surface" />}>
      <PaperRead params={params} />
    </Suspense>
  );
}

async function PaperRead({ params }: Pick<PageProps<"/papers/[slug]">, "params">) {
  const paper = getPaper((await params).slug);
  if (!paper) notFound();
  return <Article paper={paper} />;
}
