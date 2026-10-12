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
  return <Ld.Panel id="app-readiness" title="Integration readiness" sub="A read-only check of this app's setup"
    actions={<>
      {state && <span className="ld-tag" data-tone={state.ready ? 'success' : 'warning'} role="status">{state.ready ? 'Ready for an ad request' : 'Setup needs attention'}</span>}
      {!ready && <span className="ld-tag" data-tone="outline">Unavailable</span>}
      <Ld.Button variant="secondary" size="sm" disabled={busy || loading || !ready} onClick={() => refresh(value => value + 1)}>Check again</Ld.Button>
    </>}>
    <section className="ld-stack" aria-label="App integration readiness">
      {loading && <p className="ld-secondary" role="status">Checking this app…</p>}
      {!ready && <Ld.Callout tone="warning" title="Ad serving is not connected on this server">Your key and rules are saved, but no ad can be requested from here yet. Requests are never routed to the shared demonstration instead.</Ld.Callout>}
      {error && <p className="account-error" role="alert">{error}</p>}
      {state && <>
        <dl className="account-readiness">
          {Object.entries(state.gates).map(([name, passed]) => {
            const skipped = simulated && ['funding', 'broadcasts'].includes(name);
            return <div key={name}><dt>{gateLabel[name] ?? name}</dt><dd>
              <span className="ld-tag" data-tone={skipped ? 'outline' : passed ? 'success' : 'warning'}>{skipped ? 'Not needed with simulated accounting' : passed ? 'Ready' : 'Needs attention'}</span>
            </dd></div>;
          })}
          <div><dt>Active server keys</dt><dd>{state.activeCredentialCount}</dd></div>
          <div><dt>Accounting on this server</dt><dd>{modeName(state.financialMode)}</dd></div>
          <div><dt>Bidding decisions</dt><dd>{executionLabel(state.execution)}</dd></div>
          <div><dt>Server broadcast gate</dt><dd>{state.broadcastEnabled ? 'Enabled' : 'Disabled'}</dd></div>
        </dl>
        <p className="ld-secondary">This check reads your saved setup only. It sends no key from this browser, requests no ad and makes no model call or payment. It cannot see whether your own server has installed the key, and a ready result does not guarantee that a campaign will bid. {simulated ? 'Simulated receipts are not paid earnings.' : 'An accepted charge is not a finalized payout.'}</p>
      </>}
    </section>
  </Ld.Panel>;
}
