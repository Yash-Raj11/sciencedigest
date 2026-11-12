"use client";

import { ProtocolPanel } from "@/components/protocol/primitives";
import { useProtocol } from "@/lib/protocol/useProtocol";
import type { WidgetProps } from "../registry";

/** The protocol widget a new paper gets before anyone has built it a custom one. */
export default function Widget({ slug, variant }: WidgetProps & { slug: string }) {
  const protocol = useProtocol(slug);
  return <ProtocolPanel protocol={protocol} variant={variant} title={protocol.paper.category} />;
}
