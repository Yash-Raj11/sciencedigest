/**
 * One Instagram slide, 1080×1350, as a tree Satori can draw. Called as a function (never
 * rendered as a component) so lib/carousel/satori-rules.ts can check every element before a
 * pixel is drawn. Every word and value comes from the built deck (content/generated/carousels.json),
 * which the content build has already linted and bound to gated facts.
 *
 * The look (owner's carousel design, 2026-11-20, in the site's orange, white and black): the brand
 * and the slide dots at the top, the cite at the foot; heavy sans headlines, serif body text. A deck
 * is drawn whole in one look (tokens.ts LOOKS): all on black or all on white, in the site's orange
 * or the deck's brighter one. Drawings sit on the slide itself, not in cards. Orange is the paper's finding. Inline styles, display flex on every
 * element with children, colours from the theme tokens.
 */

import type { CarouselArt, CarouselDay, CarouselDeck, CarouselFigure, CarouselSlide, ReceiptInterval } from "../content/types";
import { Day, Interval, PICTURES, Plateau, Shrink, VerdictMark } from "./art";
import { claim } from "./art/line";
import { dayLayout, intervalLayout, PICTURE_LABEL_SLOTS, PLATEAU, plateauLayout } from "./art-geometry";
import { ART, HEADING, paletteOf, SANS, SERIF, SLIDE, TYPE, type Look, type Palette } from "./tokens";

type Style = Record<string, string | number>;
const box = (style: Style = {}): Style => ({ display: "flex", ...style });
/** The width inside the slide's padding. */
const INNER = SLIDE.width - SLIDE.padX * 2;

type Kind = CarouselSlide["kind"];
const TAG: Record<Kind, string> = {
  hook: "The question",
  finding: "What they found",
  why: "Why",
  who: "Does this apply to you?",
  receipts: "Receipts",
  cta: "Try it",
};

function text(content: string, style: Style) {
  return <div style={box(style)}>{content}</div>;
}

/** Long headlines step down so they hold three lines at most. */
function heading(content: string, kind: Kind) {
  const big = kind === "hook" || kind === "cta";
  const size = big ? (content.length > 48 ? TYPE.heading + 8 : TYPE.headingHook) : content.length > 60 ? TYPE.headingSmall : TYPE.heading;
  return text(content, { fontWeight: HEADING.weight, fontSize: size, lineHeight: 1.02, letterSpacing: Math.round(size * HEADING.tracking) });
}

const serif = (content: string, pal: Palette, size: number = TYPE.body) =>
  text(content, { fontFamily: SERIF, fontWeight: 400, fontSize: size, lineHeight: 1.28, color: pal.muted });

const kicker = (content: string, color: string) => text(content, { fontSize: TYPE.tag, fontWeight: 600, color });

/** The key under a drawing: what solid and dashed mean. Same words as the site's figure key. */
function key(line: "solid" | "dashed", pal: Palette) {
  return (
    <div style={box({ alignItems: "center", marginTop: 20 })}>
      <svg width={64} height={16} viewBox="0 0 64 16">
        <path d="M 4 8 L 60 8" {...claim(line, pal)} strokeWidth={8} />
      </svg>
      {text(line === "solid" ? "Measured in the study" : "The authors' explanation, not measured", { fontSize: TYPE.small, color: pal.muted, marginLeft: 16 })}
    </div>
  );
}

/** A long value steps its font down so it never runs out of the slide (digits are about 0.6 em wide). */
const fitValue = (value: string, size: number, room: number) => Math.min(size, Math.floor(room / (value.length * 0.62)));

function bigFigure(f: CarouselFigure, max: number, unitSize: number, pal: Palette) {
  const size = fitValue(f.value, max, INNER - 200);
  return (
    <div style={box({ flexDirection: "column" })}>
      <div style={box({ alignItems: "baseline" })}>
        {text(f.value, { fontWeight: 800, fontSize: size, lineHeight: 0.92, color: pal["signal-evidence-text"], letterSpacing: Math.round(size * -0.045), whiteSpace: "nowrap" })}
        {f.unit ? text(f.unit, { fontWeight: 700, fontSize: unitSize, lineHeight: 1.1, marginLeft: 20 }) : null}
      </div>
      <div style={box({ marginTop: 18 })}>{serif(f.label, pal, TYPE.label)}</div>
    </div>
  );
}

function day(d: CarouselDay, pal: Palette) {
  const at = dayLayout(d, INNER);
  const under = (label: string, x: number, top: number, style: Style = {}) => (
    <div key={`${label}-${x}`} style={box({ position: "absolute", left: x - at.label / 2, top, width: at.label, justifyContent: "center" })}>
      {text(label, { fontSize: TYPE.small, fontWeight: 500, color: pal.muted, textAlign: "center", justifyContent: "center", ...style })}
    </div>
  );
  return (
    <div style={box({ flexDirection: "column" })}>
      <div style={box({ position: "relative", width: INNER, height: 300 })}>
        {Day({ at, width: INNER, height: 300, pal })}
        {d.marks.map((m, i) => under(m.label, at.marks[i], 160))}
        <div style={box({ position: "absolute", left: at.last, top: 252, width: at.end - at.last, justifyContent: "center" })}>
          {text(d.tail.label, { fontSize: TYPE.label - 6, fontWeight: 700 })}
        </div>
      </div>
      <div style={box({ justifyContent: "space-between", marginTop: 4 })}>
        {text(d.start, { fontSize: TYPE.small + 2, fontWeight: 700 })}
        {text(d.end, { fontSize: TYPE.small + 2, fontWeight: 700 })}
      </div>
    </div>
  );
}

const rule = (pal: Palette, last: boolean): Style => (last ? {} : { borderBottom: `2px solid ${pal.line}` });

function verdicts(rows: { label: string; verdict: string }[], pal: Palette) {
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      {rows.map((r, k) => (
        <div key={r.label} style={box({ alignItems: "center", paddingTop: 30, paddingBottom: 30, ...rule(pal, k === rows.length - 1) })}>
          {VerdictMark({ verdict: r.verdict, size: 60, pal })}
          {text(r.label, { marginLeft: 28, fontSize: TYPE.row, fontWeight: 600, flexGrow: 1, flexShrink: 1, lineHeight: 1.15 })}
          {text(r.verdict, { marginLeft: 20, fontSize: TYPE.small, fontWeight: 700, color: pal["signal-evidence-text"], whiteSpace: "nowrap" })}
        </div>
      ))}
    </div>
  );
}

/** One shared scale for several ranges: the lowest and highest ends and "no difference", with room for the dot. */
function sharedScale(ivs: ReceiptInterval[]) {
  const lo = Math.min(...ivs.map((iv) => Math.min(iv.low, iv.none)));
  const hi = Math.max(...ivs.map((iv) => Math.max(iv.high, iv.none)));
  const span = hi - lo || 1;
  const pad = 30;
  return (v: number) => pad + ((v - lo) / span) * (INNER - 2 * pad);
}

/** The finding as rows on one scale (the owner's design): label, value, the range as a band, the point as a dot. */
function rangeRows(sides: CarouselFigure[], pal: Palette) {
  const ivs = sides.map((s) => s.interval!);
  const x = sharedScale(ivs);
  const BAR = 56;
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      {sides.map((s, k) => {
        const iv = ivs[k];
        return (
          <div key={s.label} style={box({ flexDirection: "column", marginBottom: 52 })}>
            <div style={box({ justifyContent: "space-between", alignItems: "baseline" })}>
              {text(s.label, { fontSize: TYPE.row, fontWeight: 600, flexShrink: 1 })}
              <div style={box({ alignItems: "baseline" })}>
                {text(s.value, { fontSize: TYPE.rangeValue, fontWeight: 800, letterSpacing: -2, color: pal["signal-evidence-text"] })}
                {s.unit ? text(s.unit, { marginLeft: 12, fontSize: TYPE.small + 4, fontWeight: 700 }) : null}
              </div>
            </div>
            <div style={box({ marginTop: 16 })}><svg width={INNER} height={BAR} viewBox={`0 0 ${INNER} ${BAR}`}>
              <rect x={0} y={0} width={INNER} height={BAR} rx={BAR / 2} fill={pal.line} />
              <rect x={x(iv.low)} y={12} width={x(iv.high) - x(iv.low)} height={BAR - 24} rx={(BAR - 24) / 2} fill={pal["signal-evidence-fill"]} />
              <path d={`M ${x(iv.none)} 4 L ${x(iv.none)} ${BAR - 4}`} stroke={pal.muted} strokeWidth={4} strokeLinecap="round" />
              <circle cx={x(iv.point)} cy={BAR / 2} r={BAR / 2 - 6} fill={pal["signal-evidence-text"]} stroke={pal.bg} strokeWidth={6} />
            </svg></div>
            {text(`Likely range: ${iv.text.low} to ${iv.text.high}`, { marginTop: 14, fontSize: TYPE.small, color: pal.muted })}
          </div>
        );
      })}
      <div style={box({ position: "relative", width: INNER, height: TYPE.small * 1.4 })}>
        <div style={box({ position: "absolute", left: Math.max(0, Math.min(INNER - 320, x(ivs[0].none) - 160)), width: 320, justifyContent: x(ivs[0].none) > INNER - 160 ? "flex-end" : "center" })}>
          {text("No difference", { fontSize: TYPE.small, fontWeight: 600, color: pal.muted })}
        </div>
      </div>
    </div>
  );
}

function picture(art: Extract<CarouselArt, { labels: string[] }>, pal: Palette) {
  const slots = PICTURE_LABEL_SLOTS[art.motif];
  const scale = INNER / ART.width;
  return (
    <div style={box({ flexDirection: "column" })}>
      <div style={box({ position: "relative", width: INNER, height: Math.round(ART.height * scale) })}>
        {PICTURES[art.motif]({ line: art.line, width: INNER, pal })}
        {art.labels.map((label, i) => (
          <div key={label} style={box({ position: "absolute", left: slots[i].x * scale, top: slots[i].y * scale, width: slots[i].w * scale, justifyContent: "center" })}>
            {text(label, { fontWeight: 700, fontSize: TYPE.pictureLabel, lineHeight: 1.15, textAlign: "center", justifyContent: "center" })}
          </div>
        ))}
      </div>
      {key(art.line, pal)}
    </div>
  );
}

/**
 * The plateau chart: the curve over the paper's axis, the pale stretch where it levels off with its
 * label above, the paper's numbers under the axis, what the axis counts beneath them. Then the key,
 * and a plain note that the curve's height is shape only.
 */
function plateau(art: Extract<CarouselArt, { motif: "plateau" }>, pal: Palette, compact = false) {
  const at = plateauLayout(art, INNER, compact ? PLATEAU.compact : 1);
  const box2 = PLATEAU.numberBox;
  const place = (content: string, left: number, top: number, width: number, style: Style, align = "center") => (
    <div key={`${content}-${left}`} style={box({ position: "absolute", left, top, width, justifyContent: align })}>{text(content, style)}</div>
  );
  const bandMid = (at.band.from + at.band.to) / 2;
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      <div style={box({ position: "relative", width: INNER, height: at.y.height })}>
        {Plateau({ at, line: art.line, width: INNER, pal })}
        {place(art.y, at.x0 + 36, 0, INNER / 2 - 80, { fontSize: TYPE.small, fontWeight: 600, color: pal.muted }, "flex-start")}
        {place(art.levels.label, Math.min(INNER - 360, Math.max(0, bandMid - 180)), 0, 360, { fontSize: TYPE.pictureLabel, fontWeight: 700 })}
        {at.numbers.map(({ n, x }) => place(String(n), x - box2 / 2, at.y.numbers, box2, {
          fontSize: TYPE.pictureLabel, fontWeight: n === art.levels.from || n === art.levels.to ? 800 : 500,
          color: n === art.levels.from || n === art.levels.to ? pal.ink : pal.muted,
        }))}
        {place(art.axis, 0, at.y.label, INNER, { fontSize: TYPE.small, fontWeight: 600, color: pal.muted })}
      </div>
      {key(art.line, pal)}
      {text("Shape only, not plotted data", { marginTop: 8, fontSize: TYPE.small, color: pal.muted })}
    </div>
  );
}

function sketch(art: Extract<CarouselArt, { motif: "sketch" }>, pal: Palette) {
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      {kicker("Sketch, not data", pal.muted)}
      <div style={box({ justifyContent: "space-around", alignItems: "flex-end", marginTop: 24 })}>
        {[art.a, art.b].map((label, k) => (
          <div key={label} style={box({ flexDirection: "column", alignItems: "center" })}>
            {Shrink({ second: k === 1, pal })}
            {text(label, { marginTop: 16, fontSize: TYPE.small + 6, fontWeight: 700 })}
          </div>
        ))}
      </div>
      <div style={box({ marginTop: 28 })}>{serif(art.caption, pal, TYPE.small + 4)}</div>
    </div>
  );
}

/** Tested in: solid orange dots. Not tested in: dashed rings, muted. */
function who(art: Extract<CarouselArt, { motif: "who" }>, pal: Palette) {
  const dot = (on: boolean) => (
    <svg width={30} height={30} viewBox="0 0 30 30">
      {on ? <circle cx={15} cy={15} r={13} fill={pal["signal-evidence-text"]} />
        : <circle cx={15} cy={15} r={12} fill="none" stroke={pal.muted} strokeWidth={3} strokeDasharray="5 4" />}
    </svg>
  );
  const group = (title: string, rows: string[], on: boolean) => (
    <div style={box({ flexDirection: "column", marginBottom: 44 })}>
      {kicker(title, on ? pal["signal-evidence-text"] : pal.muted)}
      <div style={box({ flexDirection: "column", marginTop: 12 })}>
        {rows.map((r, k) => (
          <div key={r} style={box({ alignItems: "center", paddingTop: 18, paddingBottom: 18, ...rule(pal, k === rows.length - 1) })}>
            {dot(on)}
            {text(r, { marginLeft: 24, fontSize: on ? TYPE.rowTitle + 4 : TYPE.row, fontWeight: on ? 700 : 500, color: on ? pal.ink : pal.muted, lineHeight: 1.15, flexShrink: 1 })}
          </div>
        ))}
      </div>
    </div>
  );
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      {group("Tested in", art.tested, true)}
      {art.notTested.length > 0 ? group("Not tested in", art.notTested, false) : null}
    </div>
  );
}

/** The receipts' marks, drawn (the slides print no digit of their own): a tick, a warning bar, a gap. */
function mark(kind: "Strong" | "Weak" | "Missing", pal: Palette) {
  const ink = kind === "Strong" ? pal["signal-evidence-text"] : pal.ink;
  const path = kind === "Strong" ? "M 20 33 L 28 41 L 44 24" : kind === "Weak" ? "M 32 20 L 32 36 M 32 44 L 32 45" : "M 22 32 L 42 32";
  return (
    <svg width={64} height={64} viewBox="0 0 64 64">
      <circle cx={32} cy={32} r={30} fill="none" stroke={kind === "Strong" ? pal["signal-evidence-text"] : pal.line} strokeWidth={3} />
      <path d={path} stroke={ink} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

/** The headline result and its 95% interval, against "no difference". */
const RANGE_BAR = 56;
function range(iv: ReceiptInterval | null, pal: Palette) {
  if (!iv) return text("No range reported for this result", { fontSize: TYPE.small + 2, fontWeight: 600, color: pal.muted });
  const at = intervalLayout(iv, INNER);
  const place = (s: string, left: number, width: number, style: Style) => (
    <div style={box({ position: "absolute", left, top: 0, width, justifyContent: "center" })}>{text(s, style)}</div>
  );
  return (
    <div style={box({ flexDirection: "column" })}>
      {kicker("The result and its likely range", pal.muted)}
      <div style={box({ position: "relative", width: INNER, height: TYPE.rangePoint * 1.3, marginTop: 14 })}>
        {place(iv.unit ? `${iv.text.point} ${iv.unit}` : iv.text.point, at.point - at.label, at.label * 2, { fontWeight: 800, fontSize: TYPE.rangePoint, color: pal["signal-evidence-text"], whiteSpace: "nowrap" })}
      </div>
      {Interval({ at, width: INNER, height: RANGE_BAR, pal })}
      <div style={box({ position: "relative", width: INNER, height: TYPE.rangeEnd * 1.3 })}>
        {place(iv.text.low, at.lowLabel, at.label, { fontWeight: 500, fontSize: TYPE.rangeEnd, color: pal.muted })}
        {place(iv.text.high, at.highLabel, at.label, { fontWeight: 500, fontSize: TYPE.rangeEnd, color: pal.muted })}
      </div>
      <div style={box({ position: "relative", width: INNER, height: TYPE.small * 1.4 })}>
        {place("No difference", at.none - at.label, at.label * 2, { fontSize: TYPE.small, color: pal.muted })}
      </div>
    </div>
  );
}

function receipt(art: Extract<CarouselArt, { motif: "receipt" }>, pal: Palette) {
  const rows: ["Strong" | "Weak" | "Missing", string][] = [["Strong", art.strong], ["Weak", art.weak], ...(art.missing ? [["Missing", art.missing] as ["Missing", string]] : [])];
  return (
    <div style={box({ flexDirection: "column", width: INNER })}>
      {rows.map(([k, v]) => (
        <div key={k} style={box({ alignItems: "flex-start", marginBottom: 40 })}>
          {mark(k, pal)}
          <div style={box({ flexDirection: "column", marginLeft: 28, flexShrink: 1 })}>
            {text(k, { fontSize: TYPE.rowTitle, fontWeight: 700, lineHeight: 1.2 })}
            <div style={box({ marginTop: 6 })}>{serif(v, pal, TYPE.receipt)}</div>
          </div>
        </div>
      ))}
      <div style={box({ marginTop: 8 })}>{range(art.interval, pal)}</div>
    </div>
  );
}

function art(slide: CarouselSlide, pal: Palette) {
  const a = slide.art;
  switch (a.motif) {
    case "number": return bigFigure(a.figure, TYPE.value, TYPE.unit, pal);
    case "pair":
      if (slide.kind === "finding" && a.a.interval && a.b.interval) return rangeRows([a.a, a.b], pal);
      return (
        <div style={box({ flexDirection: "column" })}>
          <div style={box({ paddingBottom: 36, marginBottom: 36, borderBottom: `2px solid ${pal.line}` })}>{bigFigure(a.a, TYPE.valuePair, TYPE.unitPair, pal)}</div>
          {bigFigure(a.b, TYPE.valuePair, TYPE.unitPair, pal)}
        </div>
      );
    case "day": return day(a, pal);
    case "verdicts": return verdicts(a.rows, pal);
    case "plateau": return plateau(a, pal, slide.kind === "hook");
    case "sketch": return sketch(a, pal);
    case "who": return who(a, pal);
    case "receipt": return receipt(a, pal);
    case "cta": return a.day ? day(a.day, pal) : null;
    default: return picture(a, pal);
  }
}

/** The swipe hint and the closing slide's buttons: drawn icons, words from the chrome. */
const arrow = (color: string) => (
  <svg width={32} height={32} viewBox="0 0 24 24">
    <path d="M 5 12 L 19 12 M 13 6 L 19 12 L 13 18" stroke={color} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

function buttons(pal: Palette) {
  return (
    <div style={box({ alignItems: "center" })}>
      {text("Link in bio", { fontWeight: 700, fontSize: TYPE.cta, color: pal["on-signal-evidence-fill"], background: pal["signal-evidence-fill"], padding: "24px 40px", borderRadius: 999 })}
      <div style={box({ alignItems: "center", marginLeft: 20, padding: "22px 36px", borderRadius: 999, border: `2px solid ${pal.line}` })}>
        <svg width={32} height={32} viewBox="0 0 24 24">
          <path d="M 19 21 L 12 16 L 5 21 L 5 5 C 5 3.9 5.9 3 7 3 L 17 3 C 18.1 3 19 3.9 19 5 Z" stroke={pal.ink} strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
        {text("Save for later", { marginLeft: 14, fontSize: TYPE.cta, fontWeight: 600 })}
      </div>
    </div>
  );
}

function footer(deck: CarouselDeck, slide: CarouselSlide, pal: Palette) {
  if (slide.kind === "cta") {
    return (
      <div style={box({ flexDirection: "column", paddingTop: 28, borderTop: `2px solid ${pal.line}` })}>
        {text("Source", { fontSize: TYPE.small - 2, fontWeight: 700, color: pal.muted })}
        {text(deck.study.cite, { marginTop: 10, fontSize: TYPE.small, lineHeight: 1.4 })}
        {text(`Licence: ${deck.study.licence}`, { marginTop: 6, fontSize: TYPE.small - 2, color: pal.muted })}
      </div>
    );
  }
  const left = slide.kind === "receipts" && slide.art.motif === "receipt" ? `${slide.art.design} · ${slide.art.who}` : deck.study.cite;
  return (
    <div style={box({ justifyContent: "space-between", alignItems: "center", fontSize: TYPE.small + 2, fontWeight: 600 })}>
      {text(left, { color: pal.muted, flexShrink: 1 })}
      {slide.kind === "hook" ? (
        <div style={box({ alignItems: "center", marginLeft: 24 })}>
          {text("Swipe", { marginRight: 12 })}
          {arrow(pal.ink)}
        </div>
      ) : null}
    </div>
  );
}

/** The hook's chip: the gate's design, who took part and for how long. */
const chip = (deck: CarouselDeck, pal: Palette) => (
  <div style={box({ alignSelf: "flex-start", padding: "14px 26px", borderRadius: 32, border: `2px solid ${pal.line}` })}>
    {text([deck.study.design, deck.study.who, deck.study.span].join(" · "), { fontSize: TYPE.chip, fontWeight: 500, lineHeight: 1.3 })}
  </div>
);

/** The whole slide, in one of the deck's looks. `index` is 0-based. */
export function slideElement(deck: CarouselDeck, index: number, look: Look = "dark") {
  const slide = deck.slides[index];
  if (!slide) throw new Error(`carousel: ${deck.slug} has no slide ${index + 1}`);
  const pal = paletteOf(look);
  const drawing = art(slide, pal);
  return (
    <div style={box({
      flexDirection: "column", justifyContent: "space-between", width: SLIDE.width, height: SLIDE.height,
      padding: `${SLIDE.padY}px ${SLIDE.padX}px`, background: pal.bg, color: pal.ink, fontFamily: SANS, fontWeight: 400,
    })}>
      <div style={box({ justifyContent: "space-between", alignItems: "center" })}>
        {text("Science Digest", { fontWeight: 600, fontSize: TYPE.brand, color: pal.muted })}
        <div style={box({ alignItems: "center" })}>
          {deck.slides.map((s, i) => (
            <div key={`${s.kind}-${i}`} style={box({ width: i === index ? 36 : 12, height: 12, borderRadius: 6, marginLeft: 10, background: i === index ? pal["signal-evidence-text"] : pal.line })} />
          ))}
        </div>
      </div>
      <div style={box({ flexDirection: "column", flexGrow: 1, justifyContent: "center", marginTop: 40, marginBottom: 40 })}>
        {slide.kind === "hook" ? <div style={box({ marginBottom: 40 })}>{chip(deck, pal)}</div> : kicker(TAG[slide.kind], pal["signal-evidence-text"])}
        <div style={box({ marginTop: slide.kind === "hook" ? 0 : 20 })}>{heading(slide.heading, slide.kind)}</div>
        {slide.body ? <div style={box({ marginTop: 32 })}>{serif(slide.body, pal)}</div> : null}
        {drawing ? <div style={box({ marginTop: 52 })}>{drawing}</div> : null}
        {slide.kind === "cta" ? <div style={box({ marginTop: 56 })}>{buttons(pal)}</div> : null}
      </div>
      {footer(deck, slide, pal)}
    </div>
  );
}

/** The words a slide adds of its own (not from the deck). */
export const CHROME_WORDS = [
  "Science Digest", ...Object.values(TAG), "Measured in the study", "The authors' explanation, not measured", "Link in bio",
  "Save for later", "Swipe", "Source", "Licence", "Tested in", "Not tested in", "Strong", "Weak", "Missing", "Sketch, not data",
  "The result and its likely range", "No range reported for this result", "No difference", "Likely range",
  "Shape only, not plotted data",
];
