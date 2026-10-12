'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import { AccountForm, Input, Textarea, type RunAction } from './AccountForms';
import { accountSDKExample, campaignCapabilities, campaignFormInput, credentialStatus } from './resourceForms';
import type { AIApp, AppCredential, Campaign, CampaignInput, IssuedAppCredential } from './types';

function safeError(error: unknown) {
  return error instanceof AccountApiError ? error.message : 'The resource request could not be completed. Refresh and try again.';
}

export function CampaignForm({ campaign, busy, run, save, approve }: {
  campaign?: Campaign; busy: boolean; run: RunAction;
  save: (input: CampaignInput) => Promise<void>; approve: () => Promise<void>;
}) {
  const [dirty, setDirty] = useState(false);
  const networkId = useId();
  const input = campaign?.input;
  return <div className="ld-stack-lg">
    {campaign && <div className="ld-stack">
      <p className="ld-body">Saved version {campaign.version} · {campaign.status} · Serving: not connected</p>
      <p className="ld-secondary account-break">Campaign ID: {campaign.id}</p>
      {campaign.approvedContentHash && <p className="ld-secondary account-break">Approved saved-content hash: {campaign.approvedContentHash}</p>}
      <p className="ld-secondary">{campaign.status === 'approved' ? 'This exact saved version is approved. Every edit increments its version and clears approval.' : 'Review the saved text below. Approval applies only to the current saved version; it does not launch or fund a campaign.'}</p>
    </div>}
    <div onChange={() => setDirty(true)}>
      <AccountForm label={campaign ? 'Edit owned campaign' : 'Create owned campaign'} busy={busy}
        submit={campaign ? 'Save new draft version' : 'Create draft'}
        hint="Amounts are configuration caps, not deposits or spending authority. No funding or launch occurs."
        onSubmit={data => run('Saving campaign draft', () => save(campaignFormInput(data)), 'Draft saved. Approval is required for the exact saved content; serving remains disconnected.')}>
        <Input label="Campaign name" name="name" value={input?.name} maxLength={120} />
        <Textarea label="Product description" name="productDescription" value={input?.productDescription} maxLength={1200} hint="Required, single paragraph. Up to 1,200 characters." />
        <Textarea label="Sponsored text for approval" name="approvedText" value={input?.approvedText} maxLength={800} hint="Required, plain text, single paragraph. Up to 800 characters. This is separate from an independent answer." />
        <Textarea label="Context hints" name="contextHints" value={input?.contextHints.join('\n')} maxLength={2405} hint="Up to six distinct hints, one per line, 400 characters each. Combined description, text and hints: at most 2,400 UTF-16 characters." />
        <fieldset className="account-fields">
          <legend className="ld-field-l">Declared product capabilities (up to 12)</legend>
          {campaignCapabilities.map(capability => <label className="ld-secondary" key={capability}>
            <input type="checkbox" name="declaredCapabilities" value={capability} defaultChecked={input?.declaredCapabilities.includes(capability)} />{' '}{capability.replaceAll('_', ' ')}
          </label>)}
        </fieldset>
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={networkId}>Test settlement network</label>
          <select className="ld-select" id={networkId} name="settlementNetwork" defaultValue={input?.settlementNetwork ?? 'solana-devnet'}>
            <option value="solana-devnet">Solana Devnet · test USDC</option>
            <option value="tempo-testnet">Tempo Testnet · test PathUSD</option>
          </select>
          <span className="ld-field-h">Six-decimal base units; never combine currencies. Selecting a network does not fund it.</span>
        </div>
        <Input label="Maximum bid (integer base units)" name="maxBidBaseUnits" value={input?.maxBidBaseUnits ?? '3000'} maxLength={6} hint="1–4,000; no decimals or exponent notation." />
        <Input label="Budget cap (integer base units)" name="budgetCapBaseUnits" value={input?.budgetCapBaseUnits ?? '100000'} maxLength={6} hint="1–100,000, at least the maximum bid. This is not a funded balance." />
      </AccountForm>
    </div>
    {campaign && <div className="ld-stack">
      {dirty && <p className="ld-secondary">Unsaved changes: save a new draft version before approving.</p>}
      <Ld.Button variant="secondary" disabled={busy || dirty || campaign.status === 'approved'}
        onClick={() => void run('Approving saved campaign content', approve, 'Saved campaign version approved. No serving or funding was enabled.')}>
        {campaign.status === 'approved' ? `Version ${campaign.version} approved` : `Approve saved version ${campaign.version}`}
      </Ld.Button>
    </div>}
  </div>;
}

export function CampaignResources({ client, organizationId, advertiserReady, busy, run, onUnauthorized }: {
  client: AccountsClient; organizationId: string; advertiserReady: boolean; busy: boolean; run: RunAction; onUnauthorized: () => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const selectId = useId();
  const alive = useResourceAlive();
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setCampaigns(null);
    void client.campaigns(organizationId).then(result => {
      if (active) setCampaigns(result.campaigns);
    }).catch(failure => {
      if (!active) return;
      setError(safeError(failure));
      if (failure instanceof AccountApiError && failure.status === 401) onUnauthorized();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, organizationId, revision, onUnauthorized]);
  const selected = campaigns?.find(campaign => campaign.id === selectedId);
  function upsert(campaign: Campaign) {
    if (!alive.current) return;
    setCampaigns(current => current ? current.some(item => item.id === campaign.id) ? current.map(item => item.id === campaign.id ? campaign : item) : [...current, campaign] : [campaign]);
    setSelectedId(campaign.id);
  }
  return <Ld.Panel id="owned-campaigns" title="Owned campaign drafts" sub="Private to this organization. Approval is not activation.">
    <div className="ld-stack-lg">
      {!advertiserReady && <p className="ld-body">Create an advertiser profile above before creating a campaign. The server binds each campaign to this organization’s advertiser.</p>}
      {loading && <p className="ld-secondary" role="status">Loading owned campaigns…</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload campaign list</Ld.Button>
      {campaigns && <>
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={selectId}>Owned campaigns ({campaigns.length})</label>
          <select className="ld-select" id={selectId} value={selectedId} disabled={busy} onChange={event => setSelectedId(event.target.value)}>
            <option value="">Create a new draft</option>
            {campaigns.map(campaign => <option key={campaign.id} value={campaign.id}>{campaign.input.name} · v{campaign.version} · {campaign.status}</option>)}
          </select>
          {!campaigns.length && <span className="ld-field-h">No saved campaigns in this organization.</span>}
        </div>
        <CampaignForm key={`${selected?.id ?? 'new'}:${selected?.version ?? 0}:${selected?.status ?? ''}`} campaign={selected}
          busy={busy || !advertiserReady} run={run}
          save={async input => upsert((await client.saveCampaign(organizationId, input, selected?.id)).campaign)}
          approve={async () => {
            if (!selected) return;
            try {
              // The server atomically compares the reviewed version before approving.
              upsert((await client.approveCampaign(organizationId, selected.id, selected.version)).campaign);
            } catch (failure) {
              if (alive.current && failure instanceof AccountApiError && failure.status === 409 && failure.code === 'campaign_version_conflict') {
                // Refresh for review only; never automatically approve the new version.
                setRevision(value => value + 1);
              }
              throw failure;
            }
          }} />
      </>}
    </div>
  </Ld.Panel>;
}

// Prevent local resource updates after logout/org switch/unmount.
function useResourceAlive() {
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return alive;
}

export function AppCredentials({ client, organizationId, app, busy, run, issue, rawKey, dismissKey, onUnauthorized }: {
  client: AccountsClient; organizationId: string; app: AIApp; busy: boolean; run: RunAction;
  issue: (action: () => Promise<IssuedAppCredential>) => Promise<AppCredential | null>;
  rawKey: string | null; dismissKey: () => void; onUnauthorized: () => void;
}) {
  const [credentials, setCredentials] = useState<AppCredential[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [example, setExample] = useState('');
  const alive = useResourceAlive();
  useEffect(() => { setExample(accountSDKExample(window.location.origin)); }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(''); setCredentials(null);
    void client.appCredentials(organizationId, app.id).then(result => {
      if (active) setCredentials(result.credentials);
    }).catch(failure => {
      if (!active) return;
      setError(safeError(failure));
      if (failure instanceof AccountApiError && failure.status === 401) onUnauthorized();
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [client, organizationId, app.id, revision, onUnauthorized]);
  function upsert(credential: AppCredential) {
    if (!alive.current) return;
    setCredentials(current => current ? [...current.filter(item => item.id !== credential.id), credential] : [credential]);
  }
  const activeCount = credentials?.filter(credential => credentialStatus(credential) === 'Active').length ?? 0;
  return <Ld.Panel id="app-credentials" title="Server-side SDK credentials" sub={app.name}>
    <div className="ld-stack-lg">
      <p className="ld-body">Configuration metadata ready when a valid key is installed on your server. Serving: not connected. Financial mode: unfunded. No native funding or payout routing is enabled.</p>
      <p className="ld-secondary account-break">Publisher identity: app:{app.id}. Configuration uses this app’s saved allowed origins and prohibited categories; a key cannot select a different publisher.</p>
      <p className="ld-secondary">Keys expire after 30 days; at most 10 active keys per app. Revocation is irreversible. Rotation atomically revokes the old key and returns a replacement once; update your server environment after rotating.</p>
      {rawKey && <div className="ld-stack" role="region" aria-label="New server credential shown once">
        <p className="ld-body">Copy this key now into your private server secret manager. It cannot be shown again. Any action, navigation, organization/app switch or sign-out clears this display.</p>
        <code className="account-break">{rawKey}</code>
        <Ld.Button variant="secondary" onClick={dismissKey}>I saved the key — dismiss</Ld.Button>
      </div>}
      {loading && <p className="ld-secondary" role="status">Loading credential metadata…</p>}
      {error && <p className="account-error" role="alert">{error}</p>}
      <Ld.Button variant="secondary" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload credential metadata</Ld.Button>
      {credentials && <>
        <p className="ld-secondary">{activeCount} active of 10 allowed. Lists contain metadata only; no key or hash is recoverable here.</p>
        <AccountForm label="Issue server credential" busy={busy || activeCount >= 10} submit="Issue key — shown once"
          onSubmit={(data, form) => run('Issuing server credential', async () => {
            const credential = await issue(() => client.issueAppCredential(organizationId, app.id, String(data.get('label') ?? '')));
            if (credential && alive.current) { upsert(credential); form.reset(); }
          }, 'Server key issued. Save it now; serving remains disconnected.')}>
          <Input label="New credential label" name="label" maxLength={120} hint="For example, staging backend. Do not put a secret in the label." />
        </AccountForm>
        {!credentials.length && <p className="ld-secondary">No credentials have been issued for this app.</p>}
        {credentials.map(credential => {
          const status = credentialStatus(credential);
          return <section className="ld-stack" key={credential.id} aria-label={`Credential ${credential.label}`}>
            <p className="ld-body">{credential.label} · {status}</p>
            <p className="ld-secondary account-break">ID: {credential.id}</p>
            <p className="ld-secondary">Created {new Date(credential.createdAt).toISOString()} · Expires {new Date(credential.expiresAt).toISOString()}{credential.revokedAt !== null ? ` · Revoked ${new Date(credential.revokedAt).toISOString()}` : ''}</p>
            <p className="ld-secondary account-break">Scopes: {credential.scopes.join(', ')}</p>
            {status !== 'Revoked' && <div className="ld-stack">
              <Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Revoking credential', async () => {
                upsert((await client.revokeAppCredential(organizationId, app.id, credential.id)).credential);
              }, 'Credential revoked. It no longer authenticates SDK requests.')}>Revoke {credential.label}</Ld.Button>
              {status === 'Active' && <AccountForm label={`Rotate ${credential.label}`} busy={busy} submit="Revoke old key and issue replacement"
                onSubmit={data => run('Rotating server credential', async () => {
                  const replacement = await issue(() => client.rotateAppCredential(organizationId, app.id, credential.id, String(data.get('label') ?? '')));
                  if (replacement && alive.current) {
                    // Do not fabricate the old key's revocation timestamp; re-read authoritative metadata separately.
                    setCredentials(null); setRevision(value => value + 1);
                  }
                }, 'Old credential revoked and replacement issued. Save the new key and update your server environment.')}>
                <Input label="Replacement label" name="label" value={credential.label} maxLength={120} />
              </AccountForm>}
            </div>}
          </section>;
        })}
      </>}
      <details>
        <summary>Server-only SDK configuration example (not ad serving)</summary>
        <div className="ld-stack">
          <p className="ld-secondary">Install the local SDK 0.2.0 tarball on your backend, set AXP_PUBLISHER_API_KEY privately, and use this account endpoint. Do not use /api/product or send this key to a browser, model, logs or URL. A successful config read proves configuration access, not funding or serving.</p>
          <pre className="account-break"><code>{example}</code></pre>
          <p className="ld-secondary">Serving and recovery reject valid keys with account_serving_not_connected (503); invalid, expired or revoked keys receive 401. requestAd fails open with an explicit error; no ad is served.</p>
        </div>
      </details>
    </div>
  </Ld.Panel>;
}
