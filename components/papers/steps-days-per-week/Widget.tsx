"use client";

import { ProtocolPanel } from "@/components/protocol/primitives";
import { useProtocol } from "@/lib/protocol/useProtocol";
import type { WidgetProps } from "../registry";

export default function Widget({ variant }: WidgetProps) {
  const protocol = useProtocol("steps-days-per-week");
  return (
    <ProtocolPanel
      protocol={protocol}
      variant={variant}
      title="8,000-step days"
      intro={<>Tick the days your tracker passes 8,000. The two weekly targets mirror the study&apos;s two active groups, and both are graded low because the study was observational.</>}
    />
  );
}
