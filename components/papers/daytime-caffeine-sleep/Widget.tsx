"use client";

import { ProtocolPanel } from "@/components/protocol/primitives";
import { useProtocol } from "@/lib/protocol/useProtocol";
import type { WidgetProps } from "../registry";

export default function Widget({ variant }: WidgetProps) {
  const protocol = useProtocol("daytime-caffeine-sleep");
  return (
    <ProtocolPanel
      protocol={protocol}
      variant={variant}
      title="Caffeine cut-off"
      intro={<>One item carries weight: the 8-hour gap the trial tested. It is graded low because the trial had twenty participants. The bedtime item was a rule of the study, not something it tested, so it counts toward consistency only.</>}
    />
  );
}
