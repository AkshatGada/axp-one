'use client';
import { useEffect, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { AppIntegration as Integration } from './types';

export function AppIntegration({client, organizationId, appId, busy, ready, onUnauthorized}: {
  client: AccountsClient; organizationId: string; appId: string; busy: boolean; ready: boolean; onUnauthorized: () => void;
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
  return <section className="ld-stack" aria-label="App integration readiness">
    <h3 className="ld-body">App integration readiness</h3>
    <p className="ld-secondary">Read-only account check. No SDK secret is sent by this browser; no ad, model call or payment is requested. A ready check does not guarantee a qualifying bid.</p>
    <Ld.Button variant="secondary" disabled={busy || loading || !ready} onClick={() => refresh(value => value + 1)}>Check integration readiness</Ld.Button>
    {loading && <p role="status">Checking this app…</p>}
    {!ready && <p>Account serving is not connected.</p>}
    {error && <p className="account-error" role="alert">{error}</p>}
    {state && <>
      <p role="status">{state.ready ? 'Ready for an SDK opportunity' : 'Setup needs attention'} · {state.financialMode} · {state.execution}</p>
      <dl className="account-readiness">
        {Object.entries(state.gates).map(([name, passed]) => <div key={name}><dt>{name}</dt><dd>{state.financialMode === 'synthetic' && ['funding','broadcasts'].includes(name) ? 'Not required · synthetic' : passed ? 'Ready' : 'Required'}</dd></div>)}
        <div><dt>Active server credentials</dt><dd>{state.activeCredentialCount}</dd></div>
        <div><dt>Native broadcasts</dt><dd>{state.broadcastEnabled ? 'Enabled' : 'Disabled'}</dd></div>
      </dl>
      <p className="ld-secondary">Endpoint: {state.apiBasePath}. Install the key privately on your backend; this check cannot confirm your external server has installed it. {state.financialMode === 'synthetic' ? 'Synthetic receipts are not paid earnings.' : 'Accepted accrual is not finalized payout.'}</p>
    </>}
  </section>;
}
