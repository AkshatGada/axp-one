'use client';

import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { RunAction } from './AccountForms';
import type { AccountReport, Campaign, CampaignEnrollment } from './types';

function safeError(failure: unknown) {
  return failure instanceof AccountApiError ? failure.message : 'The account request could not be completed. Reload before continuing.';
}

export function CampaignServing({ client, organizationId, campaign, ready, busy, dirty, run, onUnauthorized, onConflict }: {
  client: AccountsClient; organizationId: string; campaign: Campaign; ready: boolean; busy: boolean; dirty: boolean;
  run: RunAction; onUnauthorized: () => void; onConflict: () => void;
}) {
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
  async function changeServing(nextEnabled: boolean) {
    await run(nextEnabled ? 'Enabling synthetic serving' : 'Pausing synthetic serving', async () => {
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
    }, nextEnabled ? `Saved version ${campaign.version} opted into synthetic serving. No funding or native payment was authorized.` : 'Synthetic serving paused for new matching. Existing awards and receipts remain unchanged.');
  }
  return <section className="ld-stack-lg" aria-label="Campaign synthetic serving">
    <h3 className="ld-body">Shared account serving · synthetic</h3>
    <p className="ld-secondary">Explicit opt-in uses the reviewed saved version. Accepted receipts accrue synthetic base-unit charges only; no deposit, voucher authorization, payout or refund is connected. Pausing stops new matching, not existing awards or receipts.</p>
    {!ready ? <p className="ld-body">Synthetic serving is unavailable on this server. Approval is not enrollment.</p> : <>
      <p className="ld-body" role="status">{loading ? 'Checking enrollment…' : !known ? 'Enrollment not verified' : enabled ? `Version ${campaign.version} enabled · synthetic` : enrollment?.enabled ? 'Stale enrollment · current saved version is not eligible' : enrollment ? 'Paused · synthetic' : 'Not enrolled · synthetic'}</p>
      {enrollment && <p className="ld-secondary">Enrollment version {enrollment.version} · updated {new Date(enrollment.updatedAt).toISOString()}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {dirty && <p className="ld-secondary">Save and review your changes before changing serving.</p>}
      <div className="ld-row">
        <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload enrollment</Ld.Button>
        <Ld.Button disabled={busy || loading || !known || dirty || campaign.status !== 'approved' || enabled}
          onClick={() => void changeServing(true)}>Enable synthetic serving · version {campaign.version}</Ld.Button>
        <Ld.Button variant="secondary" disabled={busy || loading || !known || dirty || !enrollment?.enabled}
          onClick={() => void changeServing(false)}>Pause synthetic serving · version {campaign.version}</Ld.Button>
      </div>
      {campaign.status !== 'approved' && <p className="ld-secondary">Approve the exact saved version before enabling it.</p>}
    </>}
    <OwnerReport key={`report:${revision}`} client={client} organizationId={organizationId} resourceId={campaign.id}
      kind="campaign" ready={ready} busy={busy} onUnauthorized={onUnauthorized} />
  </section>;
}

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
  return <section className="ld-stack" aria-label={`Private ${kind} report`}>
    <h3 className="ld-body">Private {kind} report · synthetic</h3>
    <p className="ld-secondary">Accepted is synthetic receipt accrual, reserved is outstanding synthetic budget, neither is a native payment. Receipts assert insertion and Sponsored disclosure, not attention or conversion.</p>
    {!ready ? <p className="ld-secondary">Reports are unavailable until shared account serving is ready.</p> : <>
      <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload {kind} report</Ld.Button>
      {loading && <p className="ld-secondary" role="status">Loading private report…</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {report && <>
        <p className="ld-body">Accepted deliveries and synthetic amounts by settlement network. Never combine currencies.</p>
        {Object.entries(report.bySettlementNetwork).map(([network, summary]) => <div className="ld-stack" key={network}>
          <p className="ld-body">{network} · synthetic base units</p>
          <dl className="account-readiness">
            <div><dt>Accepted synthetic base units</dt><dd>{summary.acceptedBaseUnits}</dd></div>
            <div><dt>Reserved synthetic base units</dt><dd>{summary.reservedBaseUnits}</dd></div>
            <div><dt>Accepted deliveries</dt><dd>{summary.deliveryCount}</dd></div>
          </dl>
        </div>)}
        <p className="ld-secondary">Showing {report.deliveries.length} receipt records (at most 100). Summary totals may cover more deliveries than this bounded list.</p>
        {!report.deliveries.length && <p className="ld-secondary">No accepted deliveries in this report window. Outstanding reservations, if any, are shown separately above.</p>}
        {report.deliveries.map(delivery => <details key={delivery.awardId}>
          <summary>{delivery.settlementNetwork} · {delivery.amountBaseUnits} synthetic base units · {new Date(delivery.acceptedAt).toISOString()}</summary>
          <dl className="account-readiness account-break">
            <div><dt>Award</dt><dd>{delivery.awardId}</dd></div>
            <div><dt>Opportunity</dt><dd>{delivery.opportunityId}</dd></div>
            <div><dt>Campaign</dt><dd>{delivery.campaignId}</dd></div>
            <div><dt>Saved campaign version</dt><dd>{delivery.campaignVersionId}</dd></div>
            <div><dt>AI app</dt><dd>{delivery.appId}</dd></div>
            <div><dt>Receipt hash</dt><dd>{delivery.receiptHash}</dd></div>
          </dl>
        </details>)}
      </>}
    </>}
  </section>;
}
