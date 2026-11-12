import { describe, expect, it } from "vitest";
import { BANNED_TERMS } from "./pipeline/lint";
import { PRIVACY_CONTACT, PRIVACY_SECTIONS, TURNSTILE_ADDENDUM_URL, privacyText } from "./privacy";

const MAX_WORDS = 20;
const sentences = privacyText().flatMap((text) => text.split(/(?<=[.?!])\s+/)).filter(Boolean);

describe("the privacy page's words", () => {
  it("use no banned term (H1)", () => {
    for (const sentence of sentences) {
      for (const [term, pattern] of BANNED_TERMS) expect(pattern.test(sentence), `"${term}" in: ${sentence}`).toBe(false);
    }
  });

  it(`keep every sentence to ${MAX_WORDS} words or fewer (H11)`, () => {
    for (const sentence of sentences) expect(sentence.split(/\s+/).length, sentence).toBeLessThanOrEqual(MAX_WORDS);
  });

  it("cover the device, the server, analytics and the bot check, with Cloudflare's addendum linked", () => {
    const all = privacyText().join(" ");
    for (const must of ["never leaves this device", "Supabase", "anonymous user id", "Vercel Web Analytics", "Cloudflare Turnstile", "email", "see your IP address", "sign-in record for your session does keep it"]) {
      expect(all).toContain(must);
    }
    expect(PRIVACY_SECTIONS.find((s) => s.link)?.link?.href).toBe(TURNSTILE_ADDENDUM_URL);
    expect(TURNSTILE_ADDENDUM_URL).toBe("https://www.cloudflare.com/turnstile-privacy-policy/");
    expect(PRIVACY_SECTIONS.find((s) => s.contact)?.heading).toBe("Your choices");
    expect(PRIVACY_CONTACT).toMatch(/^[^@\s]+@[^@\s]+$/);
    expect(all).not.toContain("the person who runs this site");
  });
});
