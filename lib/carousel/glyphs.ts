/**
 * Which characters a font file can draw, read from the font itself (its cmap table).
 *
 * Satori draws a character the font lacks as an empty box, or asks the network for a fallback
 * font. Neither is acceptable on a slide, so the renderer refuses any text with a character the
 * font in use does not carry: it fails closed on every glyph it has not verified.
 *
 * Reads WOFF (zlib-compressed tables) and plain TTF/OTF. Pure Node: no React, Next or Supabase.
 */

import { inflateSync } from "node:zlib";

function tables(font: Buffer): Map<string, Buffer> {
  const out = new Map<string, Buffer>();
  const signature = font.toString("latin1", 0, 4);
  if (signature === "wOFF") {
    const count = font.readUInt16BE(12);
    for (let i = 0; i < count; i++) {
      const at = 44 + i * 20;
      const tag = font.toString("latin1", at, at + 4);
      const offset = font.readUInt32BE(at + 4);
      const compressed = font.readUInt32BE(at + 8);
      const original = font.readUInt32BE(at + 12);
      const raw = font.subarray(offset, offset + compressed);
      out.set(tag, compressed < original ? inflateSync(raw) : Buffer.from(raw));
    }
    return out;
  }
  if (signature === "wOF2") throw new Error("glyphs: a .woff2 font; Satori cannot read it, use the .woff file");
  const count = font.readUInt16BE(4);
  for (let i = 0; i < count; i++) {
    const at = 12 + i * 16;
    const tag = font.toString("latin1", at, at + 4);
    const offset = font.readUInt32BE(at + 8);
    const length = font.readUInt32BE(at + 12);
    out.set(tag, font.subarray(offset, offset + length));
  }
  return out;
}

/** Every code point the font maps to a real glyph (not glyph 0, the "missing" box). */
export function coveredCodePoints(font: Buffer): Set<number> {
  const cmap = tables(font).get("cmap");
  if (!cmap) throw new Error("glyphs: the font has no cmap table");
  const covered = new Set<number>();
  const count = cmap.readUInt16BE(2);
  const subtables: { platform: number; encoding: number; offset: number }[] = [];
  for (let i = 0; i < count; i++) {
    subtables.push({ platform: cmap.readUInt16BE(4 + i * 8), encoding: cmap.readUInt16BE(6 + i * 8), offset: cmap.readUInt32BE(8 + i * 8) });
  }
  for (const { platform, encoding, offset } of subtables) {
    const unicode = platform === 0 || (platform === 3 && (encoding === 1 || encoding === 10));
    if (!unicode) continue;
    const format = cmap.readUInt16BE(offset);
    if (format === 4) {
      const segments = cmap.readUInt16BE(offset + 6) / 2;
      const ends = offset + 14;
      const starts = ends + segments * 2 + 2;
      const deltas = starts + segments * 2;
      const ranges = deltas + segments * 2;
      for (let s = 0; s < segments; s++) {
        const end = cmap.readUInt16BE(ends + s * 2);
        const start = cmap.readUInt16BE(starts + s * 2);
        const delta = cmap.readInt16BE(deltas + s * 2);
        const rangeAt = ranges + s * 2;
        const range = cmap.readUInt16BE(rangeAt);
        for (let c = start; c <= end && c !== 0xffff; c++) {
          let glyph: number;
          if (range === 0) glyph = (c + delta) & 0xffff;
          else {
            glyph = cmap.readUInt16BE(rangeAt + range + (c - start) * 2);
            if (glyph !== 0) glyph = (glyph + delta) & 0xffff;
          }
          if (glyph !== 0) covered.add(c);
        }
      }
    } else if (format === 12) {
      const groups = cmap.readUInt32BE(offset + 12);
      for (let g = 0; g < groups; g++) {
        const at = offset + 16 + g * 12;
        const start = cmap.readUInt32BE(at);
        const end = cmap.readUInt32BE(at + 4);
        const first = cmap.readUInt32BE(at + 8);
        for (let c = start; c <= end; c++) if (first + (c - start) !== 0) covered.add(c);
      }
    }
  }
  return covered;
}

/** The characters of `text` the font cannot draw, in order of first appearance. Spaces and line breaks are layout, not glyphs. */
export function missingGlyphs(text: string, covered: Set<number>): string[] {
  const missing: string[] = [];
  for (const ch of text) {
    if (ch === " " || ch === "\n") continue;
    if (!covered.has(ch.codePointAt(0)!) && !missing.includes(ch)) missing.push(ch);
  }
  return missing;
}
