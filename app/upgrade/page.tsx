import type { Metadata } from "next";
import Link from "next/link";
import { papers } from "@/lib/content";

export const metadata: Metadata = { title: "Membership" };

export default function UpgradePage() {
  const members = papers.filter((p) => p.accessTier === "premium");
  return (
    <div className="space-y-4">
      <header className="pt-2">
        <Link href="/me" className="text-sm font-semibold text-muted underline underline-offset-4">Me</Link>
        <h1 className="display mt-4 text-[2.5rem]">Membership</h1>
        <p className="text-muted">Two things, and neither of them is your streak.</p>
      </header>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="display text-xl">More papers</h2>
        <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">
          Narrower questions with full reads and simulators. Every title and summary stays open to everyone.
        </p>
        <ul className="mt-2 divide-y divide-line">
          {members.map((paper) => (
            <li key={paper.id}>
              <Link href={`/papers/${paper.slug}`} className="block py-3">
                <span className="block text-sm text-muted">{paper.category}</span>
                <span className="block font-medium leading-snug">{paper.title}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-surface p-4">
        <h2 className="display text-xl">More inside the papers you track</h2>
        <ul className="mt-2 space-y-2 text-[0.9375rem] leading-relaxed">
          <li><strong>Implementation notes.</strong> The settings each paper supports, each tied to its estimate.</li>
          <li><strong>Your last eight weeks.</strong> Sessions logged each week against the protocol&apos;s target.</li>
        </ul>
      </section>

      <section className="rounded-2xl border-2 border-ink p-4">
        <h2 className="display text-xl">Always free</h2>
        <p className="mt-1 text-[0.9375rem] leading-relaxed">
          Ticking, your score, your streak and your whole history. If you join and later leave, you keep all of it.
        </p>
      </section>

      <p className="rounded-2xl border border-accent bg-accent-soft p-4 text-[0.9375rem] leading-relaxed">
        <strong>Joining is not open yet.</strong> Payments have not been switched on in this version.
      </p>
    </div>
  );
}
