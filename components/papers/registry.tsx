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
import GenericSimulator from "./_generic/Simulator";
import GenericWidget from "./_generic/Widget";
import CaffeineSimulator from "./daytime-caffeine-sleep/Simulator";
import CaffeineWidget from "./daytime-caffeine-sleep/Widget";
import HiitSimulator from "./hiit-body-composition/Simulator";
import HiitWidget from "./hiit-body-composition/Widget";
import StepsSimulator from "./steps-days-per-week/Simulator";
import StepsWidget from "./steps-days-per-week/Widget";

export interface WidgetProps { variant: "article" | "card" }
export interface SimulatorProps { params: Record<string, unknown> }

const WIDGETS: Record<string, ComponentType<WidgetProps>> = {
  "steps-days-per-week": StepsWidget,
  "daytime-caffeine-sleep": CaffeineWidget,
  "hiit-body-composition": HiitWidget,
};

/** Keyed by the `simulator.kind` written in the paper's editorial.json. */
const SIMULATORS: Record<string, ComponentType<SimulatorProps>> = {
  "estimate-explorer": GenericSimulator,
  "steps-days": StepsSimulator,
  "caffeine-timeline": CaffeineSimulator,
  "hiit-forest": HiitSimulator,
};

export function WidgetFor({ slug, variant }: { slug: string } & WidgetProps) {
  const Widget = WIDGETS[slug];
  return Widget ? <Widget variant={variant} /> : <GenericWidget slug={slug} variant={variant} />;
}

export function SimulatorFor({ kind, params }: { kind: string } & SimulatorProps) {
  const Simulator = SIMULATORS[kind];
  if (!Simulator) return <p className="text-sm text-muted">This paper&apos;s simulator is not available in this version of the app.</p>;
  return <Simulator params={params} />;
}
