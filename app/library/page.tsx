import type { Metadata } from "next";
import { Feed } from "@/components/read/Feed";
import { papers } from "@/lib/content";

export const metadata: Metadata = { title: "Library" };

/** The feed: each paper as a whole post. Tap one for the full read. */
export default function LibraryPage() {
  return (
    <div className="space-y-5">
      <header className="pt-2">
        <h1 className="display text-[2.5rem]">Library</h1>
        <p className="text-muted">Each post is one paper: the finding, the picture, the number. Tap one for the full read.</p>
      </header>

      <Feed papers={papers} />

      <p className="text-sm leading-snug text-muted">
        The pips show how far each result can be trusted. Three pips count ×1.0 in your score, two count ×0.7, one counts ×0.4.
      </p>
    </div>
  );
}
