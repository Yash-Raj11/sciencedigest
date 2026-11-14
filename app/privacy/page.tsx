import type { Metadata } from "next";
import Link from "next/link";
import { PRIVACY_CONTACT, PRIVACY_INTRO, PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/lib/privacy";

export const metadata: Metadata = { title: "Privacy" };

/*
 * DRAFT FOR THE OWNER TO REVIEW. Not written or checked by a lawyer.
 * The words live in lib/privacy.ts (tested in lib/privacy.test.ts).
 */
export default function PrivacyPage() {
  return (
    <div className="space-y-4">
      <header className="pt-2">
        <Link href="/me" className="text-sm font-medium text-muted underline underline-offset-4">Me</Link>
        <h1 className="headline mt-4">Privacy</h1>
        <p className="text-muted">{PRIVACY_INTRO}</p>
      </header>

      {PRIVACY_SECTIONS.map((section) => (
        <section key={section.heading} aria-label={section.heading} className="rounded-2xl border border-line bg-surface p-4">
          <h2 className="headline">{section.heading}</h2>
          {section.intro && <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{section.intro}</p>}
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[0.9375rem] leading-relaxed">
            {section.points.map((point) => <li key={point}>{point}</li>)}
          </ul>
          {section.link && (
            <p className="mt-3 text-[0.9375rem] leading-relaxed">
              {section.link.before}{" "}
              <a href={section.link.href} target="_blank" rel="noopener noreferrer" className="font-medium underline underline-offset-2">
                {section.link.label}
              </a>
              .
            </p>
          )}
          {section.contact && (
            <p className="mt-3 text-[0.9375rem] leading-relaxed">
              {section.contact}{" "}
              <a href={`mailto:${PRIVACY_CONTACT}`} className="font-medium underline underline-offset-2">{PRIVACY_CONTACT}</a>
              .
            </p>
          )}
        </section>
      ))}

      <p className="text-sm leading-snug text-muted">Last updated {PRIVACY_UPDATED}.</p>
    </div>
  );
}
