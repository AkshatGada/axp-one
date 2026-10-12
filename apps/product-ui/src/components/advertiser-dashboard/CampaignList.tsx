'use client';
import { useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { currencyUnit, networkLabel, networkOf, networkTotals } from './payment';
import { amount, count, decimal, workspaceDeliveryCount, type Bootstrap, type Campaign, type ProductState } from './model';
import { CampaignStatus } from './CampaignStatus';
import { DemoNotice, destinations, type Presence } from '../shared/mode';

const filters = [['all', 'All'], ['active', 'Active'], ['draft', 'Drafts'], ['paused', 'Paused'], ['settled', 'Closed']] as const;
/** Bar width is a display projection only; the exact amounts stay as server strings beside it. */
function share(spend: string, cap: string) { const total = Number(cap); return total > 0 ? Math.min(100, Math.round(Number(spend) / total * 100)) : 0; }

export function CampaignList({ state, bootstrap, native, busy, presence, rows, onOpen, onCreate, onReload }: {
  state: ProductState; bootstrap: Bootstrap; native: boolean; busy: boolean; presence: Presence; rows: Campaign[];
  onOpen: (campaign: Campaign) => void; onCreate: () => void; onReload: () => void;
}) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState<string>('all');
  const unit = currencyUnit(native), totals = networkTotals(rows), summary = state.summary;
  const active = rows.filter(c => c.status === 'active').length, drafts = rows.filter(c => c.status === 'draft').length;
  const sum = (key: 'spend' | 'settled') => rows.reduce((total, c) => total + BigInt(amount(c, key)), 0n).toString();
  const visible = rows.filter(c => (filter === 'all' || c.status === filter) && `${c.name} ${c.brandName}`.toLowerCase().includes(query.trim().toLowerCase()));
  const countOf = (value: string) => value === 'all' ? rows.length : rows.filter(c => c.status === value).length;
  return <>
    <Ld.PageBar title="Campaigns" sub="Example advertisers in the shared demo. Create one to see how a campaign is set up, approved and delivered."
      actions={rows.length ? <Ld.Button size="lg" onClick={onCreate}>New campaign</Ld.Button> : undefined} />
    <DemoNotice presence={presence} />
    {native && bootstrap.payments?.ready !== true && <Ld.Notice tone="blocked" title="Payments are unavailable right now">{bootstrap.payments?.reason ?? 'New campaigns cannot be funded yet.'} You can still save drafts.</Ld.Notice>}
    {bootstrap.engine?.ready === false && <Ld.Notice tone="blocked" title="Campaigns cannot compete right now">The buying agent is unavailable. {bootstrap.engine.reason ?? ''}</Ld.Notice>}
    {!rows.length ? <Ld.Panel>
      <div className="ad-empty">
        <div className="ad-empty-copy">
          <h2 className="ld-section-title">Create the first demo campaign</h2>
          <p className="ld-secondary">Describe an offer, approve the exact Sponsored card and set a spending limit. It takes five short steps and uses {unit}.</p>
          <div><Ld.Button size="lg" onClick={onCreate}>New campaign</Ld.Button></div>
        </div>
        <div className="ad-empty-card" aria-label="Example Sponsored card"><Ld.SponsoredCard advertiser="Your brand" text="A useful offer, shown as a clearly labelled card below the answer." url="" /></div>
      </div>
    </Ld.Panel> : <>
      <Ld.StatStrip label="Shared demo totals" items={[
        { label: 'Active campaigns', value: active, note: `${drafts} draft${drafts === 1 ? '' : 's'}` },
        { label: 'Accepted deliveries', value: workspaceDeliveryCount(state), note: 'Sponsored cards shown' },
        ...(native ? totals.map(total => ({ key: total.network, label: `${networkLabel(total.network)} spend`, value: decimal(total.spendBaseUnits), unit: currencyUnit(true, total.network), note: `${decimal(total.settledBaseUnits)} paid out` }))
          : [{ label: 'Spend', value: decimal(summary?.spendBaseUnits ?? sum('spend')), unit, note: 'Accepted deliveries' }, { label: 'Settled', value: decimal(summary?.settledBaseUnits ?? sum('settled')), unit, note: 'No real money' }]),
      ]} />
      <Ld.Panel flush foot={<span>A delivery is a Sponsored card shown below an answer. It does not measure attention, clicks or sales.</span>}>
        <div className="ad-table-tools">
          <div className="ad-status-filters" role="group" aria-label="Filter by status">
            {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}<small>{countOf(value)}</small></button>)}
          </div>
          <div className="ld-row ad-tools-right">
            <input type="search" className="ld-input ad-search" aria-label="Search campaigns" placeholder="Search campaigns" value={query} onChange={e => setQuery(e.target.value)} />
            <Ld.Button variant="ghost" disabled={busy} onClick={onReload}>Refresh</Ld.Button>
          </div>
        </div>
        {visible.length ? <>
          <div className="ld-rowhead ad-campaign-cols" aria-hidden="true"><span>Campaign</span><span>Status</span><span className="ld-num">Deliveries</span><span>Spend of limit</span><span /></div>
          <ul className="ld-rows" aria-label="Demo campaigns">
            {visible.map(c => {
              const u = currencyUnit(native, networkOf(c)), spend = amount(c, 'spend');
              return <li key={c.id}>
                <button type="button" className="ld-rowitem ad-campaign-cols" onClick={() => onOpen(c)}>
                  <span className="ad-campaign-name"><span className="ad-initial" aria-hidden="true">{(c.brandName || c.name || 'C').slice(0, 1).toUpperCase()}</span><span><strong>{c.brandName || 'Brand not added'}</strong><small>{c.name || 'Untitled campaign'}{native ? ` · ${networkLabel(networkOf(c))}` : ''}</small></span></span>
                  <span><CampaignStatus status={c.status} /></span>
                  <span className="ld-num"><span className="ad-cell-label">Deliveries </span>{count(c, state.deliveries)}</span>
                  <span className="ad-spend"><span>{decimal(spend)} of {decimal(c.budgetCapBaseUnits)} {u}</span><span className="ld-progress-track" aria-hidden="true"><i style={{ width: `${share(spend, c.budgetCapBaseUnits)}%` }} /></span></span>
                  <span className="ad-row-go">{c.status === 'draft' ? 'Continue' : 'Open'} <span aria-hidden="true">→</span></span>
                </button>
              </li>;
            })}
          </ul>
        </> : <div className="ad-pad"><Ld.Empty title="No campaigns match" action={<Ld.Button variant="secondary" onClick={() => { setFilter('all'); setQuery(''); }}>Clear filters</Ld.Button>}>Try another status or a different search.</Ld.Empty></div>}
      </Ld.Panel>
      <p className="ad-next"><a href={destinations.exampleChat.href}>See a campaign appear in the {destinations.exampleChat.label.toLowerCase()} →</a></p>
    </>}
  </>;
}
