"use client";

/**
 * The section rail (owner, 2026-11-18): a stack of short ticks in the middle of a read's right
 * edge, where a thumb reaches it (moved there from the top, 2026-11-19), one per section heading
 * (`[data-rail]` inside the article), like an editor's outline marker. The tick of the section
 * being read is longer and orange, and so are the ticks of the sections already scrolled past:
 * the rail fills as you read and empties as you scroll back, and at the end of the page every
 * tick is orange (owner, 2026-11-19). The rail is one
 * [data-signal-item], so it counts as one orange item. Tap a tick to jump there; press and slide
 * along the stack to scrub through the read. No label, no panel (owner: "just the ticks"). The
 * ticks stay inside the page's 16 px gutter, so they never sit over the text.
 *
 * Headings are read from the page, so a section that arrives later (members' content) joins the
 * rail by itself. Fewer than three headings: no rail. It sits in the page's right gutter so it
 * never covers the text, and it is a list of buttons, so it works by keyboard and screen reader.
 */

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";

interface Mark { el: HTMLElement; label: string }

/** A heading above this share of the screen height is the section being read. */
const READ_LINE = 0.3;
/** Scrolled to within this many px of the page's end counts as the end. */
const END_SLACK = 4;
/** Space kept above a heading when the rail jumps to it, in px. */
const JUMP_GAP = 16;

const same = (a: Mark[], b: Mark[]) => a.length === b.length && a.every((m, i) => m.el === b[i].el && m.label === b[i].label);

export function SectionRail() {
  const nav = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [marks, setMarks] = useState<Mark[]>([]);
  const [active, setActive] = useState(-1);
  const [scrub, setScrub] = useState<number | null>(null);

  // Collect the headings, and collect again whenever the article's content changes.
  useEffect(() => {
    const article = nav.current?.closest("article");
    if (!article) return;
    const collect = () => {
      const found = [...article.querySelectorAll<HTMLElement>("[data-rail]")]
        .map((el) => ({ el, label: (el.textContent ?? "").trim() }))
        .filter((m) => m.label);
      setMarks((prev) => (same(prev, found) ? prev : found));
    };
    const first = requestAnimationFrame(collect);
    const observer = new MutationObserver(collect);
    observer.observe(article, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(first); observer.disconnect(); };
  }, []);

  // Which section is on screen: the last heading above the reading line.
  useEffect(() => {
    if (marks.length === 0) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = window.innerHeight * READ_LINE;
      let at = -1;
      marks.forEach((m, i) => { if (m.el.getBoundingClientRect().top <= line) at = i; });
      // The last sections may be too short to reach the line: at the end of the page, all are read.
      const end = document.documentElement;
      if (window.scrollY + window.innerHeight >= end.scrollHeight - END_SLACK) at = marks.length - 1;
      setActive(at);
    };
    const later = () => { if (!frame) frame = requestAnimationFrame(update); };
    later();
    window.addEventListener("scroll", later, { passive: true });
    window.addEventListener("resize", later);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", later);
      window.removeEventListener("resize", later);
    };
  }, [marks]);

  const jump = useCallback((i: number) => {
    const mark = marks[i];
    if (!mark) return;
    window.scrollTo({ top: mark.el.getBoundingClientRect().top + window.scrollY - JUMP_GAP, behavior: "auto" });
  }, [marks]);

  const indexAt = (clientY: number) => {
    const box = list.current?.getBoundingClientRect();
    if (!box || marks.length === 0) return 0;
    return Math.max(0, Math.min(marks.length - 1, Math.floor(((clientY - box.top) / box.height) * marks.length)));
  };

  const press = (e: PointerEvent<HTMLOListElement>) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* a synthetic or ended pointer: the slide still works while it is over the rail */ }
    const i = indexAt(e.clientY);
    setScrub(i);
    jump(i);
  };
  const slide = (e: PointerEvent<HTMLOListElement>) => {
    if (scrub === null) return;
    const i = indexAt(e.clientY);
    if (i !== scrub) { setScrub(i); jump(i); }
  };
  const lift = () => setScrub(null);

  const shown = scrub ?? active;
  const rows = marks.length;

  return (
    <nav
      ref={nav} aria-label="Sections of this read" data-section-rail
      className={`fixed right-0 top-1/2 z-30 -translate-y-1/2 ${rows < 3 ? "hidden" : ""}`}
    >
      <ol
        ref={list} className="flex touch-none select-none flex-col py-2" data-signal-item
        onPointerDown={press} onPointerMove={slide} onPointerUp={lift} onPointerCancel={lift}
      >
        {marks.map((m, i) => (
          <li key={i}>
            <button
              type="button" onClick={() => jump(i)} aria-label={m.label}
              aria-current={i === active ? "location" : undefined}
              data-rail-tick={i === shown ? "on" : i < shown ? "passed" : undefined}
              className="flex h-4 w-7 items-center justify-end pr-0.5"
            >
              <span
                aria-hidden
                className={`block h-[3px] rounded-full transition-[width,background-color] duration-[var(--motion)] ease-[var(--ease-out)] motion-reduce:transition-none ${
                  i === shown ? "w-3.5 bg-signal-evidence-text" : i < shown ? "w-3 bg-signal-evidence-text" : "w-3 bg-muted/60"
                }`}
              />
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}
