/**
 * The words on /privacy, kept as data so a test can read them.
 *
 * DRAFT FOR THE OWNER TO REVIEW. Nobody who wrote this is a lawyer. It says
 * what the code does today; check it against the Supabase, Vercel and
 * Cloudflare settings before relying on it, and update it when any of them
 * changes. `lib/privacy.test.ts` holds it to the content rules: no banned
 * terms (H1) and short sentences (H11).
 */

/** Cloudflare's own address for the addendum, as linked from developers.cloudflare.com/turnstile/ (checked 2026-11-13; no redirect). */
export const TURNSTILE_ADDENDUM_URL = "https://www.cloudflare.com/turnstile-privacy-policy/";

/** Where questions and deletion requests go. The owner's choice (2026-11-13). */
export const PRIVACY_CONTACT = "work.yash.000@gmail.com";

export const PRIVACY_UPDATED = "13 November 2026";

export interface PrivacySection {
  heading: string;
  intro?: string;
  points: string[];
  link?: { before: string; label: string; href: string };
  /** Shows the contact address as a mail link after the points. */
  contact?: string;
}

export const PRIVACY_INTRO =
  "This page says what Science Digest keeps about you and where. It is short on purpose. You can use the app without giving your name or an email.";

export const PRIVACY_SECTIONS: PrivacySection[] = [
  {
    heading: "On this device",
    intro: "The app keeps a copy in this browser so it opens fast and works offline.",
    points: [
      "The boxes you tick and the day you ticked them.",
      "Amounts you log, such as glasses of water.",
      "Habits you add, with the names you give them.",
      "Protocols you track and the choices you make in them.",
      "Your theme: light, dark or match device.",
      "Your companion picture, if you choose one. It never leaves this device.",
      "Changes that are waiting to be sent. If the server refuses one, its error code is kept with it.",
    ],
  },
  {
    heading: "On our server",
    intro: "A copy is kept in a database run by Supabase. It lets your history survive a lost phone.",
    points: [
      "An anonymous user id. It is made on your first tap and holds no name.",
      "Your ticks, amounts and habits.",
      "The protocols you track and your choices in them.",
      "Your time zone, so a day ends at your midnight.",
      "Your email, only if you add one. It lets you open your history on another device.",
    ],
  },
  {
    heading: "Visit counts",
    points: [
      "We use Vercel Web Analytics to count page visits.",
      "It sets no cookies.",
      "It does not see your ticks, amounts or habits.",
    ],
  },
  {
    heading: "Bot check at sign-in",
    points: [
      "Cloudflare Turnstile checks that a sign-in comes from a person, not a bot.",
      "It runs once, when this device first saves to the server.",
      "It mostly runs out of sight. Now and then it asks you to confirm.",
      "Cloudflare collects signals from your browser to do this.",
    ],
    link: { before: "Cloudflare explains what it collects in its", label: "Turnstile Privacy Addendum", href: TURNSTILE_ADDENDUM_URL },
  },
  {
    // Checked 2026-11-13: no table of ours has an address column and no code
    // reads one. Supabase's own auth.sessions table does keep `ip` and
    // `user_agent` for each session (all 4 sessions on production had both).
    heading: "Your IP address",
    points: [
      "Supabase, Vercel and Cloudflare see your IP address when the app talks to them.",
      "Any website works this way.",
      "The tables we made do not hold it.",
      "Supabase's sign-in record for your session does keep it, with your browser type.",
    ],
  },
  {
    heading: "What we do not do",
    points: [
      "We do not sell your data.",
      "We do not show ads.",
      "We do not work out anything about your health from your ticks. A tick records that you did something.",
    ],
  },
  {
    heading: "Your choices",
    points: [
      "Clearing this site's data in your browser removes the copy on this device.",
      "The copy on the server stays until it is deleted.",
      "The app has no delete button yet.",
    ],
    contact: "For questions, or to have your copy deleted, write to",
  },
];

/** Every sentence a reader sees, for the content test. */
export function privacyText(): string[] {
  return [
    PRIVACY_INTRO,
    ...PRIVACY_SECTIONS.flatMap((s) => [s.heading, s.intro ?? "", ...s.points, s.link ? `${s.link.before} ${s.link.label}.` : "", s.contact ? `${s.contact} us.` : ""]),
  ].filter(Boolean);
}
