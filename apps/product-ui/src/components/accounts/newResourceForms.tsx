'use client';

import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import { AccountForm, Input, Textarea, type RunAction } from './AccountForms';
import { accountSDKBaseURL, accountSDKExample, campaignCapabilities, campaignFormInput, credentialStatus } from './resourceForms';
import type { AIApp, AppCredential, Campaign, CampaignInput, IssuedAppCredential } from './types';
import { CampaignServing } from './servingResources';
import { AppIntegration } from './AppIntegration';
import { assetName, formatUnits, formatWhen, modeName } from './format';

function safeError(error: unknown) {
  return error instanceof AccountApiError ? error.message : 'The resource request could not be completed. Refresh and try again.';
}

export interface Brand { name: string; website: string }
export interface CampaignSummary {
  organizationId: string; total: number; approved: number; serving: number;
  selected: { approved: boolean; serving: boolean | null } | null;
}
export interface AppSummary { appId: string; activeKeys: number | null; ready: boolean | null }
export type AppTab = 'connect' | 'keys' | 'deliveries' | 'settings';
type CampaignTab = 'edit' | 'golive' | 'results';
const campaignTabForSection: Record<string, CampaignTab> = { 'campaign-editor': 'edit', 'campaign-preview': 'golive', 'campaign-approve': 'golive', 'campaign-serving': 'golive', 'campaign-activity': 'results' };
const limits = { bid: 4000n, cap: 100000n };

function host(url: string | undefined) {
  if (!url) return '';
  try { return new URL(url).host; } catch { return ''; }
}
/** A typed amount such as 0.003 to whole base units, exactly. Empty when it is not a positive amount with up to six decimals. */
function toBaseUnits(value: string) {
  const text = value.trim();
  if (!/^\d{1,7}(?:\.\d{0,6})?$/.test(text)) return '';
  const [whole, fraction = ''] = text.split('.');
  const units = BigInt(whole) * 1000000n + BigInt(fraction.padEnd(6, '0'));
  return units > 0n ? units.toString() : '';
}

/** The fixed parts of a Sponsored card: label, approved text and destination. Shown below a placeholder answer. */
function SponsoredPreview({ text, brand }: { text: string; brand: Brand | null }) {
  const destination = host(brand?.website);
  return <figure className="ld-chat" style={{ margin: 0 }}>
    <div className="ld-chat-bar"><span>Inside an AI app</span><span className="ld-tag" data-tone="outline">Preview</span></div>
    <div className="ld-chat-body">
      <div className="ld-chat-q">A question your campaign fits</div>
      <div className="account-answer">
        <span>The app writes its own answer here.</span>
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

/** People type an amount; the form submits whole base units under the same field name as before. */
function AmountInput({ label, name, base, asset, hint }: { label: string; name: string; base: string; asset: string; hint: string }) {
  const id = useId();
  const [text, setText] = useState(() => formatUnits(base));
  return <div className="ld-field">
    <label className="ld-field-l" htmlFor={id}>{label}</label>
    <div className="account-amount">
      <input className="ld-input" id={id} inputMode="decimal" autoComplete="off" value={text} maxLength={10} onChange={event => setText(event.target.value)} aria-describedby={`${id}-hint`} />
      <span>{asset}</span>
    </div>
    <input type="hidden" name={name} value={toBaseUnits(text)} />
    <span className="ld-field-h" id={`${id}-hint`}>{hint}</span>
  </div>;
}

export function CampaignForm({ campaign, busy, run, save, approve, renderServing, brand = null, live = false, section = '', onCancel }: {
  campaign?: Campaign; busy: boolean; run: RunAction;
  save: (input: CampaignInput) => Promise<void>; approve: () => Promise<void>;
  renderServing?: (dirty: boolean) => ReactNode; brand?: Brand | null; live?: boolean; section?: string; onCancel?: () => void;
}) {
  const input = campaign?.input;
  const approved = campaign?.status === 'approved';
  const [dirty, setDirty] = useState(false);
  const [draft, setDraft] = useState(() => ({ approvedText: input?.approvedText ?? '', settlementNetwork: input?.settlementNetwork ?? 'solana-devnet' }));
  const [tab, setTab] = useState<CampaignTab>(() => campaign ? campaignTabForSection[section] ?? 'golive' : 'edit');
  const chosen = useRef(Boolean(campaignTabForSection[section]));
  const networkId = useId(), base = useId();
  const asset = assetName(draft.settlementNetwork);
  // A live campaign opens on its results, once, unless the person already picked a tab.
  useEffect(() => { if (live && campaign && !chosen.current) { chosen.current = true; setTab('results'); } }, [live, campaign]);
  useEffect(() => { const next = campaignTabForSection[section]; if (next && campaign) { chosen.current = true; setTab(next); } }, [section, campaign]);
  // Display-only mirror of the uncontrolled form; the submitted FormData remains the source of truth.
  function track(event: FormEvent<HTMLDivElement>) {
    setDirty(true);
    const field = event.target;
    if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) return;
    if (field.name in draft) setDraft(current => ({ ...current, [field.name]: field.value }));
  }
  const status = !campaign ? 'Not saved yet' : dirty ? 'Unsaved changes' : approved ? (live ? 'Live' : 'Approved') : 'Draft';
  const tone = !campaign ? 'outline' : dirty ? 'warning' : approved ? 'success' : 'warning';
  const pick = (next: CampaignTab) => { chosen.current = true; setTab(next); };
  // Any action here means the person is working in this tab; never move them afterwards.
  return <div className="account-campaign" data-tab={tab} onClickCapture={() => { chosen.current = true; }}>
    <Ld.Panel id="campaign-editor" flush>
      <div className="account-campaign-head">
        <div>
          <h3 className="ld-section-title">{campaign ? input?.name : 'New campaign'}</h3>
          <span className="ld-secondary">{campaign ? `Version ${campaign.version}` : 'Describe your offer and write the text people will see.'}</span>
        </div>
        <div className="ld-row"><span className="ld-tag" data-tone={tone}>{status}</span>{!campaign && onCancel && <Ld.Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Ld.Button>}</div>
      </div>
      {campaign && <Ld.TabBar label="Campaign sections" idBase={base} value={tab} onChange={pick}
        tabs={[{ key: 'edit', label: 'Edit' }, { key: 'golive', label: 'Approve and go live' }, { key: 'results', label: 'Results' }]} />}
      <div className="account-campaign-body" role={campaign ? 'tabpanel' : undefined} id={`${base}-panel-edit`} aria-labelledby={campaign ? `${base}-tab-edit` : undefined} hidden={tab !== 'edit'}>
        <div className="account-editor">
          <div onChange={track}>
            <AccountForm label={campaign ? 'Edit owned campaign' : 'Create owned campaign'} busy={busy}
              submit={campaign ? 'Save as new version' : 'Save draft'}
              hint={campaign ? 'Saving creates a new version that you approve again. Nothing is spent.' : 'Saving spends nothing and does not start your campaign.'}
              onSubmit={data => run('Saving campaign', async () => {
                const bid = String(data.get('maxBidBaseUnits') ?? ''), cap = String(data.get('budgetCapBaseUnits') ?? '');
                if (!bid || BigInt(bid) > limits.bid) throw new Error(`Enter a maximum bid above 0 and up to ${formatUnits(String(limits.bid))} ${asset}.`);
                if (!cap || BigInt(cap) > limits.cap) throw new Error(`Enter a budget above 0 and up to ${formatUnits(String(limits.cap))} ${asset}.`);
                if (BigInt(bid) > BigInt(cap)) throw new Error('The budget must be at least the maximum bid.');
                await save(campaignFormInput(data));
              }, 'Draft saved. Review it, then approve it. Nothing was spent or switched on.')}>
              <div className="account-part">
                <h4 className="account-part-title">Your offer</h4>
                <Input label="Campaign name" name="name" value={input?.name} maxLength={120} hint="Only you see this." />
                <Textarea label="What you are offering" name="productDescription" value={input?.productDescription} maxLength={1200} rows={3} hint="One paragraph. Used to decide whether a conversation fits. Not shown to people." />
              </div>
              <div className="account-part">
                <h4 className="account-part-title">Where it should appear</h4>
                <Textarea label="Conversations you want to appear in" name="contextHints" value={input?.contextHints.join('\n')} maxLength={2405} rows={3} hint="One per line, up to six." />
                <fieldset className="account-fields">
                  <legend className="ld-field-l">What your product does</legend>
                  <div className="account-chips">
                    {campaignCapabilities.map(capability => <label key={capability} className="account-chip">
                      <input type="checkbox" name="declaredCapabilities" value={capability} defaultChecked={input?.declaredCapabilities.includes(capability)} /><span>{capability.replaceAll('_', ' ')}</span>
                    </label>)}
                  </div>
                  <span className="ld-field-h">Choose up to 12. Tick only what your product really does.</span>
                </fieldset>
              </div>
              <div className="account-part">
                <h4 className="account-part-title">Sponsored text</h4>
                <Textarea label="Text shown on your card" name="approvedText" value={input?.approvedText} maxLength={800} rows={3} hint="Shown exactly as written, below the answer, labelled Sponsored. Up to 800 characters." />
              </div>
              <div className="account-part">
                <h4 className="account-part-title">Bid and budget</h4>
                <div className="ld-field">
                  <label className="ld-field-l" htmlFor={networkId}>Currency</label>
                  <select className="ld-select" id={networkId} name="settlementNetwork" defaultValue={input?.settlementNetwork ?? 'solana-devnet'}>
                    <option value="solana-devnet">Test USDC on Solana Devnet</option>
                    <option value="tempo-testnet">Test PathUSD on Tempo Testnet</option>
                  </select>
                  <span className="ld-field-h">Test currencies only. No real money. The two are never combined.</span>
                </div>
                <div className="account-pair">
                  <AmountInput label="Maximum bid per placement" name="maxBidBaseUnits" base={input?.maxBidBaseUnits ?? '3000'} asset={asset} hint={`Up to ${formatUnits(String(limits.bid))}.`} />
                  <AmountInput label="Budget" name="budgetCapBaseUnits" base={input?.budgetCapBaseUnits ?? '100000'} asset={asset} hint={`Up to ${formatUnits(String(limits.cap))}. A limit, not a deposit.`} />
                </div>
              </div>
            </AccountForm>
          </div>
          <div className="account-aside" id={campaign ? undefined : 'campaign-preview'}>
            <span className="ld-label">{dirty ? 'Preview of your unsaved edits' : 'Preview'}</span>
            <SponsoredPreview text={draft.approvedText} brand={brand} />
            <p className="ld-secondary">Always a separate card below the answer, never inside or beside it. Each app applies its own styling.</p>
          </div>
        </div>
      </div>
      {campaign && <div className="account-campaign-body" role="tabpanel" id={`${base}-panel-golive`} aria-labelledby={`${base}-tab-golive`} hidden={tab !== 'golive'}>
        <div className="account-editor">
          <section id="campaign-approve" className="ld-stack" aria-label="Review and approve">
            <div className="account-facts">
              <Ld.Stat label="Maximum bid" value={formatUnits(input!.maxBidBaseUnits)} caption={`${assetName(input!.settlementNetwork)} per placement`} />
              <Ld.Stat label="Budget" value={formatUnits(input!.budgetCapBaseUnits)} caption={`${assetName(input!.settlementNetwork)}, a limit`} />
              <Ld.Stat label="Version" value={campaign.version} caption={approved ? 'Approved' : 'Awaiting your approval'} />
            </div>
            <p className="ld-secondary">{approved ? 'This version is approved exactly as shown. Editing creates a new version to approve.' : 'Check the card and the limits. Approving covers this version only and does not start it.'}</p>
            {dirty && <p className="ld-secondary" role="status">Unsaved changes: save a new draft version before approving.</p>}
            <div className="ld-row">
              <Ld.Button variant={approved ? 'secondary' : 'primary'} disabled={busy || dirty || approved}
                onClick={() => void run('Approving campaign', approve, 'Version approved. It is not live yet. Turn it on when you are ready.')}>
                {approved ? `Version ${campaign.version} approved` : `Approve version ${campaign.version}`}
              </Ld.Button>
              <Ld.Button variant="ghost" onClick={() => pick('edit')}>Edit campaign</Ld.Button>
            </div>
            <details className="account-more">
              <summary>Record details</summary>
              <dl className="account-readiness">
                <div><dt>Campaign ID</dt><dd className="account-idline">{campaign.id}</dd></div>
                <div><dt>Approved content hash</dt><dd className="account-idline">{campaign.approvedContentHash ?? 'None. This version is not approved.'}</dd></div>
                <div><dt>Last saved</dt><dd>{formatWhen(campaign.updatedAt)}</dd></div>
              </dl>
            </details>
          </section>
          <div className="account-aside" id="campaign-preview">
            <span className="ld-label">{`Saved version ${campaign.version}`}</span>
            <SponsoredPreview text={input!.approvedText} brand={brand} />
          </div>
        </div>
      </div>}
    </Ld.Panel>
    {renderServing?.(dirty)}
  </div>;
}

export function CampaignResources({ client, organizationId, advertiserReady, busy, run, onUnauthorized, servingReady = false, financialMode = 'synthetic', brand = null, onSummary, section = '' }: {
  client: AccountsClient; organizationId: string; advertiserReady: boolean; busy: boolean; run: RunAction; onUnauthorized: () => void; servingReady?: boolean; financialMode?: 'synthetic' | 'devnet';
  brand?: Brand | null; onSummary?: (summary: CampaignSummary | null) => void; section?: string;
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
  const isLive = (campaign: Campaign) => campaign.status === 'approved' && serving[campaign.id] === true;
  return <div className="ld-stack-lg" id="owned-campaigns">
    {loading && <Ld.Panel flush><Ld.Skeleton rows={2} label="Loading your campaigns" /></Ld.Panel>}
    {error && <div className="account-error" role="alert">{error} <button type="button" className="account-inline-action" onClick={() => setRevision(value => value + 1)}>Try again</button></div>}
    {campaigns && campaigns.length > 0 && <Ld.Panel flush>
      <div className="account-list-head">
        <h3 className="ld-card-title">Campaigns <span className="ld-secondary">{campaigns.length}</span></h3>
        <div className="ld-row">
          <Ld.Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh</Ld.Button>
          <Ld.Button variant="secondary" size="sm" disabled={busy || !advertiserReady || (creating && !selected)} onClick={() => { setSelectedId(''); setCreating(true); }}>New campaign</Ld.Button>
        </div>
      </div>
      <ul className="ld-rows" aria-label="Your campaigns">
        {campaigns.map(campaign => <li key={campaign.id}>
          <button type="button" className="ld-rowitem account-campaign-row" aria-pressed={selected?.id === campaign.id} disabled={busy}
            onClick={() => { setSelectedId(campaign.id); setCreating(false); }}>
            <b>{campaign.input.name}</b>
            <span className="account-pick-meta">Version {campaign.version} · bids up to {formatUnits(campaign.input.maxBidBaseUnits)} {assetName(campaign.input.settlementNetwork)}</span>
            <span className="ld-tag" data-tone={campaign.status === 'approved' ? 'success' : 'warning'}>{isLive(campaign) ? 'Live' : campaign.status === 'approved' ? 'Approved' : 'Draft'}</span>
          </button>
        </li>)}
      </ul>
    </Ld.Panel>}
    {campaigns && <CampaignForm key={`${selected?.id ?? 'new'}:${selected?.version ?? 0}:${selected?.status ?? ''}`} campaign={selected}
      busy={busy || !advertiserReady} run={run} brand={brand} live={selected ? isLive(selected) : false} section={section}
      onCancel={campaigns.length ? () => { setCreating(false); setSelectedId(''); } : undefined}
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

export function AppCredentials({ client, organizationId, app, busy, run, issue, rawKey, dismissKey, onUnauthorized, servingReady = false, financialMode = 'synthetic', onSummary, tab = 'keys' }: {
  client: AccountsClient; organizationId: string; app: AIApp; busy: boolean; run: RunAction;
  issue: (action: () => Promise<IssuedAppCredential>) => Promise<AppCredential | null>;
  rawKey: string | null; dismissKey: () => void; onUnauthorized: () => void;
  servingReady?: boolean; financialMode?: 'synthetic' | 'devnet'; onSummary?: (summary: AppSummary | null) => void; tab?: AppTab;
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
    <div role="tabpanel" id="app-panel-keys" aria-labelledby="app-tab-keys" hidden={tab !== 'keys'}>
    <Ld.Panel id="app-credentials" title={activeCount ? 'API keys' : 'Get your API key'} sub="Your server uses a key to request ads for this app"
      actions={<>
        {credentials && <span className="ld-tag" data-tone={activeCount ? 'success' : 'outline'}>{activeCount} active of 10</span>}
        <Ld.Button variant="ghost" size="sm" disabled={busy || loading} onClick={() => setRevision(value => value + 1)}>Refresh</Ld.Button>
      </>}>
      <div className="ld-stack-lg">
        {rawKey && <div className="account-secret" role="region" aria-label="New API key shown once">
          <span className="ld-card-title">Copy this key now. It will not be shown again.</span>
          <code>{rawKey}</code>
          <p className="ld-secondary">Store it in your server's private secrets. Never put it in browser code, a public repository, a prompt or a URL. It disappears from this page as soon as you click anything else.</p>
          <div className="ld-row"><Ld.Button variant="secondary" onClick={dismissKey}>I have saved the key</Ld.Button></div>
        </div>}
        {loading && <p className="ld-secondary" role="status">Loading your keys…</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        {credentials && <>
          <AccountForm label="Create API key" busy={busy || activeCount >= 10} submit="Create API key" variant={activeCount ? 'secondary' : 'primary'}
            hint="The key is shown once. It cannot move money."
            onSubmit={(data, form) => run('Creating API key', async () => {
              const credential = await issue(() => client.issueAppCredential(organizationId, app.id, String(data.get('label') ?? '')));
              if (credential && alive.current) { upsert(credential); form.reset(); }
            }, 'API key created. Copy it now into your server\'s private secrets.')}>
            <Input label="Key name" name="label" maxLength={120} hint="For example, staging backend. Do not put a secret in the name." />
          </AccountForm>
          {sorted && sorted.length > 0 && <div>
            {sorted.map(credential => {
              const status = credentialStatus(credential);
              return <section className="account-key-row" key={credential.id} aria-label={`API key ${credential.label}`}>
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
                    <AccountForm label={`Rotate ${credential.label}`} busy={busy} submit="Revoke this key and create a replacement" variant="secondary"
                      onSubmit={data => run('Replacing API key', async () => {
                        const replacement = await issue(() => client.rotateAppCredential(organizationId, app.id, credential.id, String(data.get('label') ?? '')));
                        if (replacement && alive.current) {
                          // Do not fabricate the old key's revocation timestamp; re-read authoritative metadata separately.
                          setCredentials(null); setRevision(value => value + 1);
                        }
                      }, 'Old key revoked and a replacement created. Copy the new key and update your server.')}>
                      <Input label="Name for the replacement" name="label" value={credential.label} maxLength={120} />
                    </AccountForm>
                  </details>}
                </div>
                {status !== 'Revoked' && <Ld.Button variant="secondary" size="sm" disabled={busy} onClick={() => void run('Revoking API key', async () => {
                  upsert((await client.revokeAppCredential(organizationId, app.id, credential.id)).credential);
                }, 'Key revoked. It no longer works.')}>Revoke {credential.label}</Ld.Button>}
              </section>;
            })}
          </div>}
          <details className="account-more"><summary>Key limits</summary>
            <p className="ld-secondary">Keys expire after 30 days. An app can have up to 10 active keys. Revoking cannot be undone. Signing out here does not revoke your server's keys.</p>
          </details>
        </>}
      </div>
    </Ld.Panel>
    </div>
    <div role="tabpanel" id="app-panel-connect" aria-labelledby="app-tab-connect" hidden={tab !== 'connect'} className="ld-stack-lg">
    <Ld.Panel id="app-integrate" title="Connect your app" sub="Three things your server needs"
      actions={<span className="ld-tag" data-tone={servingReady ? 'outline' : 'warning'}>{servingReady ? modeName(financialMode) : 'Ads: not available yet'}</span>}>
      <ol className="account-connect">
        <li>
          <h4 className="account-part-title">Use your account's API address</h4>
          <Ld.CopyLine value={baseURL || '/api/accounts/sdk'} />
          <span className="ld-field-h">This is your own endpoint. The shared example chat uses a different one, and requests are never sent there.</span>
        </li>
        <li>
          <h4 className="account-part-title">Add your API key to your server</h4>
          <span className="ld-field-h">{activeCount ? <>Set it as <code>AXP_PUBLISHER_API_KEY</code> in your server's private environment. Never in browser code.</> : <>You do not have an active key yet. Create one under API keys, then set it as <code>AXP_PUBLISHER_API_KEY</code> on your server.</>}</span>
        </li>
        <li>
          <h4 className="account-part-title">Request, render, acknowledge</h4>
          <span className="ld-field-h">Request an ad next to your own answer, render the Sponsored card below it, then acknowledge the render. When no ad is available your app simply shows its answer. <a className="ld-link" href="/publisher-demo/integration/">Read the SDK guide →</a></span>
        </li>
      </ol>
      <details className="account-more">
        <summary>SDK installation and server example</summary>
        <div className="ld-stack">
          <p className="ld-secondary">The SDK is not published to npm yet. Install a locally packed copy from the AXP repository. This example only reads your app's configuration: it requests no ad and moves no money.</p>
          <Ld.CodeBlock title="Server example (Node.js)" code={example} />
          <p className="ld-secondary">Invalid, expired or revoked keys receive 401. Requests that carry a key from a browser are rejected.</p>
          <details className="account-more-inline">
            <summary>Publisher identity</summary>
            <p className="ld-secondary account-idline">app:{app.id}</p>
            <p className="ld-secondary">Set from this app. A key cannot act for a different app or change its saved rules.</p>
          </details>
        </div>
      </details>
    </Ld.Panel>
    <AppIntegration key={`integration:${revision}:${activeCount}:${app.updatedAt}`} client={client} organizationId={organizationId} appId={app.id}
      busy={busy} ready={servingReady} onUnauthorized={onUnauthorized} onReadyKnown={setIntegrationReady} />
    </div>
  </>;
}
