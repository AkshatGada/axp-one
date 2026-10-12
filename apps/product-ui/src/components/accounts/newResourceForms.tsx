'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import { AccountForm, Input, Textarea, type RunAction } from './AccountForms';
import { accountSDKBaseURL, accountSDKExample, campaignCapabilities, campaignFormInput, credentialStatus } from './resourceForms';
import type { AIApp, AppCredential, Campaign, CampaignInput, IssuedAppCredential } from './types';
import { CampaignServing } from './servingResources';
import { AppIntegration } from './AppIntegration';
import { assetName, formatUnits, formatWhen, modeName, networkName } from './format';

function safeError(error: unknown) {
  return error instanceof AccountApiError ? error.message : 'The resource request could not be completed. Refresh and try again.';
}

export interface Brand { name: string; website: string }
export interface CampaignSummary {
  organizationId: string; total: number; approved: number; serving: number;
  selected: { approved: boolean; serving: boolean | null } | null;
}
export interface AppSummary { appId: string; activeKeys: number | null; ready: boolean | null }
export type StepState = 'done' | 'next' | 'todo';

/** A journey strip. Each entry links to a section that exists on the page; states come from saved data only. */
export function JourneySteps({ label, steps }: { label: string; steps: Array<{ href: string; title: string; note: string; done: boolean }> }) {
  const next = steps.findIndex(step => !step.done);
  return <ol className="account-steps" aria-label={label}>
    {steps.map((step, index) => <li key={step.href} data-state={step.done ? 'done' : index === next ? 'next' : 'todo'}>
      <a href={step.href}>{step.title}</a>
      <span>{step.done ? 'Done' : index === next ? `Next: ${step.note}` : step.note}</span>
    </li>)}
  </ol>;
}

function host(url: string | undefined) {
  if (!url) return '';
  try { return new URL(url).host; } catch { return ''; }
}

/** The fixed parts of a Sponsored card: label, approved text and destination. Shown below a placeholder answer. */
function SponsoredPreview({ text, brand }: { text: string; brand: Brand | null }) {
  const destination = host(brand?.website);
  return <figure className="ld-chat" style={{ margin: 0 }}>
    <div className="ld-chat-bar"><span>Inside an AI app conversation</span><span className="ld-tag" data-tone="outline">Preview</span></div>
    <div className="ld-chat-body">
      <div className="ld-chat-q">A question your campaign fits</div>
      <div className="account-answer">
        <span>The AI app writes its own answer here. AXP never writes or changes it.</span>
        <i aria-hidden /><i aria-hidden /><i aria-hidden />
      </div>
      <aside className="ld-ad" aria-label="Sponsored card preview">
        <div className="ld-ad-top"><span>Sponsored</span></div>
        <p className="ld-ad-text">{text.trim() || 'Your Sponsored text appears here as you type.'}</p>
        <div className="ld-ad-foot">
          <span className="ld-link ld-strong">{brand?.name || 'Your business name'}</span>
          <span>{destination ? `Opens ${destination}` : 'Opens your website'}</span>
        </div>
      </aside>
    </div>
  </figure>;
}

export function CampaignForm({ campaign, busy, run, save, approve, renderServing, brand = null }: {
  campaign?: Campaign; busy: boolean; run: RunAction;
  save: (input: CampaignInput) => Promise<void>; approve: () => Promise<void>;
  renderServing?: (dirty: boolean) => ReactNode; brand?: Brand | null;
}) {
  const input = campaign?.input;
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(() => ({
    approvedText: input?.approvedText ?? '', maxBidBaseUnits: input?.maxBidBaseUnits ?? '3000',
    budgetCapBaseUnits: input?.budgetCapBaseUnits ?? '100000', settlementNetwork: input?.settlementNetwork ?? 'solana-devnet',
  }));
  const networkId = useId();
  const asset = assetName(draft.settlementNetwork);
  const amount = (value: string) => /^[1-9][0-9]{0,5}$/.test(value) ? `Equals ${formatUnits(value)} ${asset}.` : 'Enter a whole number.';
  // Display-only mirror of the uncontrolled form; the submitted FormData remains the source of truth.
  function track(event: FormEvent<HTMLDivElement>) {
    setDirty(true);
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
    if (field.name in draft) setDraft(current => ({ ...current, [field.name]: field.value }));
  }
  const approved = campaign?.status === 'approved';
  return <div className="ld-stack-lg">
    <div className="account-editor">
      <Ld.Panel id="campaign-editor" title={campaign ? input?.name : 'New campaign'}
        sub={campaign ? `Saved version ${campaign.version}. Saving an edit creates a new version that needs approval again.` : 'Describe your offer, the conversations you want and the text people will see.'}
        actions={campaign ? <span className="ld-tag" data-tone={approved ? 'success' : 'warning'}>{approved ? 'Approved' : 'Draft, not approved'}</span> : <span className="ld-tag" data-tone="outline">Not saved</span>}>
        <div onChange={track}>
          <AccountForm label={campaign ? 'Edit owned campaign' : 'Create owned campaign'} busy={busy}
            submit={campaign ? 'Save as new version' : 'Save draft'}
            hint="Saving never spends, deposits or starts serving. The amounts above are limits, not a funded balance."
            onSubmit={data => run('Saving campaign draft', () => save(campaignFormInput(data)), 'Draft saved as a new version. Review the preview, then approve it. Nothing was funded or switched on.')}>
            <div className="account-part">
              <h4 className="account-part-title">Your offer</h4>
              <Input label="Campaign name" name="name" value={input?.name} maxLength={120} hint="For your own reference. Not shown to people." />
              <Textarea label="What you are offering" name="productDescription" value={input?.productDescription} maxLength={1200} rows={3} hint="One paragraph, up to 1,200 characters. Used to judge whether a conversation fits. Not shown to people." />
            </div>
            <div className="account-part">
              <h4 className="account-part-title">Intended conversations</h4>
              <Textarea label="Conversations you want to appear in" name="contextHints" value={input?.contextHints.join('\n')} maxLength={2405} rows={3} hint="Up to six hints, one per line. Maximum 400 characters each." />
              <fieldset className="account-fields">
                <legend className="ld-field-l">What your product can do (choose up to 12)</legend>
                <div className="account-checks">
                  {campaignCapabilities.map(capability => <label key={capability}>
                    <input type="checkbox" name="declaredCapabilities" value={capability} defaultChecked={input?.declaredCapabilities.includes(capability)} />{capability.replaceAll('_', ' ')}
                  </label>)}
                </div>
                <span className="ld-field-h">Your own declarations, used for eligibility checks. Only tick what your product really does.</span>
              </fieldset>
            </div>
            <div className="account-part">
              <h4 className="account-part-title">Sponsored creative</h4>
              <Textarea label="Sponsored text" name="approvedText" value={input?.approvedText} maxLength={800} rows={3} hint="Exact copy below the answer, labelled Sponsored. One paragraph, up to 800 characters. Offer, hints and copy: 2,400 characters total." />
            </div>
            <div className="account-part">
              <h4 className="account-part-title">Bid and budget</h4>
              <div className="ld-field">
                <label className="ld-field-l" htmlFor={networkId}>Test network and currency</label>
                <select className="ld-select" id={networkId} name="settlementNetwork" defaultValue={input?.settlementNetwork ?? 'solana-devnet'}>
                  <option value="solana-devnet">Solana Devnet · test USDC</option>
                  <option value="tempo-testnet">Tempo Testnet · test PathUSD</option>
                </select>
                <span className="ld-field-h">Test networks only. Choosing one does not fund it, and the two currencies are never combined.</span>
              </div>
              <div className="account-pair">
                <Input label="Maximum bid per placement (base units)" name="maxBidBaseUnits" value={input?.maxBidBaseUnits ?? '3000'} maxLength={6} hint={`${amount(draft.maxBidBaseUnits)} Whole numbers from 1 to 4,000.`} />
                <Input label="Budget cap (base units)" name="budgetCapBaseUnits" value={input?.budgetCapBaseUnits ?? '100000'} maxLength={6} hint={`${amount(draft.budgetCapBaseUnits)} From the maximum bid up to 100,000. A limit, not a deposit.`} />
              </div>
              <p className="ld-secondary">1,000,000 base units equal 1 {asset}.</p>
            </div>
          </AccountForm>
        </div>
      </Ld.Panel>
      <div className="account-aside">
        <Ld.Panel id="campaign-preview" title="Sponsored preview" sub={dirty ? 'Showing your unsaved edits' : campaign ? `Saved version ${campaign.version}` : 'Updates as you type'}>
          <div className="ld-stack">
            <SponsoredPreview text={draft.approvedText} brand={brand} />
            <p className="ld-secondary">The Sponsored label, your text and your destination are fixed. The card always sits below the answer, never inside or beside it. Each AI app applies its own styling.</p>
          </div>
        </Ld.Panel>
        {campaign ? <Ld.Panel id="campaign-approve" title="Review and approve" sub={`Version ${campaign.version}`}
          actions={<span className="ld-tag" data-tone={approved ? 'success' : 'warning'}>{approved ? 'Approved' : 'Awaiting your approval'}</span>}>
          <div className="ld-stack">
            <div className="account-facts">
              <Ld.Stat label="Maximum bid" value={formatUnits(input!.maxBidBaseUnits)} caption={`${assetName(input!.settlementNetwork)} per placement`} />
              <Ld.Stat label="Budget cap" value={formatUnits(input!.budgetCapBaseUnits)} caption={`${assetName(input!.settlementNetwork)}, a limit only`} />
              <Ld.Stat label="Network" value={networkName(input!.settlementNetwork)} caption="Test network" />
            </div>
            <p className="ld-secondary">{approved ? 'This saved version is approved exactly as shown. Any edit creates a new version and clears the approval.' : 'Check the preview and the limits. Approval covers this saved version only. It does not start serving or move any money.'}</p>
            {dirty && <p className="ld-secondary" role="status">Unsaved changes: save a new draft version before approving.</p>}
            <div className="ld-row">
              <Ld.Button variant={approved ? 'secondary' : 'primary'} disabled={busy || dirty || approved}
                onClick={() => void run('Approving saved campaign content', approve, 'Version approved. Serving is still off and nothing was funded. Turn serving on when you are ready.')}>
                {approved ? `Version ${campaign.version} approved` : `Approve version ${campaign.version}`}
              </Ld.Button>
            </div>
            <details className="account-more">
              <summary>Technical details</summary>
              <dl className="account-readiness">
                <div><dt>Campaign ID</dt><dd className="account-idline">{campaign.id}</dd></div>
                <div><dt>Approved content hash</dt><dd className="account-idline">{campaign.approvedContentHash ?? 'None. This version is not approved.'}</dd></div>
                <div><dt>Last saved</dt><dd>{formatWhen(campaign.updatedAt)}</dd></div>
              </dl>
            </details>
          </div>
        </Ld.Panel> : <Ld.Callout title="After you save">You review this exact version and approve it. Approval and serving are separate, deliberate steps.</Ld.Callout>}
      </div>
    </div>
    {renderServing?.(dirty)}
  </div>;
}

export function CampaignResources({ client, organizationId, advertiserReady, busy, run, onUnauthorized, servingReady = false, financialMode = 'synthetic', brand = null, onSummary }: {
  client: AccountsClient; organizationId: string; advertiserReady: boolean; busy: boolean; run: RunAction; onUnauthorized: () => void; servingReady?: boolean; financialMode?: 'synthetic' | 'devnet';
  brand?: Brand | null; onSummary?: (summary: CampaignSummary | null) => void;
}) {
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [selectedId, setSelectedId] = useState('');
  const [creating, setCreating] = useState(false);
  const [serving, setServing] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
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
  // Open the first saved campaign unless the owner chose to start a new one.
  const selected = campaigns?.find(campaign => campaign.id === selectedId) ?? (creating || selectedId ? undefined : campaigns?.[0]);
  const noteServing = useCallback((campaignId: string, enabled: boolean) => {
    setServing(current => current[campaignId] === enabled ? current : { ...current, [campaignId]: enabled });
  }, []);
  useEffect(() => {
    onSummary?.(campaigns ? {
      organizationId, total: campaigns.length, approved: campaigns.filter(campaign => campaign.status === 'approved').length,
      serving: campaigns.filter(campaign => campaign.status === 'approved' && serving[campaign.id]).length,
      selected: selected ? { approved: selected.status === 'approved', serving: selected.id in serving ? serving[selected.id] && selected.status === 'approved' : null } : null,
    } : null);
  }, [campaigns, serving, selected, organizationId, onSummary]);
  useEffect(() => () => onSummary?.(null), [onSummary]);
  function upsert(campaign: Campaign) {
    if (!alive.current) return;
    setCampaigns(current => current ? current.some(item => item.id === campaign.id) ? current.map(item => item.id === campaign.id ? campaign : item) : [...current, campaign] : [campaign]);
    setSelectedId(campaign.id); setCreating(false);
  }
  return <div className="ld-stack-lg" id="owned-campaigns">
    <Ld.Panel title="Your campaigns" sub="Private to your organization"
      actions={<>
        <Ld.Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload</Ld.Button>
        <Ld.Button variant="secondary" size="sm" disabled={busy || !advertiserReady || (creating && !selected) || !campaigns?.length} onClick={() => { setSelectedId(''); setCreating(true); }}>New campaign</Ld.Button>
      </>}>
      <div className="ld-stack">
        {!advertiserReady && <Ld.Callout tone="brand" title="Save your business profile first">Every campaign belongs to your business profile. Complete the profile above, then create your first campaign.</Ld.Callout>}
        {loading && <p className="ld-secondary" role="status">Loading your campaigns…</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {campaigns && !campaigns.length && advertiserReady && <Ld.Empty title="No campaigns yet">Start with the form below. You can save a draft as often as you like before approving it.</Ld.Empty>}
        {campaigns && campaigns.length > 0 && <ul className="account-campaign-list">
          {campaigns.map(campaign => <li key={campaign.id}>
            <button type="button" className="account-pick" aria-pressed={selected?.id === campaign.id} disabled={busy}
              onClick={() => { setSelectedId(campaign.id); setCreating(false); }}>
              <b>{campaign.input.name}</b>
              <span className="account-pick-meta">Version {campaign.version} · max bid {formatUnits(campaign.input.maxBidBaseUnits)} {assetName(campaign.input.settlementNetwork)}</span>
              <span className="ld-tag" data-tone={campaign.status === 'approved' ? 'success' : 'warning'}>{campaign.status === 'approved' ? 'Approved' : 'Draft'}</span>
            </button>
          </li>)}
        </ul>}
      </div>
    </Ld.Panel>
    {campaigns && <CampaignForm key={`${selected?.id ?? 'new'}:${selected?.version ?? 0}:${selected?.status ?? ''}`} campaign={selected}
      busy={busy || !advertiserReady} run={run} brand={brand}
      renderServing={selected ? dirty => <CampaignServing client={client} organizationId={organizationId} campaign={selected} ready={servingReady} busy={busy} dirty={dirty} run={run} onUnauthorized={onUnauthorized} financialMode={financialMode} onEnabledKnown={noteServing} onConflict={() => setRevision(value => value + 1)} /> : undefined}
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
      }} />}
  </div>;
}

// Prevent local resource updates after logout/org switch/unmount.
function useResourceAlive() {
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  return alive;
}

export function AppCredentials({ client, organizationId, app, busy, run, issue, rawKey, dismissKey, onUnauthorized, servingReady = false, financialMode = 'synthetic', onSummary }: {
  client: AccountsClient; organizationId: string; app: AIApp; busy: boolean; run: RunAction;
  issue: (action: () => Promise<IssuedAppCredential>) => Promise<AppCredential | null>;
  rawKey: string | null; dismissKey: () => void; onUnauthorized: () => void;
  servingReady?: boolean; financialMode?: 'synthetic' | 'devnet'; onSummary?: (summary: AppSummary | null) => void;
}) {
  const [credentials, setCredentials] = useState<AppCredential[] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [example, setExample] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [integrationReady, setIntegrationReady] = useState<boolean | null>(null);
  const alive = useResourceAlive();
  useEffect(() => {
    setExample(accountSDKExample(window.location.origin, servingReady));
    setBaseURL(accountSDKBaseURL(window.location.origin));
  }, [servingReady]);
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
  useEffect(() => {
    onSummary?.({ appId: app.id, activeKeys: credentials ? activeCount : null, ready: integrationReady });
  }, [app.id, credentials, activeCount, integrationReady, onSummary]);
  useEffect(() => () => onSummary?.(null), [onSummary]);
  const sorted = credentials ? [...credentials].sort((a, b) => b.createdAt - a.createdAt) : null;
  return <>
    <Ld.Panel id="app-credentials" title="Server key" sub={`For ${app.name}`}
      actions={<>
        {credentials && <span className="ld-tag" data-tone={activeCount ? 'success' : 'outline'}>{activeCount} active of 10</span>}
        <Ld.Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Reload</Ld.Button>
      </>}>
      <div className="ld-stack-lg">
        <p className="ld-body">Request ads for {app.name} from your server. Keys are shown once and cannot authorize payments.</p>
        {rawKey && <div className="account-secret" role="region" aria-label="New server credential shown once">
          <span className="ld-card-title">Copy this key now. It will not be shown again.</span>
          <code>{rawKey}</code>
          <p className="ld-secondary">Store it in your server's private secrets. Never put it in browser code, a public repository, a prompt or a URL. Any click, navigation, app switch or sign out clears it from this page.</p>
          <div className="ld-row"><Ld.Button variant="secondary" onClick={dismissKey}>I have saved the key</Ld.Button></div>
        </div>}
        {loading && <p className="ld-secondary" role="status">Loading your keys…</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {credentials && <>
          <AccountForm label="Issue server credential" busy={busy || activeCount >= 10} submit="Issue key, shown once"
            onSubmit={(data, form) => run('Issuing server credential', async () => {
              const credential = await issue(() => client.issueAppCredential(organizationId, app.id, String(data.get('label') ?? '')));
              if (credential && alive.current) { upsert(credential); form.reset(); }
            }, 'Key issued. Copy it now into your private server environment. Issuing a key does not fund or start anything.')}>
            <Input label="Name for the new key" name="label" maxLength={120} hint="For example, staging backend. Do not put a secret in the name." />
          </AccountForm>
          {!sorted?.length ? <Ld.Empty title="No keys issued yet">Issue a key above when your server is ready to request ads.</Ld.Empty> : <div>
            {sorted.map(credential => {
              const status = credentialStatus(credential);
              return <section className="account-key-row" key={credential.id} aria-label={`Credential ${credential.label}`}>
                <div className="ld-stack" style={{ gap: 4 }}>
                  <div className="ld-row"><span className="ld-strong">{credential.label}</span><span className="ld-tag" data-tone={status === 'Active' ? 'success' : status === 'Revoked' ? 'danger' : 'outline'}>{status}</span></div>
                  <p className="ld-secondary">Created {formatWhen(credential.createdAt)}. {credential.revokedAt !== null ? `Revoked ${formatWhen(credential.revokedAt)}.` : `Expires ${formatWhen(credential.expiresAt)}.`}</p>
                  <details className="account-more-inline">
                    <summary>Key details</summary>
                    <p className="ld-secondary account-idline">ID {credential.id}</p>
                    <p className="ld-secondary account-idline">Scopes {credential.scopes.join(', ')}</p>
                  </details>
                  {status === 'Active' && <details className="account-more-inline">
                    <summary>Replace this key</summary>
                    <AccountForm label={`Rotate ${credential.label}`} busy={busy} submit="Revoke this key and issue a replacement" variant="secondary"
                      onSubmit={data => run('Rotating server credential', async () => {
                        const replacement = await issue(() => client.rotateAppCredential(organizationId, app.id, credential.id, String(data.get('label') ?? '')));
                        if (replacement && alive.current) {
                          // Do not fabricate the old key's revocation timestamp; re-read authoritative metadata separately.
                          setCredentials(null); setRevision(value => value + 1);
                        }
                      }, 'Old key revoked and a replacement issued. Copy the new key and update your server environment.')}>
                      <Input label="Name for the replacement" name="label" value={credential.label} maxLength={120} />
                    </AccountForm>
                  </details>}
                </div>
                {status !== 'Revoked' && <Ld.Button variant="secondary" size="sm" disabled={busy} onClick={() => void run('Revoking credential', async () => {
                  upsert((await client.revokeAppCredential(organizationId, app.id, credential.id)).credential);
                }, 'Key revoked. It no longer authenticates requests.')}>Revoke {credential.label}</Ld.Button>}
              </section>;
            })}
          </div>}
          <details className="account-more"><summary>Key limits and revocation</summary>
            <p className="ld-secondary">Keys expire after 30 days. An app can have up to 10 active keys. Revoking cannot be undone. This list never contains a key or its hash. Signing out here does not revoke your server's keys.</p>
          </details>
        </>}
      </div>
    </Ld.Panel>
    <Ld.Panel id="app-integrate" title="Connect your server" sub="Server side only"
      actions={<span className="ld-tag" data-tone={servingReady ? 'brand' : 'outline'}>{servingReady ? modeName(financialMode) : 'Serving: not connected'}</span>}>
      <div className="ld-stack-lg">
        <div>
          <div className="ld-field">
            <span className="ld-field-l">API base for this account</span>
            <code className="account-endpoint">{baseURL || '/api/accounts/sdk'}</code>
            <span className="ld-field-h">Use this base, not the shared demonstration endpoint. Requests are never rerouted there.</span>
          </div>
          <details className="account-more">
            <summary>Publisher identity</summary>
            <span className="ld-field-l">Your app's publisher identity</span>
            <code className="account-endpoint">app:{app.id}</code>
            <span className="ld-field-h">Set by AXP from this app. A key cannot act for a different app or change its saved rules.</span>
          </details>
        </div>
        <p className="ld-body">{servingReady
          ? 'Check integration readiness below before requesting ads.'
          : 'Ad serving is not connected. Configuration reads are available.'} Your app keeps showing its own answer when no ad is available.</p>
        <details className="account-more">
          <summary>SDK installation and server example</summary>
          <p className="ld-secondary">The SDK is not published to npm yet. Install a locally packed copy from the AXP repository, set AXP_PUBLISHER_API_KEY in your server's private environment and read your configuration. This example requests no ad and authorizes no payment.</p>
          <pre className="account-code"><code>{example}</code></pre>
          <p className="ld-secondary">Invalid, expired or revoked keys receive 401. Requests carrying a key from a browser are rejected. Reading your configuration confirms access only, not funding or serving.</p>
        </details>
      </div>
    </Ld.Panel>
    <AppIntegration key={`integration:${revision}:${activeCount}:${app.updatedAt}`} client={client} organizationId={organizationId} appId={app.id}
      busy={busy} ready={servingReady} onUnauthorized={onUnauthorized} onReadyKnown={setIntegrationReady} />
  </>;
}
