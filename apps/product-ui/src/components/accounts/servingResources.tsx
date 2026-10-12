'use client';

import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { RunAction } from './AccountForms';
import type { AccountReport, Campaign, CampaignEnrollment } from './types';

function safeError(failure: unknown) {
  return failure instanceof AccountApiError ? failure.message : 'The account request could not be completed. Reload before continuing.';
}

export function CampaignServing({ client, organizationId, campaign, ready, busy, dirty, run, onUnauthorized, onConflict, financialMode = 'synthetic' }: {
  client: AccountsClient; organizationId: string; campaign: Campaign; ready: boolean; busy: boolean; dirty: boolean;
  run: RunAction; onUnauthorized: () => void; onConflict: () => void; financialMode?: 'synthetic' | 'devnet';
}) {
  const native = financialMode === 'devnet', label = native ? 'catalogue' : 'synthetic serving';
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
    await run(nextEnabled ? `Enabling ${label}` : `Pausing ${label}`, async () => {
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
    }, nextEnabled ? `Saved version ${campaign.version} opted into ${label}. No funding or native payment was authorized.` : 'New matching paused. Existing awards and receipts remain unchanged.');
  }
  return <section className="ld-stack-lg" aria-label="Campaign synthetic serving">
    <h3 className="ld-body">Shared account serving · {native ? 'Devnet catalogue eligibility' : 'synthetic'}</h3>
    <p className="ld-secondary">{native ? 'Catalogue opt-in is only an eligibility declaration. This version also needs a finalized deposit and separate channel activation under Own-wallet funding before it can bid.' : 'Explicit opt-in uses the reviewed saved version. Accepted receipts accrue synthetic base-unit charges only; no deposit, voucher authorization, payout or refund is connected.'} Pausing stops new matching, not existing awards or receipts.</p>
    {!ready ? <p className="ld-body">Account serving is unavailable on this server. Approval is not enrollment.</p> : <>
      <p className="ld-body" role="status">{loading ? 'Checking enrollment…' : !known ? 'Enrollment not verified' : enabled ? `Version ${campaign.version} enabled · ${native ? 'catalogue only' : 'synthetic'}` : enrollment?.enabled ? 'Stale enrollment · current saved version is not eligible' : enrollment ? `Paused · ${label}` : `Not enrolled · ${label}`}</p>
      {enrollment && <p className="ld-secondary">Enrollment version {enrollment.version} · updated {new Date(enrollment.updatedAt).toISOString()}</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {dirty && <p className="ld-secondary">Save and review your changes before changing serving.</p>}
      <div className="ld-row">
        <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload enrollment</Ld.Button>
        <Ld.Button disabled={busy || loading || !known || dirty || campaign.status !== 'approved' || enabled}
          onClick={() => void changeServing(true)}>Enable {label} · version {campaign.version}</Ld.Button>
        <Ld.Button variant="secondary" disabled={busy || loading || !known || dirty || !enrollment?.enabled}
          onClick={() => void changeServing(false)}>Pause {label} · version {campaign.version}</Ld.Button>
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
    <h3 className="ld-body">Private {kind} report · {report?.financialMode ?? 'mode not verified'}</h3>
    <p className="ld-secondary">{report?.financialMode === 'devnet' ? 'Accepted is receipt-linked accrual and reserved is outstanding budget. Neither means a payout has finalized; inspect channel authorization and settlement separately.' : 'Accepted is synthetic receipt accrual, reserved is outstanding synthetic budget, neither is a native payment.'} Receipts assert insertion and Sponsored disclosure, not attention or conversion.</p>
    {!ready ? <p className="ld-secondary">Reports are unavailable until shared account serving is ready.</p> : <>
      <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload {kind} report</Ld.Button>
      {loading && <p className="ld-secondary" role="status">Loading private report…</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {report && <>
        <p className="ld-body">Accepted deliveries and {report.financialMode} amounts by settlement network. Never combine currencies.</p>
        {Object.entries(report.bySettlementNetwork).map(([network, summary]) => <div className="ld-stack" key={network}>
          <p className="ld-body">{network} · {report.financialMode} base units</p>
          <dl className="account-readiness">
            <div><dt>Accepted {report.financialMode} base units</dt><dd>{summary.acceptedBaseUnits}</dd></div>
            <div><dt>Reserved {report.financialMode} base units</dt><dd>{summary.reservedBaseUnits}</dd></div>
            <div><dt>Accepted deliveries</dt><dd>{summary.deliveryCount}</dd></div>
          </dl>
        </div>)}
        {report.activity && <section className="ld-stack" aria-label="Saved opportunity activity">
          <h4 className="ld-body">Saved opportunity activity</h4>
          <p className="ld-secondary">Showing {report.activity.length} of {report.activityTotal} saved entries. No question text or private targeting inputs are included. A policy exclusion is not a model skip; unavailable is not a negative fit judgment.</p>
          {!report.activity.length && <p>No saved activity yet.</p>}
          {report.activity.map((entry, index) => <details key={`${entry.opportunityId}:${entry.campaignId}:${index}`}>
            <summary>{entry.disposition.replaceAll('_', ' ')} · {entry.deliveryStatus.replaceAll('_', ' ')} · {entry.execution ?? 'No model decision reported'}</summary>
            <dl className="account-readiness account-break">
              <div><dt>Opportunity</dt><dd>{entry.opportunityId}</dd></div>
              <div><dt>Decision</dt><dd>{entry.decision.replaceAll('_', ' ')}</dd></div>
              <div><dt>Reason codes</dt><dd>{entry.reasonCodes.join(', ') || 'None recorded'}</dd></div>
              <div><dt>Bid · {entry.settlementNetwork} base units</dt><dd>{entry.bidBaseUnits ?? 'No bid'}</dd></div>
              {entry.campaignVersionId && <div><dt>Saved version</dt><dd>{entry.campaignVersionId}</dd></div>}
              {entry.awardId && <div><dt>Award</dt><dd>{entry.awardId}</dd></div>}
            </dl>
          </details>)}
        </section>}
        <p className="ld-secondary">Showing {report.deliveries.length} receipt records (at most 100). Summary totals may cover more deliveries than this bounded list.</p>
        {!report.deliveries.length && <p className="ld-secondary">No accepted deliveries in this report window. Outstanding reservations, if any, are shown separately above.</p>}
        {report.deliveries.map(delivery => <details key={delivery.awardId}>
          <summary>{delivery.settlementNetwork} · {delivery.amountBaseUnits} {report.financialMode} base units · {new Date(delivery.acceptedAt).toISOString()}</summary>
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
