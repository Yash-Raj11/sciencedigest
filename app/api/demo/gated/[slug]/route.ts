/**
 * DEMO MODE ONLY. Serves members' reads from the generated file so the premium
 * screens can be looked at before Supabase is connected.
 *
 * As soon as Supabase is configured this route answers 404: members' content
 * then comes from the database, where row level security decides who gets it.
 */

import gated from "@/content/generated/gated.json";
import { isDemo } from "@/lib/supabase/client";

const content = gated.content as Record<string, unknown>;
const takeaways = gated.takeaways as Record<string, unknown>;

export async function GET(_request: Request, { params }: RouteContext<"/api/demo/gated/[slug]">) {
  const { slug } = await params;
  if (!isDemo || !(slug in takeaways)) return new Response("Not found", { status: 404 });
  return Response.json({ content: content[slug] ?? null, takeaways: takeaways[slug] });
}
