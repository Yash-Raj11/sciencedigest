import type { Metadata } from "next";
import Link from "next/link";
import { GradeChip } from "@/components/protocol/primitives";
import { DESIGN_LABEL, papers } from "@/lib/content";

export const metadata: Metadata = { title: "Library" };

export default function LibraryPage() {
  return (
    <div className="space-y-4">
      <header className="pt-2">
        <h1 className="display text-[2.5rem]">Library</h1>
        <p className="text-muted">
          Each read takes a few minutes and ends with a simulator and a protocol you can add to your Life Game.
        </p>
      </header>

      <ul className="space-y-3">
        {papers.map((paper) => (
          <li key={paper.id}>
            <Link href={`/papers/${paper.slug}`} className="block rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center justify-between gap-3 text-sm text-muted">
                <span>{paper.category}</span>
                <span className="num">{paper.readMinutes} min read</span>
              </p>
              <h2 className="read-title mt-2 text-[1.5rem]">{paper.title}</h2>
              <p className="mt-2 text-[0.9375rem] leading-snug text-muted">{paper.teaser}</p>

              <dl className="mt-3 space-y-1.5 border-t border-line pt-3">
                {paper.grades.map((g) => (
                  <div key={g.outcome} className="flex items-center justify-between gap-3">
                    <dt className="min-w-0 text-sm leading-snug">{g.outcome}</dt>
                    <dd><GradeChip grade={g.tier} /></dd>
                  </div>
                ))}
              </dl>

              <p className="mt-3 flex items-center justify-between gap-3 text-sm">
                <span className="text-muted">
                  {DESIGN_LABEL[paper.design] ?? paper.design}
                  {paper.sampleSize ? <>, <span className="num">{paper.sampleSize.toLocaleString("en")}</span> people</> : null}
                </span>
                {paper.accessTier === "premium" && (
                  <span className="rounded-full border border-accent px-2.5 py-0.5 text-xs font-bold text-accent-text">Members</span>
                )}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <p className="text-sm leading-snug text-muted">
        The pips show how far each result can be trusted. Three pips count ×1.0 in your score, two count ×0.7, one counts ×0.4.
      </p>
    </div>
  );
}
