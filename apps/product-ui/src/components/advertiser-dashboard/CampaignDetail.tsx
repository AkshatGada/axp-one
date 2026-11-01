'use client';
import {HspPayment} from '../hsp/HspPayment';
import { Ld } from '@axp/design-system/ledger';
import { currencyUnit, nativeSettlementLabel, networkLabel, networkOf } from './payment';
import { PaymentPanel } from './PaymentPanel';
import { amount, count, date, decimal, type Bootstrap, type Campaign, type ProductState } from './model';
import { CampaignStatus } from './CampaignStatus';
import type { CampaignAction } from './AdvertiserDashboard';

const eventLabels: Record<string, string> = { campaign_created: 'Campaign created', campaign_approved: 'Campaign approved', campaign_launched: 'Campaign launched', campaign_paused: 'Campaign paused', campaign_resumed: 'Campaign resumed', synthetic_channel_opened: 'Test budget set aside', synthetic_channel_settled: 'Campaign closed and settled in test credits', delivery_accepted: 'Sponsored card shown and accepted' };
function eventLabel(type?: string) { if (!type) return 'Campaign updated'; const text = eventLabels[type] ?? type.replaceAll('_', ' ').replace(/\bsynthetic\b/g, 'test'); return text.charAt(0).toUpperCase() + text.slice(1); }

export function CampaignDetail({ campaign: current, state, bootstrap, native, busy, onBack, onAction }: {
  campaign: Campaign; state: ProductState; bootstrap: Bootstrap; native: boolean; busy: boolean; onBack: () => void; onAction: (verb: CampaignAction) => void;
}) {
  const direct=current.paymentModel==='direct';
  const unit = currencyUnit(native, networkOf(current));
  const deliveries = state.deliveries.filter(d => d.campaignId === current.id);
  const events = state.events.filter(e => e.campaignId === current.id);
  const settled = native ? nativeSettlementLabel(current, 'settledBaseUnits') : `${decimal(current.settledBaseUnits)} ${unit}`;
  const refund = native ? nativeSettlementLabel(current, 'refundBaseUnits') : `${decimal(current.refundBaseUnits)} ${unit}`;
  return <>
    <Ld.PageBar title={current.name} sub={`${current.brandName} · shared demo campaign`}
      meta={<><CampaignStatus status={current.status} />{native && <Ld.Tag tone="outline">{networkLabel(networkOf(current))}</Ld.Tag>}</>}
      crumbs={<button type="button" className="ad-text-button" onClick={onBack}>← Campaigns</button>}
      actions={<div className="ad-action-row">
        <Ld.Button variant="ghost" disabled={busy} onClick={() => onAction('duplicate')}>Duplicate</Ld.Button>
        {current.status === 'active' && <Ld.Button variant="secondary" disabled={busy} onClick={() => onAction('pause')}>Pause campaign</Ld.Button>}
        {current.status === 'paused' ? <Ld.Button disabled={busy} onClick={() => onAction('resume')}>Resume campaign</Ld.Button>
          : current.status === 'active' ? <Ld.Button href={`/publisher-demo/?network=${networkOf(current)}`}>Try it in the example chat →</Ld.Button> : null}
      </div>} />
    <Ld.StatStrip label="Campaign results" items={[
      { label: 'Accepted deliveries', value: count(current, state.deliveries), note: 'Sponsored cards shown' },
      { label: 'Spend', value: decimal(amount(current, 'spend')), unit, note: `Limit ${decimal(current.budgetCapBaseUnits)} ${unit}` },
      { label: 'Left to spend', value: decimal(amount(current, 'remaining')), unit, note: 'Limit less spend and held amounts' },
      native ? { label: 'Paid out', value: <span className="ad-stat-text">{settled}</span>, note: 'Confirmed publisher payout' } : { label: 'Settled', value: decimal(current.settledBaseUnits), unit, note: direct?'Finalized HSP QA payments':'Test credits, no real money' },
    ]} />
    <div className="ad-detail-grid">
      <div className="ld-stack">
        <Ld.Panel title="Deliveries" sub="Each row is one Sponsored card shown below an answer. It does not prove anyone read it." flush>
          {deliveries.length ? <Ld.Table rows={deliveries} caption="Accepted campaign deliveries" columns={[
            { key: 'question', head: 'Conversation', cell: d => <span className="ad-delivery-question">{d.question ?? 'Sponsored card shown'}</span> },
            { key: 'time', head: 'Recorded', cell: d => date(d.createdAt) },
            { key: 'amount', head: `Charge, ${unit}`, num: true, cell: d => decimal(d.priceBaseUnits ?? d.amountBaseUnits ?? '0') },
          ]} /> : <div className="ad-pad"><Ld.Empty title="No deliveries yet" action={current.status === 'active' ? <Ld.Button variant="secondary" href={`/publisher-demo/?network=${networkOf(current)}`}>Ask a matching question →</Ld.Button> : undefined}>A delivery appears when this campaign wins a placement and its card is shown in the example chat.</Ld.Empty></div>}
        </Ld.Panel>
        {direct&&deliveries.length>0&&<Ld.Panel title="Payment details" sub="Each accepted delivery has one HSP payment">{deliveries.map(d=>d.id?<Ld.Disclosure key={d.id} summary={`Payment for ${d.id}`}><HspPayment chargeId={d.id} /></Ld.Disclosure>:null)}</Ld.Panel>}
        <Ld.Panel title="Activity">
          {events.length ? <Ld.Timeline rows={events.slice(-8).reverse().map((e, i) => ({ key: e.id ?? String(i), time: date(e.createdAt), what: e.message ?? eventLabel(e.type) }))} /> : <p className="ld-secondary">Nothing has happened to this campaign yet.</p>}
        </Ld.Panel>
      </div>
      <aside className="ld-stack">
        <Ld.Panel title="Approved Sponsored card" sub="Shown below the answer, never inside it">
          <Ld.SponsoredCard advertiser={current.brandName} text={current.approvedText} url={current.websiteURL} />
          <p className="ad-card-caption ld-caption">Opens {current.websiteURL}</p>
        </Ld.Panel>
        <Ld.Panel title="Budget" sub={direct?'USD obligations · HSP QA':native ? `${networkLabel(networkOf(current))} · ${unit}` : 'Test credits · no real money'}>
          <dl className="ad-ledger">
            <div><dt>Left to spend<small>Limit less spend and held amounts</small></dt><dd>{decimal(amount(current, 'remaining'))} {unit}</dd></div>
            <div><dt>Held<small>Awaiting delivery, not a charge yet</small></dt><dd>{decimal(current.reservedBaseUnits)} {unit}</dd></div>
            <div><dt>Accepted<small>Counted in spend</small></dt><dd>{decimal(current.acceptedBaseUnits)} {unit}</dd></div>
            {!direct&&<div><dt>Authorized<small>Running total, adds no spend</small></dt><dd>{decimal(current.authorizedBaseUnits)} {unit}</dd></div>}
            <div><dt>{native ? 'Paid out' : 'Settled'}<small>{direct?'Finalized QA payment':native ? 'Confirmed publisher payout' : 'Recorded when the campaign closes'}</small></dt><dd>{settled}</dd></div>
            {!direct&&<div><dt>Returned<small>{native ? 'Confirmed unused deposit' : 'Unused amount at close'}</small></dt><dd>{refund}</dd></div>}
          </dl>
          <Ld.Disclosure summary="Targeting and limits">
            <dl className="ad-review">
              <div><dt>Conversations</dt><dd>{current.contextHints.join(' · ')}</dd></div>
              <div><dt>Product features</dt><dd>{current.declaredCapabilities.map(id => bootstrap.capabilities.find(cap => cap.id === id)?.label ?? id).join(', ') || 'None declared'}</dd></div>
              <div><dt>Maximum bid</dt><dd>{decimal(current.maxBidBaseUnits)} {unit} per card</dd></div>
              <div><dt>Spending limit</dt><dd>{decimal(current.budgetCapBaseUnits)} {unit}</dd></div>
              {!direct&&<div><dt>{native ? 'Channel deposit' : 'Test credits set aside'}</dt><dd>{decimal(current.depositBaseUnits)} {unit}</dd></div>}
            </dl>
          </Ld.Disclosure>
        </Ld.Panel>
        <PaymentPanel campaign={current} native={native} busy={busy} onSettle={() => onAction('settle')} onPayout={() => onAction('payout')} onClose={() => onAction('close')} onReconcile={() => onAction('reconcile')} onAuthorize={() => onAction('authorize')} onRetryOpen={() => onAction('launch')} />
      </aside>
    </div>
  </>;
}
