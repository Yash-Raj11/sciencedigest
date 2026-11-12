import type { Metadata } from "next";
import { QueueBoard } from "@/components/admin/QueueBoard";

export const metadata: Metadata = { title: "Instagram queue", robots: { index: false } };

export default function QueuePage() {
  return <QueueBoard />;
}
