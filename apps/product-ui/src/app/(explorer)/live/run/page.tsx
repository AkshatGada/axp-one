import type { Metadata } from "next";
import { RunView } from "@/components/live/RunView";

export const metadata: Metadata = { title: "Live run" };

export default function LiveRunPage() {
  return <RunView />;
}
