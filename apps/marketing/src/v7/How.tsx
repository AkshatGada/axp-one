// The five customer-facing stages: campaign, opportunity, eligible auction, disclosed delivery,
// accounting and payment. One dark stage in the page's own blue; no provider names here.
import { Arrow } from '@axp/design-system/prospectus';
import { PRODUCT_STORY } from '@/data/product.story';
import s from './how.module.css';

export default function How() {
  return <section id="how" data-header-tone="stage" className={s.how} aria-labelledby="how-title">
    <div className={`px-wrap ${s.in}`}>
      <div className={s.head}>
        <div><p className={s.label}>How it works</p><h2 id="how-title" className={`px-h1 ${s.h2}`}>From campaign<br />to conversation<br />to payment.</h2></div>
        <p className={s.intro}>Five stages connect the advertiser, the AI app and the payment.</p>
      </div>

      <figure className={s.figure}>
        <figcaption className={s.figureLabel}>The product flow, illustrated</figcaption>
        <ol className={s.flow}>
          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>01</span><h3>Campaign</h3></div>
            <div className={s.visual}>
              <div className={s.campaign}><span className={s.eyebrow}>Advertiser dashboard</span><b>{PRODUCT_STORY.advertiser}</b><dl><div><dt>Offer + conversations</dt><dd>Described</dd></div><div><dt>Sponsored text</dt><dd>Approved</dd></div><div><dt>Bid + budget limits</dt><dd>Set</dd></div></dl><span className={s.action}>Fund and launch <Arrow width={14} /></span></div>
              <div className={s.endpoint}><span className={s.dot} />Test USDC deposit</div>
            </div>
            <p className={s.caption}>Your approved ad. Your limits.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>02</span><h3>Opportunity</h3></div>
            <div className={s.visual}>
              <div className={s.question}><span className={s.eyebrow}>Someone asks an AI app</span><p>{PRODUCT_STORY.question}</p></div>
              <div className={s.branch}><div><span className={s.branchMark} aria-hidden>↗</span><span><b>The app&apos;s own model</b><small>Writes the answer</small></span></div><div data-ad><span className={s.branchMark} aria-hidden>→</span><span><b>Ad request</b><small>One separate slot</small></span></div></div>
            </div>
            <p className={s.caption}>Two paths. The ad stays out of the answer.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>03</span><h3>Eligible auction</h3></div>
            <div className={s.visual}>
              <div className={s.inputs}><div><b>Each campaign</b><span>Offer, capabilities, intended conversations</span></div><div><b>The opportunity</b><span>The question and the app&apos;s restrictions</span></div></div>
              <div className={s.judgment}><b>Advertiser agents</b><span>Fit + intent</span></div>
              <div className={s.auction}><span className={s.eyebrow}>Fixed rules</span><b>Eligibility · bids · budgets</b><span>Highest valid bid wins</span></div>
            </div>
            <p className={s.caption}>Agents judge fit. Fixed rules decide money.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>04</span><h3>Disclosed delivery</h3></div>
            <div className={s.visual}>
              <div className={s.answer}><i /><i /><i /><span>The app&apos;s answer</span></div>
              <div className={s.card}><span>Sponsored</span><b>{PRODUCT_STORY.advertiser}</b><p>{PRODUCT_STORY.creative}</p><span className={s.destination}>{PRODUCT_STORY.destination} ↗</span></div>
              <div className={s.receipt}><span aria-hidden>✓</span> Labelled insertion confirmed</div>
            </div>
            <p className={s.caption}>An accepted receipt creates one charge.</p>
          </li>

          <li className={s.step}>
            <div className={s.stepHead}><span className={s.number}>05</span><h3>Accounting and payment</h3></div>
            <div className={`${s.visual} ${s.payment}`}>
              <div><span className={s.eyebrow}>Per accepted delivery</span><b>One running total</b><div className={s.vouchers} aria-hidden>{[0,1,2,3,4].map(i => <i key={i} />)}<span>→</span></div><span className={s.latest}>Latest authorized total</span></div>
              <span className={s.down} aria-hidden>↓</span>
              <div className={s.close}><span className={s.eyebrow}>Settlement · test network today</span><b>Close the campaign</b><div><span>The app is paid</span><span>Unused deposit returned</span></div></div>
            </div>
            <p className={s.caption}>Pay per delivery. Settle once.</p>
          </li>
        </ol>
      </figure>

      <div className={s.foot}>
        <details className={s.details}>
          <summary>Inside the flow</summary>
          <div><p>In our integration the answer path receives no advertiser material. With no qualifying bid, the slot stays empty and the answer is unaffected.</p><p>Advertiser agents judge fit and intent. Eligibility, bid amounts and budgets are set by fixed rules, not by a model.</p><p>A bid reserves budget; only an accepted delivery is charged. This demo settles in test USDC on Solana Devnet.</p></div>
        </details>
        <a href="/publisher-demo/" className={s.link}>Inspect a turn in the example chat <Arrow width={18} /></a>
      </div>
    </div>
  </section>;
}
