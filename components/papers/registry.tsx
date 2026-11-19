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
import type { Remembered } from "@/lib/reader-inputs";
import GenericSimulator from "./_generic/Simulator";
import GenericWidget from "./_generic/Widget";
import ParkingSpot from "./daytime-caffeine-sleep/figures/ParkingSpot";
import HiddenTiredness from "./daytime-caffeine-sleep/figures/HiddenTiredness";
import CaffeineWidget from "./daytime-caffeine-sleep/Widget";
import OrderFlips from "./hiit-body-composition/figures/OrderFlips";
import TwoPiles from "./hiit-body-composition/figures/TwoPiles";
import HiitWidget from "./hiit-body-composition/Widget";
import ThreeCrowds from "./steps-days-per-week/figures/ThreeCrowds";
import StepsWidget from "./steps-days-per-week/Widget";
import TongueToBlood from "./turmeric-pepper-breakfast/figures/TongueToBlood";
import FiveReadings from "./turmeric-pepper-breakfast/figures/FiveReadings";
import FirstHalfHour from "./turmeric-pepper-breakfast/figures/FirstHalfHour";
import BreakfastSimulator from "./turmeric-pepper-breakfast/Simulator";
import EnergyLedger from "./sleep-extension-energy-intake/figures/EnergyLedger";

export interface WidgetProps { variant: "article" | "card" }
export interface SimulatorProps {
  params: Record<string, unknown>;
  /** What this reader picked last time on this device (the read hands it in; see lib/reader-inputs.ts). */
  remembered?: Remembered<Record<string, unknown>>;
}
/** `params` is what the picture shows, every value bound to a gated fact; `alt` is its description. */
export interface FigureProps {
  params: Record<string, unknown>; alt: string;
  /** False in the feed card, which is one link: the figure shows its first view and holds no buttons. */
  interactive?: boolean;
  /**
   * The glance view (owner, 2026-11-14), the feed card's still figure: axis labels in words
   * (these), no numeric ticks or values, the gated range as a peach band.
   */
  glance?: { x: string | null; y: string | null };
  /**
   * The read's simulator params, for a "Try it" figure (the protocol layer's figure with figureSlot "try") only, and only in the read:
   * the feed card never passes them, so a members' simulator stays out of the public card (rule 7).
   */
  simulator?: Record<string, unknown>;
  /**
   * What this reader typed or picked last time on this device, for a figure that holds input
   * (lib/reader-inputs.ts, figureInputs). The read only, never the feed card: a card shows the
   * untouched view (R7). Without it the figure keeps its own state, empty at first.
   */
  remembered?: Remembered<Record<string, unknown>>;
}

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  "steps-days-per-week": StepsWidget,
  "daytime-caffeine-sleep": CaffeineWidget,
  "hiit-body-composition": HiitWidget,
};

/** Keyed by the `simulator.kind` written in the paper's editorial.json. */
const SIMULATORS: Record<string, ComponentType<SimulatorProps>> = {
  "estimate-explorer": GenericSimulator,
  // "hiit-forest" has no component: its params feed figure 4B (the protocol layer's Try it figure) in the read.
  "breakfast-meals": BreakfastSimulator,
};

/**
 * One component for every key in lib/content/figures.ts. The type makes the
 * typecheck fail when a listed figure has no component here, and the content
 * build fails when a read names a figure that is not listed.
 */
const FIGURES: Record<FigureKey, ComponentType<FigureProps>> = {
  "daytime-caffeine-sleep/parking-spot": ParkingSpot,
  "daytime-caffeine-sleep/hidden-tiredness": HiddenTiredness,
  "steps-days-per-week/three-crowds": ThreeCrowds,
  "hiit-body-composition/order-flips": OrderFlips,
  "hiit-body-composition/two-piles": TwoPiles,
  "turmeric-pepper-breakfast/tongue-to-blood": TongueToBlood,
  "turmeric-pepper-breakfast/five-readings": FiveReadings,
  "turmeric-pepper-breakfast/first-half-hour": FirstHalfHour,
  "sleep-extension-energy-intake/energy-ledger": EnergyLedger,
};

/** The drawing, and under it the key when the figure mixes measured and proposed. */
export function FigureFor({ slug, figure, interactive = true, glance, simulator, remembered }: { slug: string; figure: FigureRef; interactive?: boolean; glance?: FigureProps["glance"]; simulator?: FigureProps["simulator"]; remembered?: FigureProps["remembered"] }) {
  const key = figureKey(slug, figure.figure);
  if (!isFigureKey(key)) return null;
  const Drawing = FIGURES[key];
  const mixed = evidenceKindsIn(figure.params).length > 1;
  return (
    <div data-figure-key={key}>
      <Drawing params={figure.params} alt={figure.alt} interactive={glance ? false : interactive} glance={glance} simulator={glance ? undefined : simulator} remembered={glance || !interactive ? undefined : remembered} />
      {mixed && !glance ? <p data-figure-legend className="mt-1 text-center text-xs text-muted">{EVIDENCE_KEY}</p> : null}
    </div>
  );
}

export function WidgetFor({ slug, variant }: { slug: string } & WidgetProps) {
  const Widget = WIDGETS[slug];
  return Widget ? <Widget variant={variant} /> : <GenericWidget slug={slug} variant={variant} />;
}

export function SimulatorFor({ kind, params, remembered }: { kind: string } & SimulatorProps) {
  const Simulator = SIMULATORS[kind];
  if (!Simulator) return <p className="text-sm text-muted">This paper&apos;s simulator is not available in this version of the app.</p>;
  return <Simulator params={params} remembered={remembered} />;
}
