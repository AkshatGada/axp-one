'use client';

import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { RunAction } from './AccountForms';
import type { AccountActivity, AccountReport, AccountReportDelivery, AccountReportSummary, Campaign, CampaignEnrollment } from './types';
import { amountUnit, deliveryLabel, dispositionLabel, executionLabel, formatUnits, formatWhen, networkName } from './format';

function safeError(failure: unknown) {
  return failure instanceof AccountApiError ? failure.message : 'The account request could not be completed. Reload before continuing.';
}

export function CampaignServing({ client, organizationId, campaign, ready, busy, dirty, run, onUnauthorized, onConflict, financialMode = 'synthetic', onEnabledKnown }: {
  client: AccountsClient; organizationId: string; campaign: Campaign; ready: boolean; busy: boolean; dirty: boolean;
  run: RunAction; onUnauthorized: () => void; onConflict: () => void; financialMode?: 'synthetic' | 'devnet';
  onEnabledKnown?: (campaignId: string, enabled: boolean) => void;
}) {
  const native = financialMode === 'devnet', label = native ? 'matching' : 'your campaign';
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
    await run(nextEnabled ? 'Turning on' : 'Pausing', async () => {
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
    }, nextEnabled ? `Version ${campaign.version} is on. Nothing was paid or funded.` : 'Paused. It will not be matched to new conversations. Placements already accepted are unchanged.');
  }
  const stale = Boolean(enrollment?.enabled && !enabled);
  const state = loading ? 'Checking' : !known ? 'Unknown' : enabled ? 'Live' : stale ? 'Needs approval again' : enrollment ? 'Paused' : 'Off';
  return <>
    <Ld.Panel id="campaign-serving" title="Go live"
      sub={native ? 'Solana Devnet · test USDC · no real money' : 'Test balance · no real money'}
      actions={ready ? <span className="ld-tag" data-tone={enabled ? 'success' : stale ? 'warning' : 'outline'} role="status">{state}</span> : <span className="ld-tag" data-tone="outline">Not available yet</span>}>
      <section className="ld-stack" aria-label="Campaign serving">
        <p className="ld-body">{native
          ? 'Turning this on lets the approved version be matched. It can bid once it also has a confirmed deposit under Wallet.'
          : 'Turning this on lets the approved version compete for placements in AI apps. Accepted placements add test charges only. No real money moves.'}</p>
        {!ready ? <Ld.Notice tone="blocked" title="Going live is not available yet.">Your approved campaign is saved. Nothing is shown until this is available.</Ld.Notice> : <>
          {enrollment && <p className="ld-secondary">{enabled ? `Version ${campaign.version} is on.` : stale ? `Version ${enrollment.version} was on. Approve the current version and turn it on again.` : `Version ${enrollment.version} is paused.`} Last changed {formatWhen(enrollment.updatedAt)}.</p>}
          {error && <p className="account-error" role="alert">{error}</p>}
          {dirty && <p className="ld-secondary">Save and approve your edits first.</p>}
          {campaign.status !== 'approved' && <p className="ld-secondary">Approve this version first. Only an approved version can be turned on.</p>}
          <div className="ld-row">
            <Ld.Button variant={campaign.status === 'approved' && !enabled ? 'primary' : 'secondary'} disabled={busy || loading || !known || dirty || campaign.status !== 'approved' || enabled}
              onClick={() => void changeServing(true)}>{enabled ? `Version ${campaign.version} is on` : `Turn on version ${campaign.version}`}</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy || loading || !known || dirty || !enrollment?.enabled}
              onClick={() => void changeServing(false)}>Pause</Ld.Button>
            <Ld.Button variant="ghost" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh status</Ld.Button>
          </div>
          <p className="ld-secondary">Pausing stops new matching only. Placements already accepted stay as they are.</p>
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
  const active = rows.filter(row => row.summary.deliveryCount > 0 || row.summary.acceptedBaseUnits !== '0' || row.summary.reservedBaseUnits !== '0');
  const shown = active.length ? active : rows.slice(0, 1);
  const balance = mode === 'devnet' ? 'Test tokens · no real money' : 'Test balance · no real money';
  return <Ld.Panel id={campaign ? 'campaign-activity' : 'app-report'} title={campaign ? 'Results' : 'Deliveries and earnings'}
    sub={report ? balance : undefined} flush={Boolean(report)}
    actions={ready ? <Ld.Button variant="secondary" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh</Ld.Button> : undefined}>
    <section aria-label={`Private ${kind} report`}>
      {!ready && <Ld.Empty title="Results are not available yet">{campaign ? 'They appear here once your campaign can go live.' : 'They appear here once your app can request ads.'}</Ld.Empty>}
      {ready && loading && <Ld.Skeleton rows={2} label="Loading results" />}
      {ready && error && <div className="account-table-note"><p className="account-error" role="alert">{error}</p></div>}
      {report && <div className="account-report">
        {shown.map(row => <Ld.StatStrip key={row.network} label={`Totals on ${networkName(row.network)}`} items={[
          { label: campaign ? 'Accepted placements' : 'Accepted deliveries', value: row.summary.deliveryCount, note: networkName(row.network) },
          { label: money, value: formatUnits(row.summary.acceptedBaseUnits), unit: amountUnit(report.financialMode, row.network), note: report.financialMode === 'synthetic' ? 'No real money' : 'Not yet paid out' },
          { label: 'Held', value: formatUnits(row.summary.reservedBaseUnits), unit: amountUnit(report.financialMode, row.network), note: 'Placements in progress' },
        ]} />)}
        <div className="account-report-note">
          <p className="ld-secondary">{report.financialMode === 'synthetic' ? 'Simulated totals. No payment has taken place.' : 'Accepted charges, not finalized payouts. See Wallet for payments.'}</p>
          <details className="account-more-inline"><summary>How totals and receipts work</summary>
            <p className="ld-secondary">{money} is the total of accepted receipts. Held is budget kept for placements still in progress. Neither is a payment{report.financialMode === 'devnet' ? ': see Wallet for what was authorized, paid and refunded' : ''}. Each currency is totalled separately.</p>
            <p className="ld-secondary">A receipt shows that a Sponsored card was shown with its label. It does not show attention, clicks or sales.</p>
          </details>
        </div>
        <section className="account-report-section" aria-label="Receipts">
          <div className="account-report-head">
            <h4 className="account-part-title">Receipts</h4>
            <span className="ld-secondary">{report.deliveries.length ? `Latest ${report.deliveries.length}` : ''}</span>
          </div>
          {!report.deliveries.length ? <div className="account-table-note"><Ld.Empty title="No receipts yet">{campaign ? 'A receipt appears when an AI app confirms your Sponsored card was shown below its answer.' : 'A receipt appears when your app confirms a Sponsored card was shown below its answer.'}</Ld.Empty></div>
            : <Ld.Table<AccountReportDelivery> caption="Receipts" rows={report.deliveries} columns={[
              { key: 'when', head: 'Accepted', cell: delivery => formatWhen(delivery.acceptedAt) },
              { key: 'amount', head: campaign ? 'Charge' : 'Earning', num: true, cell: delivery => `${formatUnits(delivery.amountBaseUnits)} ${amountUnit(report.financialMode, delivery.settlementNetwork)}` },
              { key: 'state', head: 'Status', cell: () => <span className="ld-tag" data-tone="outline">{report.financialMode === 'devnet' ? 'Accepted, not paid out' : 'Test balance, no payment'}</span> },
              { key: 'more', head: <span className="ld-sr">Record</span>, cell: delivery => <details className="account-more-inline">
                <summary>Details</summary>
                <dl className="account-readiness account-break">
                  <div><dt>Network</dt><dd>{networkName(delivery.settlementNetwork)}</dd></div>
                  <div><dt>Receipt hash</dt><dd className="account-idline">{delivery.receiptHash}</dd></div>
                  <div><dt>Award</dt><dd className="account-idline">{delivery.awardId}</dd></div>
                  <div><dt>Opportunity</dt><dd className="account-idline">{delivery.opportunityId}</dd></div>
                  <div><dt>Campaign</dt><dd className="account-idline">{delivery.campaignId}</dd></div>
                  <div><dt>Saved campaign version</dt><dd className="account-idline">{delivery.campaignVersionId}</dd></div>
                  <div><dt>AI app</dt><dd className="account-idline">{delivery.appId}</dd></div>
                </dl>
              </details> },
            ]} />}
          {report.deliveries.length >= 100 && <p className="ld-secondary account-table-note">Showing the latest 100. The totals above cover every delivery.</p>}
        </section>
        {report.activity && <section className="account-report-section" aria-label="Saved opportunity activity">
          <div className="account-report-head">
            <h4 className="account-part-title">{campaign ? 'Conversations considered' : 'Ad requests'}</h4>
            <span className="ld-secondary">{report.activity.length ? `Showing ${report.activity.length} of ${report.activityTotal}` : ''}</span>
          </div>
          {!report.activity.length ? <div className="account-table-note"><Ld.Empty title="Nothing yet">{campaign ? 'Each time this campaign is considered for a conversation, it appears here.' : 'Each time your app requests an ad, it appears here.'}</Ld.Empty></div>
            : <Ld.Table<AccountActivity> caption={campaign ? 'Conversations considered' : 'Ad requests'} rows={report.activity} columns={[
              { key: 'outcome', head: 'Outcome', cell: entry => <span className="ld-tag" data-tone={entry.disposition === 'won' ? 'success' : 'outline'}>{dispositionLabel[entry.disposition]}</span> },
              { key: 'delivery', head: 'Delivery', cell: entry => deliveryLabel[entry.deliveryStatus] },
              { key: 'bid', head: 'Bid', num: true, cell: entry => entry.bidBaseUnits === null ? 'No bid' : `${formatUnits(entry.bidBaseUnits)} ${amountUnit(report.financialMode, entry.settlementNetwork)}` },
              { key: 'more', head: <span className="ld-sr">Record</span>, cell: entry => <details className="account-more-inline">
                <summary>Details</summary>
                <dl className="account-readiness account-break">
                  <div><dt>Decision</dt><dd>{entry.decision.replaceAll('_', ' ')} ({executionLabel(entry.execution).toLowerCase()})</dd></div>
                  <div><dt>Reason codes</dt><dd>{entry.reasonCodes.join(', ') || 'None recorded'}</dd></div>
                  <div><dt>Network</dt><dd>{networkName(entry.settlementNetwork)}</dd></div>
                  <div><dt>Opportunity</dt><dd className="account-idline">{entry.opportunityId}</dd></div>
                  {entry.campaignVersionId && <div><dt>Saved version</dt><dd className="account-idline">{entry.campaignVersionId}</dd></div>}
                  {entry.awardId && <div><dt>Award</dt><dd className="account-idline">{entry.awardId}</dd></div>}
                </dl>
              </details> },
            ]} />}
          <p className="ld-secondary account-table-note">Questions and private campaign details are never shown here. "Not eligible" comes from a rule, not from a judgment about fit.</p>
        </section>}
      </div>}
    </section>
  </Ld.Panel>;
}
