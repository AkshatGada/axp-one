// The publisher's signed delivery receipt (short hashes, truncated signature), joined to its
// charge by award ID. A receipt proves the app delivered the card, not that a person looked.
import type { Receipt as R } from "@/data/run";
import { usdc } from "@/data/run";

export function ReceiptSheet({ r }: { r: R }) {
  const rows: [string, string][] = [
    ["Schema", r.schemaVersion],
    ["Mode", r.mode],
    ["Publisher key", r.publisherKeyId],
    ["Award", r.awardId],
    ["Opportunity", r.opportunityId],
    ["Creative hash", r.creativeHash],
    ["Render acknowledgement", r.renderAcknowledgementHash],
    ["Receipt hash", r.receiptHash],
    ["Signature, Ed25519", r.signature],
  ];
  return (
    <div className="sp-receipt">
      <div className="sp-receipt-head">
        <span className="sp-receipt-title">Delivery receipt</span>
        <span className="px-caption">Signed by the AI app</span>
      </div>
      <dl className="sp-kv">
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
          Accepted charge
        </span>
        <span className="sp-receipt-charge">
          {usdc(r.amount)}
          <small>USDC</small>
        </span>
      </div>
    </div>
  );
}
