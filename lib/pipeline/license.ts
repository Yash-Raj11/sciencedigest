/**
 * Stage 0: licence allowlist.
 *
 * "Is it in the PubMed Central open-access subset" is NOT the test: that
 * subset includes NC (non-commercial, which bars a paid tier) and ND (no
 * derivatives, which a summary arguably is). Only these three pass.
 */

export const ALLOWED_LICENSES = ["CC-BY", "CC-BY-SA", "CC0"] as const;
export type AllowedLicense = (typeof ALLOWED_LICENSES)[number];

/** Maps the many ways a licence is written to one canonical code, or null. */
export function canonicalLicense(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = raw.toLowerCase().replace(/_/g, "-").replace(/\s+/g, " ").trim();
  if (/cc0|publicdomain\/zero|public domain dedication/.test(text)) return "CC0";
  const url = text.match(/creativecommons\.org\/licenses\/([a-z-]+)\//);
  const code = url ? url[1] : text.match(/\bcc[ -]by(?:[ -](?:nc|nd|sa))*\b/)?.[0];
  if (!code) return null;
  const parts = code.replace(/^cc[ -]/, "").split(/[ -]/).filter(Boolean);
  if (parts[0] !== "by") return null;
  const rest = parts.slice(1).sort((a, b) => ["nc", "nd", "sa"].indexOf(a) - ["nc", "nd", "sa"].indexOf(b));
  return ["CC", "BY", ...rest.map((p) => p.toUpperCase())].join("-");
}

export function checkLicense(raw: string | null | undefined):
  | { ok: true; license: AllowedLicense }
  | { ok: false; license: string | null; reason: string } {
  const license = canonicalLicense(raw);
  if (license === null) return { ok: false, license, reason: `unrecognised licence: ${raw ?? "none stated"}` };
  if ((ALLOWED_LICENSES as readonly string[]).includes(license)) return { ok: true, license: license as AllowedLicense };
  const why = license.includes("NC")
    ? "NC (non-commercial) bars use behind a paid tier"
    : license.includes("ND")
      ? "ND (no derivatives) bars summaries"
      : "not on the allowlist";
  return { ok: false, license, reason: `${license}: ${why}` };
}
