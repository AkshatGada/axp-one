// Trust and billing: the rules the product enforces, and one statement drawn to scale from a
// recorded test settlement (values from settlement.latest.json, never hand-typed).
import proof from "@/data/settlement.latest.json";
import { usdc } from "@/data/run";
import { BILLING as B } from "@/data/copy";
import Chapter, { Sheet } from "./Chapter";
import s from "./story.module.css";

const ch = proof.channels[0]!;

export default function Billing() {
  const st = B.statement;
  const share = (Number(ch.paid) / Number(ch.deposit)) * 100;
  return (
    <Chapter id="billing" copy={{ label: B.label, h2: B.h2, points: B.rules, outcome: B.settle }} stages={["04", "05"]}>
      <Sheet name={st.title} note="Test USDC">
        <div className={s.figure}><b>{usdc(ch.deposit)}</b><span>{st.deposit}</span></div>
        <div className={s.track} role="img" aria-label={`${usdc(ch.paid)} paid of a ${usdc(ch.deposit)} deposit; ${usdc(ch.refunded)} returned`}><i style={{ width: `${share}%` }} /></div>
        <div className={s.split}>
          <div><b>{ch.voucherCount}</b><span>{st.delivered}</span></div>
          <div><b>{usdc(ch.paid)}</b><span><i className={s.key} aria-hidden />{st.paid}</span></div>
          <div><b>{usdc(ch.refunded)}</b><span><i className={s.key} data-rest="" aria-hidden />{st.refunded}</span></div>
        </div>
        <p className={s.source}>{st.source}</p>
      </Sheet>
      <p className={s.callout}>{B.receipt}</p>
    </Chapter>
  );
}
