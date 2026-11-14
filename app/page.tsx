import { FeedSlot } from "@/components/game/FeedSlot";
import { Feed } from "@/components/read/Feed";
import { papers } from "@/lib/content";

/**
 * The home page is the feed: each paper as a whole post. Tap one for the full
 * read. The slot above the posts is whatever `top` is given; today it is the
 * Life Game summary. Swap it here, nowhere else.
 */
export default function FeedPage() {
  return (
    <div className="space-y-5">
      <h1 className="sr-only">Science Digest</h1>
      <Feed papers={papers} top={<FeedSlot />} />
      <p className="text-sm leading-snug text-muted">
        The pips show how far each result can be trusted. Three pips count ×1.0 in your score, two count ×0.7, one counts ×0.4.
      </p>
    </div>
  );
}
