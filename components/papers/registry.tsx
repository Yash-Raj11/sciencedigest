"use client";

/**
 * Which simulator and which widget belong to which paper.
 *
 * A new paper works with no code at all: it gets the generic widget and, if its
 * editorial.json says simulator kind "estimate-explorer", the generic simulator.
 * To give a paper its own: create components/papers/<slug>/Simulator.tsx and
 * Widget.tsx, then add one line to each map below. Nothing else needs to know.
 */

import type { ComponentType } from "react";
import { EVIDENCE_KEY, evidenceKindsIn, figureKey, isFigureKey, type FigureKey } from "@/lib/content/figures";
import type { FigureRef } from "@/lib/content/types";
import GenericSimulator from "./_generic/Simulator";
import GenericWidget from "./_generic/Widget";
import LockAndKey from "./daytime-caffeine-sleep/figures/LockAndKey";
import CaffeineWidget from "./daytime-caffeine-sleep/Widget";
import WhatWasMeasured from "./hiit-body-composition/figures/WhatWasMeasured";
import HiitSimulator from "./hiit-body-composition/Simulator";
import HiitWidget from "./hiit-body-composition/Widget";
import SeenTogether from "./steps-days-per-week/figures/SeenTogether";
import StepsSimulator from "./steps-days-per-week/Simulator";
import StepsWidget from "./steps-days-per-week/Widget";
import Doorbell from "./turmeric-pepper-breakfast/figures/Doorbell";
import FiveReadings from "./turmeric-pepper-breakfast/figures/FiveReadings";
import BreakfastSimulator from "./turmeric-pepper-breakfast/Simulator";

export interface WidgetProps { variant: "article" | "card" }
export interface SimulatorProps { params: Record<string, unknown> }
/** `params` is what the picture shows, every value bound to a gated fact; `alt` is its description. */
export interface FigureProps {
  params: Record<string, unknown>; alt: string;
  /** False in the feed card, which is one link: the figure shows its first view and holds no buttons. */
  interactive?: boolean;
}

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  "steps-days-per-week": StepsWidget,
  "daytime-caffeine-sleep": CaffeineWidget,
  "hiit-body-composition": HiitWidget,
};

/** Keyed by the `simulator.kind` written in the paper's editorial.json. */
const SIMULATORS: Record<string, ComponentType<SimulatorProps>> = {
  "estimate-explorer": GenericSimulator,
  "steps-days": StepsSimulator,
  "hiit-forest": HiitSimulator,
  "breakfast-meals": BreakfastSimulator,
};

/**
 * One component for every key in lib/content/figures.ts. The type makes the
 * typecheck fail when a listed figure has no component here, and the content
 * build fails when a read names a figure that is not listed.
 */
const FIGURES: Record<FigureKey, ComponentType<FigureProps>> = {
  "daytime-caffeine-sleep/lock-and-key": LockAndKey,
  "steps-days-per-week/seen-together": SeenTogether,
  "hiit-body-composition/what-was-measured": WhatWasMeasured,
  "turmeric-pepper-breakfast/doorbell": Doorbell,
  "turmeric-pepper-breakfast/five-readings": FiveReadings,
};

/** The drawing, and under it the key when the figure mixes measured and proposed. */
export function FigureFor({ slug, figure, interactive = true }: { slug: string; figure: FigureRef; interactive?: boolean }) {
  const key = figureKey(slug, figure.figure);
  if (!isFigureKey(key)) return null;
  const Drawing = FIGURES[key];
  const mixed = evidenceKindsIn(figure.params).length > 1;
  return (
    <div data-figure-key={key}>
      <Drawing params={figure.params} alt={figure.alt} interactive={interactive} />
      {mixed ? <p data-figure-legend className="mt-1 text-center text-xs text-muted">{EVIDENCE_KEY}</p> : null}
    </div>
  );
}

export function WidgetFor({ slug, variant }: { slug: string } & WidgetProps) {
  const Widget = WIDGETS[slug];
  return Widget ? <Widget variant={variant} /> : <GenericWidget slug={slug} variant={variant} />;
}

export function SimulatorFor({ kind, params }: { kind: string } & SimulatorProps) {
  const Simulator = SIMULATORS[kind];
  if (!Simulator) return <p className="text-sm text-muted">This paper&apos;s simulator is not available in this version of the app.</p>;
  return <Simulator params={params} />;
}
