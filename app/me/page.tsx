import type { Metadata } from "next";
import { Settings } from "@/components/me/Settings";

export const metadata: Metadata = { title: "Me" };

export default function MePage() {
  return <Settings />;
}
