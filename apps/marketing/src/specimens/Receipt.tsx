// The AI app's delivery receipt, in plain words. The signature, hashes and award link are checked
// in the MVP's Verify page; the landing shows what the receipt says, not its internals.
import type { Receipt as R } from "@/data/run";
import { RUN, usdc } from "@/data/run";

export function ReceiptSheet({ r, note }: { r: R; note?: string }) {
  const turn = RUN.turns.find((t) => t.id === r.turn)!;
  const rows: [string, string][] = [
    ["Signed by", "Our demo AI app"],
    ["Card", `${r.name}, labelled Sponsored`],
    ["Shown beside", turn.question],
    ["Mode", "Hosted Solana sandbox"],
  ];
  return (
    <div className="sp-receipt">
      <div className="sp-receipt-head">
        <span className="sp-receipt-title">Delivery receipt</span>
        <span className="px-caption">Signed</span>
      </div>
      <dl className="sp-kv sp-kv-plain">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      <div className="sp-receipt-foot">
        <span className="ms" data-state="accepted">
          <i className="ms-swatch" aria-hidden />
          Charge accepted after the receipt
        </span>
        <span className="sp-receipt-charge">
          {usdc(r.amount)}
          <small>USDC</small>
        </span>
      </div>
      {note ? <p className="px-small" style={{ marginTop: 12 }}>{note}</p> : null}
    </div>
  );
}
