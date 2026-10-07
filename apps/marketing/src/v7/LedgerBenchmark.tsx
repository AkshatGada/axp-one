import { ActionText, Arrow } from "@axp/design-system/prospectus";
import { LEDGER_BENCHMARK as B } from "@/data/copy";
import s from "./benchmark.module.css";

export default function LedgerBenchmark() {
  return (
    <section data-world="paper" className={s.benchmark} data-header-tone="paper" aria-label="Payment channel evidence">
      <div className={`px-wrap ${s.grid}`}>
        <article className={s.panel} aria-labelledby="benchmark-title">
          <p className={s.label}>{B.label}</p>
          <h2 id="benchmark-title" className={s.h2}>{B.h2}</h2>
          <p className={s.mode}>{B.mode}</p>
          <p className={s.channels}>{B.channels}</p>
          <div className={s.flow} aria-label="64 cumulative voucher updates followed by one simulated close per channel">
            <span>{B.updates}</span>
            <Arrow width={24} />
            <span className={s.close}>{B.close}</span>
          </div>
          <p className={s.note}>{B.note}</p>
        </article>
        <article className={`${s.panel} ${s.native}`} aria-labelledby="native-benchmark-title">
          <p className={s.label}>{B.native.label}</p>
          <h2 id="native-benchmark-title" className={s.h2}>{B.native.h3}</h2>
          <p className={s.mode}>{B.native.mode}</p>
          <div className={s.flow} aria-label="824 signed voucher updates across 125 channels, with one finalized Solana Devnet close per channel">
            <span>{B.native.updates}</span>
            <Arrow width={24} />
            <span className={s.close}>{B.native.close}</span>
          </div>
          <p className={s.note}>{B.native.note}</p>
        </article>
        <div className={s.method} data-tone-text=""><ActionText href={B.href} external>{B.action}</ActionText></div>
      </div>
    </section>
  );
}
