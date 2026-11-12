"use client";

import { ProtocolPanel } from "@/components/protocol/primitives";
import { useProtocol } from "@/lib/protocol/useProtocol";
import type { WidgetProps } from "../registry";

export default function Widget({ variant }: WidgetProps) {
  const protocol = useProtocol("hiit-body-composition");
  return (
    <ProtocolPanel
      protocol={protocol}
      variant={variant}
      title="Interval block"
      intro={<>Two tracks from the same paper. The lean-mass track is graded high and the body-fat track low, so the same effort fills more of your bar on the lean-mass track. Log each session once; it counts for whichever tracks are on.</>}
    />
  );
}
