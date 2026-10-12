'use client';
import { useEffect, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { AppIntegration as Integration } from './types';
import { executionLabel, gateLabel, modeName } from './format';

export function AppIntegration({client, organizationId, appId, busy, ready, onUnauthorized, onReadyKnown}: {
  client: AccountsClient; organizationId: string; appId: string; busy: boolean; ready: boolean; onUnauthorized: () => void;
  onReadyKnown?: (ready: boolean | null) => void;
}) {
  const [state, setState] = useState<Integration | null>(null), [error, setError] = useState('');
  const [revision, refresh] = useState(0), [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true; setState(null); setError(''); setLoading(ready);
    if (ready) void client.appIntegration(organizationId, appId).then(value => { if (active) setState(value); }).catch(failure => {
      if (!active) return;
      setError(failure instanceof AccountApiError ? failure.message : 'Integration readiness unavailable. Reload to check again.');
      if (failure instanceof AccountApiError && failure.status === 401) onUnauthorized();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, organizationId, appId, ready, revision, onUnauthorized]);
  useEffect(() => { onReadyKnown?.(state ? state.ready : null); }, [state, onReadyKnown]);
  const simulated = state?.financialMode === 'synthetic';
  const blockers = state ? Object.entries(state.gates).filter(([, passed]) => !passed) : [];
  return <Ld.Panel id="app-readiness" title="Is your app ready?" sub="Checks your saved setup. It requests no ad."
    actions={<>
      {state && <span className="ld-tag" data-tone={state.ready ? 'success' : 'warning'} role="status">{state.ready ? 'Ready to request ads' : 'Not ready yet'}</span>}
      {!ready && <span className="ld-tag" data-tone="outline">Not available yet</span>}
      <Ld.Button variant="secondary" size="sm" disabled={busy || loading || !ready} onClick={() => refresh(value => value + 1)}>Check again</Ld.Button>
    </>}>
    <section className="ld-stack" aria-label="App integration readiness">
      {loading && <p className="ld-secondary" role="status">Checking your app…</p>}
      {!ready && <Ld.Notice tone="blocked" title="Ads are not available for your app yet.">Your key and rules are saved. Requests are never sent to the shared example chat instead.</Ld.Notice>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {state && <>
        {state.ready && <p className="ld-body">Everything on our side is set. Send a request from your server to see your first delivery.</p>}
        {blockers.length > 0 && <dl className="account-readiness" aria-label="Setup to complete">
          {blockers.map(([name]) => <div key={name}><dt>{gateLabel[name] ?? name}</dt><dd><span className="ld-tag" data-tone="warning">Needs attention</span></dd></div>)}
        </dl>}
        <p className="ld-secondary">{simulated ? 'Earnings are a test balance. No real money.' : 'An accepted charge is not a finalized payout.'} This cannot see whether your own server has the key installed.</p>
        <details className="account-more"><summary>All checks</summary>
        <dl className="account-readiness">
          {Object.entries(state.gates).map(([name, passed]) => {
            const skipped = simulated && ['funding', 'broadcasts'].includes(name);
            return <div key={name}><dt>{gateLabel[name] ?? name}</dt><dd>
              <span className="ld-tag" data-tone={skipped ? 'outline' : passed ? 'success' : 'warning'}>{skipped ? 'Not needed for test balances' : passed ? 'Ready' : 'Needs attention'}</span>
            </dd></div>;
          })}
          <div><dt>Active API keys</dt><dd>{state.activeCredentialCount}</dd></div>
          <div><dt>Balance type</dt><dd>{modeName(state.financialMode)}</dd></div>
          <div><dt>Bidding decisions</dt><dd>{executionLabel(state.execution)}</dd></div>
        </dl>
        <p className="ld-secondary">A ready result does not guarantee that a campaign will bid on a given question.</p>
        </details>
      </>}
    </section>
  </Ld.Panel>;
}
