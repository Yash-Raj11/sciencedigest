"use client";

/**
 * Loads what a tier check stands in front of: premium reads, implementation
 * notes and the regimen analysis.
 *
 * The check is never done here. With Supabase it is done by the database (row
 * level security and the regimen_analysis function); in demo mode it is done by
 * the demo route. Anything decided in the browser can be read in the browser.
 */

import { freeContent } from ".";
import { localToday } from "../dates";
import { isDemo, supabase } from "../supabase/client";
import type { PaperContent, PaperMeta, Sentence } from "./types";

export type Gated<T> = { state: "ok"; value: T } | { state: "locked" } | { state: "error"; message: string };

async function demoBundle(slug: string, tier: string): Promise<Gated<{ content: PaperContent | null; takeaways: Sentence[][] }>> {
  if (tier !== "premium") return { state: "locked" };
  const response = await fetch(`/api/demo/gated/${slug}`);
  if (!response.ok) return { state: "error", message: `demo content unavailable (${response.status})` };
  return { state: "ok", value: await response.json() };
}

export async function loadRead(paper: PaperMeta, demoTier: string): Promise<Gated<PaperContent>> {
  if (paper.accessTier === "free") {
    const content = freeContent(paper.slug);
    return content ? { state: "ok", value: content } : { state: "error", message: "read not found" };
  }
  if (isDemo) {
    const bundle = await demoBundle(paper.slug, demoTier);
    if (bundle.state !== "ok") return bundle;
    return bundle.value.content ? { state: "ok", value: bundle.value.content } : { state: "error", message: "read not found" };
  }
  const { data, error } = await supabase()!.from("paper_content").select("content_json").eq("paper_id", paper.id).maybeSingle();
  if (error) return { state: "error", message: error.message };
  // Row level security returns no row to a viewer who may not read it.
  return data ? { state: "ok", value: data.content_json as PaperContent } : { state: "locked" };
}

export async function loadTakeaways(paper: PaperMeta, demoTier: string): Promise<Gated<Sentence[][]>> {
  if (isDemo) {
    const bundle = await demoBundle(paper.slug, demoTier);
    return bundle.state === "ok" ? { state: "ok", value: bundle.value.takeaways } : bundle;
  }
  const { data, error } = await supabase()!.from("paper_feature_content").select("payload")
    .eq("paper_id", paper.id).eq("feature_key", "key_takeaways").maybeSingle();
  if (error) return { state: "error", message: error.message };
  return data ? { state: "ok", value: (data.payload as { takeaways: Sentence[][] }).takeaways } : { state: "locked" };
}

export interface RegimenWeek { week_start: string; sessions: number; target: number | null; met: boolean }
export interface Regimen { weeks: RegimenWeek[]; weeks_met: number; block: { started_on: string | null; days_elapsed: number | null } }

export async function loadRegimen(paper: PaperMeta, demoTier: string): Promise<Gated<Regimen>> {
  if (isDemo) {
    if (demoTier !== "premium") return { state: "locked" };
    const { demoRegimen } = await import("../demo/regimen");
    return { state: "ok", value: demoRegimen(paper.id, localToday()) };
  }
  const { data, error } = await supabase()!.rpc("regimen_analysis", { p_paper: paper.id, p_date: localToday() });
  if (error) return { state: "error", message: error.message };
  return data?.locked ? { state: "locked" } : { state: "ok", value: data as Regimen };
}
