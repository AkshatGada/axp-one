// For advertisers: the campaign as the advertiser writes it, and what happened to it afterwards.
import { PRODUCT_STORY as story } from "@/data/product.story";
import { ADVERTISER_URL, ADVERTISERS as A } from "@/data/copy";
import Chapter, { Ad, Sheet } from "./Chapter";
import s from "./story.module.css";

export default function Advertisers() {
  const sh = A.sheet;
  return (
    <Chapter id="advertisers" copy={A} stages={["01", "03"]} first actions={[{ href: ADVERTISER_URL, label: A.action }]}>
      <Sheet name={sh.title} note={story.advertiser} className={s.under}>
        <div className={s.rows}>
          <div><span className={s.rk}>{sh.offerK}</span><span className={s.rv}>{sh.offer}</span></div>
          <div><span className={s.rk}>{sh.wantK}</span><span className={`${s.rv} ${s.chips}`}>{sh.wants.map((w) => <span key={w}>{w}</span>)}</span></div>
          <div>
            <span className={s.rk}>{sh.adK}</span>
            <div className={s.rv}>
              <Ad name={story.advertiser} text={story.creative} />
              <span className={s.approved}><span className={s.tick} aria-hidden>✓</span>{sh.approved}</span>
            </div>
          </div>
          <div>
            <span className={s.rk}>{sh.limitsK}</span>
            <div className={`${s.rv} ${s.limits}`}>
              {sh.limits.map((l) => <span key={l.k} className={s.limit}><b>{l.v}</b><span>{l.k}, {sh.unit}</span></span>)}
              <span className={s.switch}><i aria-hidden />{sh.running}</span>
            </div>
          </div>
        </div>
      </Sheet>
      <Sheet name={A.log.title} className={s.log}>
        {A.log.rows.map((r) => (
          <div key={r.q} className={s.logRow}>
            <span className={s.logQ}>{r.q}</span>
            <span className={s.pill} data-state={r.state}>{r.state}</span>
            <span className={s.logWhy}>{r.why}</span>
          </div>
        ))}
      </Sheet>
      <p className={s.note}>{A.note}</p>
    </Chapter>
  );
}
