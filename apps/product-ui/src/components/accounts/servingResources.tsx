'use client';

import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { RunAction } from './AccountForms';
import type { AccountActivity, AccountReport, AccountReportDelivery, AccountReportSummary, Campaign, CampaignEnrollment } from './types';
import { amountUnit, deliveryLabel, dispositionLabel, executionLabel, formatUnits, formatWhen, modeName, networkName } from './format';

function safeError(failure: unknown) {
  return failure instanceof AccountApiError ? failure.message : 'The account request could not be completed. Reload before continuing.';
}

export function CampaignServing({ client, organizationId, campaign, ready, busy, dirty, run, onUnauthorized, onConflict, financialMode = 'synthetic', onEnabledKnown }: {
  client: AccountsClient; organizationId: string; campaign: Campaign; ready: boolean; busy: boolean; dirty: boolean;
  run: RunAction; onUnauthorized: () => void; onConflict: () => void; financialMode?: 'synthetic' | 'devnet';
  onEnabledKnown?: (campaignId: string, enabled: boolean) => void;
}) {
  const native = financialMode === 'devnet', label = native ? 'catalogue eligibility' : 'serving';
  const [enrollment, setEnrollment] = useState<CampaignEnrollment | null>(null);
  const [known, setKnown] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setEnrollment(null); setKnown(false); setError(''); setLoading(ready);
    if (ready) void client.campaignServing(organizationId, campaign.id).then(result => {
      if (active) { setEnrollment(result.enrollment); setKnown(true); }
    }).catch(failure => {
      if (!active) return;
      setError(safeError(failure));
      if (failure instanceof AccountApiError && failure.status === 401) onUnauthorized();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, organizationId, campaign.id, campaign.version, campaign.approvedContentHash, ready, revision, onUnauthorized]);

  const current = enrollment?.version === campaign.version && enrollment.approvedContentHash === campaign.approvedContentHash;
  const enabled = Boolean(current && enrollment?.enabled && campaign.status === 'approved');
  useEffect(() => { if (known) onEnabledKnown?.(campaign.id, enabled); }, [known, enabled, campaign.id, onEnabledKnown]);
  async function changeServing(nextEnabled: boolean) {
    await run(nextEnabled ? `Turning on ${label}` : `Pausing ${label}`, async () => {
      setError('');
      try {
        const result = await client.setCampaignServing(organizationId, campaign.id, { expectedVersion: campaign.version, enabled: nextEnabled });
        if (!alive.current) return;
        setEnrollment(result.enrollment); setKnown(true); setRevision(value => value + 1);
      } catch (failure) {
        if (alive.current) {
          // Never retry a write or silently accept a newer version, including ambiguous failures.
          setKnown(false); setEnrollment(null); setError(safeError(failure));
          if (failure instanceof AccountApiError && failure.status === 409 && failure.code === 'campaign_version_conflict') onConflict();
        }
        throw failure;
      }
    }, nextEnabled ? `Version ${campaign.version} is now on for ${label}. No funding or payment was authorized.` : 'Paused. No new matching. Placements already awarded and receipts already accepted are unchanged.');
  }
  const stale = Boolean(enrollment?.enabled && !enabled);
  const state = loading ? 'Checking' : !known ? 'Not verified' : enabled ? (native ? 'Eligible' : 'Serving on') : stale ? 'Needs approval again' : enrollment ? 'Paused' : 'Off';
  return <>
    <Ld.Panel id="campaign-serving" title={native ? 'Serving · catalogue eligibility' : 'Serving'}
      sub={native ? 'Solana Devnet test network' : 'Simulated accounting on this server'}
      actions={ready ? <span className="ld-tag" data-tone={enabled ? 'success' : stale ? 'warning' : 'outline'} role="status">{state}</span> : <span className="ld-tag" data-tone="outline">Unavailable</span>}>
      <section className="ld-stack" aria-label="Campaign serving">
        <p className="ld-body">{native
          ? 'Turning this on only makes the approved version eligible. It can bid once it also has a finalized deposit and an activated channel under Wallet.'
          : 'Turning serving on lets this approved version compete for placements in AI apps on this network. Accepted placements add simulated ledger charges only. No deposit, payout or refund takes place.'}</p>
        {!ready ? <Ld.Callout tone="warning" title="Serving is not available on this server">Approving a campaign never starts serving, and nothing is served from here until the account network is connected.</Ld.Callout> : <>
          {enrollment && <p className="ld-secondary">{enabled ? `Version ${campaign.version} is on.` : stale ? `Version ${enrollment.version} was on. The current saved version is not eligible until you approve it and turn serving on again.` : `Version ${enrollment.version} is paused.`} Last changed {formatWhen(enrollment.updatedAt)}.</p>}
          {known && !enrollment && <p className="ld-secondary">This campaign has never been turned on.</p>}
          {error && <p className="account-error" role="alert">{error}</p>}
          {dirty && <p className="ld-secondary">Save and approve your edits before changing serving.</p>}
          {campaign.status !== 'approved' && <p className="ld-secondary">Approve the saved version first. Only an approved version can be turned on.</p>}
          <div className="ld-row">
            <Ld.Button disabled={busy || loading || !known || dirty || campaign.status !== 'approved' || enabled}
              onClick={() => void changeServing(true)}>{native ? 'Make eligible' : 'Turn serving on'} · version {campaign.version}</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy || loading || !known || dirty || !enrollment?.enabled}
              onClick={() => void changeServing(false)}>Pause {native ? 'eligibility' : 'serving'}</Ld.Button>
            <Ld.Button variant="ghost" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Check status again</Ld.Button>
          </div>
          <p className="ld-secondary">Pausing stops new matching only. It does not undo placements already awarded or receipts already accepted.</p>
        </>}
      </section>
    </Ld.Panel>
    <OwnerReport key={`report:${revision}`} client={client} organizationId={organizationId} resourceId={campaign.id}
      kind="campaign" ready={ready} busy={busy} onUnauthorized={onUnauthorized} />
  </>;
}

type NetworkRow = { network: string; summary: AccountReportSummary };

export function OwnerReport({ client, organizationId, resourceId, kind, ready, busy, onUnauthorized }: {
  client: AccountsClient; organizationId: string; resourceId: string; kind: 'campaign' | 'app';
  ready: boolean; busy: boolean; onUnauthorized: () => void;
}) {
  const [report, setReport] = useState<AccountReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setReport(null); setError(''); setLoading(ready);
    if (ready) void (kind === 'campaign' ? client.campaignReport(organizationId, resourceId) : client.appReport(organizationId, resourceId)).then(result => {
      if (active) setReport(result);
    }).catch(failure => {
      if (!active) return;
      setError(safeError(failure));
      if (failure instanceof AccountApiError && failure.status === 401) onUnauthorized();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, organizationId, resourceId, kind, ready, revision, onUnauthorized]);
  const campaign = kind === 'campaign';
  const mode = report?.financialMode ?? 'synthetic';
  const money = campaign ? 'Accepted spend' : 'Accrued earnings';
  const rows: NetworkRow[] = report ? Object.entries(report.bySettlementNetwork).map(([network, summary]) => ({ network, summary: summary! })) : [];
  return <Ld.Panel id={campaign ? 'campaign-activity' : 'app-report'} title={campaign ? 'Activity and spend' : 'Deliveries, receipts and earnings'}
    sub={report ? modeName(report.financialMode) : 'Private to your organization'} flush={Boolean(report)}
    actions={ready ? <Ld.Button variant="secondary" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh</Ld.Button> : undefined}>
    <section aria-label={`Private ${kind} report`}>
      {!ready && <Ld.Empty title="Reports are not available on this server">Reports appear once the account network is connected. Nothing is shown from the shared demonstration.</Ld.Empty>}
      {ready && loading && <p className="ld-secondary account-table-note" role="status">Loading your private report…</p>}
      {ready && error && <div className="account-table-note"><p className="account-error" role="alert">{error}</p></div>}
      {report && <div className="ld-stack-lg" style={{ padding: 'var(--ld-panel-pad) 0 0' }}>
        <div className="ld-stack" style={{ padding: '0 var(--ld-panel-pad)' }}>
          <p className="ld-body">{report.financialMode === 'devnet'
            ? `${money} is the total of accepted receipts. Reserved is budget held for placements still in progress. Neither is a payout: see Wallet for what was authorized, paid and refunded.`
            : `${money} is the simulated total of accepted receipts. Reserved is simulated budget held for placements still in progress. Neither is a payment.`}</p>
          <p className="ld-secondary">A receipt proves an accepted insertion with the Sponsored label. It does not prove attention, clicks or conversion.</p>
        </div>
        <Ld.Table<NetworkRow> caption="Totals by network. Currencies are never combined." rows={rows} columns={[
          { key: 'network', head: 'Network', cell: row => <span className="ld-strong">{networkName(row.network)}</span> },
          { key: 'count', head: campaign ? 'Accepted placements' : 'Accepted deliveries', num: true, cell: row => row.summary.deliveryCount },
          { key: 'accepted', head: money, num: true, cell: row => `${formatUnits(row.summary.acceptedBaseUnits)} ${amountUnit(report.financialMode, row.network)}` },
          { key: 'reserved', head: 'Reserved', num: true, cell: row => `${formatUnits(row.summary.reservedBaseUnits)} ${amountUnit(report.financialMode, row.network)}` },
        ]} />
        {report.activity && <section className="ld-stack" aria-label="Saved opportunity activity">
          <div className="ld-stack" style={{ padding: '0 var(--ld-panel-pad)', gap: 2 }}>
            <h4 className="account-part-title">Auction activity</h4>
            <p className="ld-secondary">Showing {report.activity.length} of {report.activityTotal} saved entries. Question text and private campaign inputs are never included.</p>
          </div>
          {!report.activity.length ? <div className="account-table-note"><Ld.Empty title="No activity yet">{campaign ? 'Activity appears here when this campaign is considered for a conversation.' : 'Activity appears here when your app requests an ad.'}</Ld.Empty></div>
            : <Ld.Table<AccountActivity> caption="Auction activity" rows={report.activity} columns={[
              { key: 'outcome', head: 'Outcome', cell: entry => <span className="ld-tag" data-tone={entry.disposition === 'won' ? 'success' : 'outline'}>{dispositionLabel[entry.disposition]}</span> },
              { key: 'delivery', head: 'Delivery', cell: entry => deliveryLabel[entry.deliveryStatus] },
              { key: 'bid', head: 'Bid', num: true, cell: entry => entry.bidBaseUnits === null ? 'No bid' : `${formatUnits(entry.bidBaseUnits)} ${amountUnit(report.financialMode, entry.settlementNetwork)}` },
              { key: 'source', head: 'Decision source', cell: entry => executionLabel(entry.execution) },
              { key: 'more', head: 'Record', cell: entry => <details className="account-more-inline">
                <summary>Details</summary>
                <dl className="account-readiness account-break">
                  <div><dt>Decision</dt><dd>{entry.decision.replaceAll('_', ' ')}</dd></div>
                  <div><dt>Reason codes</dt><dd>{entry.reasonCodes.join(', ') || 'None recorded'}</dd></div>
                  <div><dt>Network</dt><dd>{networkName(entry.settlementNetwork)}</dd></div>
                  <div><dt>Opportunity</dt><dd className="account-idline">{entry.opportunityId}</dd></div>
                  {entry.campaignVersionId && <div><dt>Saved version</dt><dd className="account-idline">{entry.campaignVersionId}</dd></div>}
                  {entry.awardId && <div><dt>Award</dt><dd className="account-idline">{entry.awardId}</dd></div>}
                </dl>
              </details> },
            ]} />}
          <p className="ld-secondary" style={{ padding: '0 var(--ld-panel-pad)' }}>Not eligible is a policy rule, not a model decision. Decision unavailable is not a judgment that the campaign was a poor fit.</p>
        </section>}
        <section className="ld-stack" aria-label="Receipts">
          <div className="ld-stack" style={{ padding: '0 var(--ld-panel-pad)', gap: 2 }}>
            <h4 className="account-part-title">Receipts</h4>
            <p className="ld-secondary">Showing {report.deliveries.length} receipt records (at most 100). The totals above may cover more deliveries than this list.</p>
          </div>
          {!report.deliveries.length ? <div className="account-table-note" style={{ paddingBottom: 16 }}><Ld.Empty title="No receipts yet">{campaign ? 'A receipt appears when an AI app confirms your Sponsored card was inserted below its answer.' : 'A receipt appears when your app confirms a Sponsored card was inserted below its answer.'} Reserved amounts, if any, are in the totals above.</Ld.Empty></div>
            : <Ld.Table<AccountReportDelivery> caption="Receipts" rows={report.deliveries} columns={[
              { key: 'when', head: 'Accepted', cell: delivery => formatWhen(delivery.acceptedAt) },
              { key: 'network', head: 'Network', cell: delivery => networkName(delivery.settlementNetwork) },
              { key: 'amount', head: campaign ? 'Charge' : 'Earning', num: true, cell: delivery => `${formatUnits(delivery.amountBaseUnits)} ${amountUnit(report.financialMode, delivery.settlementNetwork)}` },
              { key: 'state', head: 'Status', cell: () => <span className="ld-tag" data-tone="outline">{report.financialMode === 'devnet' ? 'Accepted charge, payout tracked under Wallet' : 'Simulated, no payment'}</span> },
              { key: 'more', head: 'Record', cell: delivery => <details className="account-more-inline">
                <summary>Receipt details</summary>
                <dl className="account-readiness account-break">
                  <div><dt>Receipt hash</dt><dd className="account-idline">{delivery.receiptHash}</dd></div>
                  <div><dt>Award</dt><dd className="account-idline">{delivery.awardId}</dd></div>
                  <div><dt>Opportunity</dt><dd className="account-idline">{delivery.opportunityId}</dd></div>
                  <div><dt>Campaign</dt><dd className="account-idline">{delivery.campaignId}</dd></div>
                  <div><dt>Saved campaign version</dt><dd className="account-idline">{delivery.campaignVersionId}</dd></div>
                  <div><dt>AI app</dt><dd className="account-idline">{delivery.appId}</dd></div>
                </dl>
              </details> },
            ]} />}
        </section>
      </div>}
    </section>
  </Ld.Panel>;
}
