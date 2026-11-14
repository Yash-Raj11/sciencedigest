import type { Metadata } from "next";
import { Dashboard } from "@/components/game/Dashboard";

export const metadata: Metadata = { title: "Life Game" };

export default function TodayPage() {
  return <Dashboard />;
}
