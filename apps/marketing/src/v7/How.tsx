import { Arrow } from '@axp/design-system/prospectus';
import { PRODUCT_STORY } from '@/data/product.story';
import s from './how.module.css';

export default function How() {
  return <section id="how" data-world="stage" data-tone="stage" data-header-tone="stage" className={s.how} aria-labelledby="how-title">
    <div className={`px-wrap ${s.in}`}>
      <div className={s.head} data-tone-text="">
        <div><p className={s.label}>How AXP works</p><h2 id="how-title" className={`px-h1 ${s.h2}`}>From campaign<br />to conversation<br />to payment.</h2></div>
        <p className={s.intro}>One exchange connects the advertiser, the AI app and the payment channel.</p>
      </div>

      <figure className={s.figure}>
        <figcaption className={s.figureLabel}>The product flow</figcaption>
        <ol className={s.flow}>
          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>01</span><h3>Launch a campaign</h3></div>
            <div className={s.visual}>
              <div className={s.campaign}><span className={s.eyebrow}>Advertiser dashboard</span><b>{PRODUCT_STORY.advertiser}</b><dl><div><dt>Offer + context</dt><dd>Defined</dd></div><div><dt>Sponsored copy</dt><dd>Approved</dd></div><div><dt>Bid + spend limits</dt><dd>Set</dd></div></dl><span className={s.action}>Fund channel &amp; launch <Arrow width={14} /></span></div>
              <div className={s.endpoint}><span className={s.dot} />Solana Devnet channel</div>
            </div>
            <p className={s.caption}>Approved creative. Funded budget.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>02</span><h3>Request from an AI app</h3></div>
            <div className={s.visual}>
              <div className={s.question}><span className={s.eyebrow}>User question</span><p>{PRODUCT_STORY.question}</p></div>
              <div className={s.branch}><div><span className={s.branchMark} aria-hidden>↗</span><span><b>Your answer model</b><small>Independent answer</small></span></div><div data-ad><span className={s.branchMark} aria-hidden>→</span><span><b>Publisher SDK</b><small>Ad request to AXP</small></span></div></div>
            </div>
            <p className={s.caption}>Two parallel paths. A separate ad slot.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>03</span><h3>Match and auction</h3></div>
            <div className={s.visual}>
              <div className={s.inputs}><div className={s.evidence}><b>ContextHint evidence</b><span>Embeddings + inferred context</span></div><div><b>Advertiser hints</b><span>Campaign instructions</span></div></div>
              <div className={s.judgment}><b>Jev</b><span>Fit + intent</span></div>
              <div className={s.auction}><span className={s.eyebrow}>Auction engine</span><b>Eligibility · bids · budgets</b><span>One admitted winner</span></div>
            </div>
            <p className={s.caption}>Models judge fit. Code controls money.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>04</span><h3>Deliver the placement</h3></div>
            <div className={s.visual}>
              <div className={s.answer}><i /><i /><i /><span>Independent answer</span></div>
              <div className={s.card}><span>Sponsored</span><b>{PRODUCT_STORY.advertiser}</b><p>{PRODUCT_STORY.creative}</p><span className={s.destination}>{PRODUCT_STORY.destination} ↗</span></div>
              <div className={s.receipt}><span aria-hidden>✓</span> Exact insertion + disclosure</div>
            </div>
            <p className={s.caption}>An accepted receipt creates one charge.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>05</span><h3>Accumulate and settle</h3></div>
            <div className={`${s.visual} ${s.payment}`}>
              <div><span className={s.eyebrow}>Off-chain</span><b>Cumulative vouchers</b><div className={s.vouchers} aria-hidden>{[0,1,2,3,4].map(i => <i key={i} />)}<span>→</span></div><span className={s.latest}>Latest authorized total</span></div>
              <span className={s.down} aria-hidden>↓</span>
              <div className={s.close}><span className={s.eyebrow}>On-chain · Solana Devnet</span><b>Close the channel</b><div><span>Publisher payout</span><span>Unused deposit returned</span></div></div>
            </div>
            <p className={s.caption}>One close. Payout and refund.</p>
          </li>
        </ol>
      </figure>

      <div className={s.foot}>
        <details className={s.details}>
          <summary>Inside the flow</summary>
          <div><p>The answer receives no advertiser material. A no-fill leaves it available.</p><p>ContextHint evidence and advertiser instructions remain separate inputs. Jev judges fit; eligibility and auction rules enforce bids and budgets.</p><p>Accepted delivery advances cumulative authorization off-chain. Only a finalized channel close proves payout and refund. This demo uses test USDC on Solana Devnet.</p></div>
        </details>
        <a href="/publisher-demo/" className={s.link}>Inspect a turn in the chat <Arrow width={18} /></a>
      </div>
    </div>
  </section>;
}
