import type { Metadata } from "next";
import { Ld } from "@axp/design-system/ledger";
import { LiveRun } from "@/components/live/LiveRun";

export const metadata: Metadata = { title: "Run it live" };

export default function LivePage() {
  return (
    <>
      <Ld.PageBar
        title="Run it live"
        meta={<Ld.Tag tone="brand">Solana Devnet</Ld.Tag>}
        sub="A real run on Solana Devnet: the app answers four questions, advertiser agents decide with Jev, code runs the auctions, your browser shows the Sponsored cards and checks each one is on the page, the app signs the delivery receipts, and payment channels settle on Devnet. About a minute or two."
      />
      <LiveRun />
    </>
  );
}
