'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, AccountsClient, isConfigured } from './client';
import { consumeConfirmationLink } from './forms';
import { AccountForm, AdvertiserForm, AppForm, AuthForm, Input, type RunAction } from './AccountForms';
import { AppCredentials, CampaignResources, JourneySteps, type AppSummary, type CampaignSummary } from './newResourceForms';
import { OwnerReport } from './servingResources';
import { AccountFinancialResources } from './financialResources';
import type { AccountHealth, AccountSession, AppCredential, IssuedAppCredential, OrganizationDetails } from './types';
import { modeName, modeSentence } from './format';
import { campaignCapabilities } from './resourceForms';
import { accountViews as views, accountViewForFragment, type AccountView as View } from './navigation';

const pages: Record<View, { nav: string; title: string; sub: string }> = {
  overview: { nav: 'Overview', title: 'Your account', sub: 'Advertise in AI conversations, or show Sponsored cards in your own AI app.' },
  advertiser: { nav: 'Advertise', title: 'Advertise', sub: 'Reach people in AI conversations with a clearly labelled Sponsored card below the answer.' },
  app: { nav: 'AI app', title: 'AI app', sub: 'Show a clearly labelled Sponsored card below your own answers and track every accepted placement.' },
  wallet: { nav: 'Wallet', title: 'Wallet', sub: 'Wallet ownership, deposits, accepted charges, payouts and refunds, each kept separate.' },
  settings: { nav: 'Settings', title: 'Settings', sub: 'Your profile, your organizations and what this server can do.' },
};

type Step = { label: string; done: boolean; action: string };
/** One role, its saved progress and a single next step. Nothing here is inferred beyond saved account data. */
function RoleCard({ title, sub, steps, href, unavailable, doneAction }: { title: string; sub: string; steps: Step[]; href: string; unavailable?: string; doneAction: string }) {
  const next = steps.findIndex(step => !step.done);
  const done = steps.filter(step => step.done).length;
  return <Ld.Panel title={title} sub={sub} actions={<span className="ld-tag" data-tone={done ? 'brand' : 'outline'}>{done} of {steps.length} steps done</span>}>
    <div className="account-role">
      <ol className="account-checklist">
        {steps.map((step, index) => <li key={step.label} data-state={step.done ? 'done' : index === next ? 'next' : 'todo'}>{step.label}</li>)}
      </ol>
      {unavailable ? <Ld.Callout tone="warning" title="Not available on this server">{unavailable}</Ld.Callout> : <div className="account-next">
        <div>
          <span className="ld-label">Next step</span>
          <span className="ld-body ld-strong">{next === -1 ? doneAction : steps[next].action}</span>
        </div>
        <Ld.Button href={href}>{next === -1 ? 'Open →' : next === 0 ? 'Get started →' : 'Continue →'}</Ld.Button>
      </div>}
    </div>
  </Ld.Panel>;
}

/** The four money facts that must never be confused with one another. */
function MoneyTerms() {
  return <ul className="account-money">
    <li><b>Ownership proof</b><span>A signed message showing you control a wallet. It moves no funds and is not a payment or a deposit.</span></li>
    <li><b>Deposit</b><span>Test funds an advertiser locks for one AI app by signing a transaction. Collateral, not spend.</span></li>
    <li><b>Accepted charge</b><span>Added when an AI app's receipt confirms a Sponsored card was inserted. Owed, not yet paid out.</span></li>
    <li><b>Payout and refund</b><span>At close the app is paid the accepted total and the advertiser gets the unused deposit back. Two separate amounts.</span></li>
  </ul>;
}

export function AccountConsole() {
  const client = useMemo(() => new AccountsClient(), []);
  const [health, setHealth] = useState<AccountHealth | null>(null);
  const [session, setSession] = useState<AccountSession | null>(null);
  const [details, setDetails] = useState<OrganizationDetails | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [appId, setAppId] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [tokenHash, setTokenHash] = useState<string | null>(null);
  const [busyLabel, setBusyLabel] = useState('Loading account');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [issuedKey, setIssuedKey] = useState<{ apiKey: string; organizationId: string; appId: string } | null>(null);
  const [view, setView] = useState<View>('overview');
  const [campaignSummary, setCampaignSummary] = useState<CampaignSummary | null>(null);
  const [appSummary, setAppSummary] = useState<AppSummary | null>(null);
  const secretEpoch = useRef(0);
  const lock = useRef(false);
  const initialized = useRef(false);
  const errorNode = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const busy = Boolean(busyLabel);
  const authenticated = session?.authenticated === true ? session : null;
  const ready = Boolean(health?.enabled && isConfigured(health));
  const profiles = Boolean(authenticated?.capabilities.profiles && health?.capabilities.profiles);
  const campaignDrafts = Boolean(profiles && authenticated?.capabilities.campaignDrafts && health?.capabilities.campaignDrafts);
  const appCredentials = Boolean(profiles && authenticated?.capabilities.appCredentials && health?.capabilities.appCredentials);
  // Health reflects actual shared-network readiness; legacy campaign/session DTOs do not.
  const servingReady = Boolean(ready && authenticated && health?.capabilities.campaignServing);
  const financialMode = health?.serving?.financialMode === 'devnet' ? 'devnet' : 'synthetic';
  const walletBindings = Boolean(ready && authenticated && health?.capabilities.walletBindings);

  const clearResourceSecret = useCallback(() => {
    secretEpoch.current++;
    setIssuedKey(null);
  }, []);

  function clearOwnedState() {
    clearResourceSecret();
    client.clearSession();
    setSession(null);
    setDetails(null);
    setOrganizationId('');
    setAppId('');
  }

  // Only known local validation errors are displayed; API errors have safe mapped text.
  const run: RunAction = async (label, action, success) => {
    // Invalidate the prior display and any pending key response before the first await.
    clearResourceSecret();
    if (lock.current) return;
    lock.current = true;
    setBusyLabel(label);
    setError('');
    setNotice('');
    try {
      await action();
      if (mounted.current && success) setNotice(success);
    } catch (failure) {
      if (!mounted.current) return;
      if (failure instanceof AccountApiError && failure.status === 401) {
        clearOwnedState();
        setSession({ authenticated: false });
      }
      setError(failure instanceof Error ? failure.message : 'The request could not be completed.');
    } finally {
      lock.current = false;
      if (mounted.current) setBusyLabel('');
    }
  };

  const expireOwnedSession = useCallback(() => {
    client.clearSession(); clearResourceSecret();
    setSession({ authenticated: false }); setDetails(null); setOrganizationId(''); setAppId('');
  }, [client, clearResourceSecret]);

  async function showIssuedCredential(action: () => Promise<IssuedAppCredential>): Promise<AppCredential | null> {
    const epoch = secretEpoch.current;
    const result = await action();
    if (!mounted.current || epoch !== secretEpoch.current) {
      throw new Error('The credential response was discarded after navigation or an account action. Reload credential metadata, then revoke or rotate the new credential if you did not save it. Issuance is not retried automatically.');
    }
    setIssuedKey({ apiKey: result.apiKey, organizationId, appId });
    return result.credential;
  }

  async function readSession(preferredId = '') {
    clearResourceSecret();
    const current = await client.session();
    if (!mounted.current) return;
    setSession(current);
    setDetails(null);
    setAppId('');
    if (!current.authenticated) { setOrganizationId(''); return; }
    const id = current.organizations.find(org => org.id === preferredId)?.id ?? current.organizations[0]?.id ?? '';
    setOrganizationId(id);
    if (id && current.capabilities.profiles) {
      const loaded = await client.organization(id);
      if (mounted.current) setDetails(loaded);
    }
  }

  async function refresh() {
    setHealth(null);
    clearOwnedState();
    const status = await client.health();
    if (!mounted.current) return;
    setHealth(status);
    if (status.enabled && isConfigured(status)) await readSession(organizationId);
  }

  useEffect(() => {
    mounted.current = true;
    // StrictMode may replay effects. Capture/scrub the link once, never POST here.
    if (!initialized.current) {
      initialized.current = true;
      const link = consumeConfirmationLink(window.location.href, clean => window.history.replaceState(null, '', clean));
      setTokenHash(link.tokenHash);
      void run('Loading account', refresh, link.invalid ? 'This is not a supported email-confirmation link. Sign in or request a new sign-up email.' : undefined);
    }
    const clearOnNavigation = () => clearResourceSecret();
    // Section deep links select their owning view on reload as well as clicks.
    const syncView = () => {
      const name = window.location.hash.slice(1);
      const next = accountViewForFragment(window.location.hash);
      if (next) {
        setView(next); setNotice('');
        if ((views as readonly string[]).includes(name)) window.scrollTo(0, 0);
      }
    };
    syncView();
    window.addEventListener('hashchange', syncView);
    window.addEventListener('popstate', clearOnNavigation);
    window.addEventListener('hashchange', clearOnNavigation);
    window.addEventListener('pagehide', clearOnNavigation);
    window.addEventListener('beforeunload', clearOnNavigation);
    return () => {
      mounted.current = false;
      secretEpoch.current++;
      setIssuedKey(null);
      window.removeEventListener('hashchange', syncView);
      window.removeEventListener('popstate', clearOnNavigation);
      window.removeEventListener('hashchange', clearOnNavigation);
      window.removeEventListener('pagehide', clearOnNavigation);
      window.removeEventListener('beforeunload', clearOnNavigation);
    };
    // Initial reads only. All mutations require an explicit form or button action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (error) errorNode.current?.focus(); }, [error]);
  // Open the first saved AI app for a newly loaded organization; choosing "new app" afterwards is respected.
  const loadedOrganization = details?.organization.id;
  useEffect(() => {
    if (details?.apps.length) setAppId(current => current || details.apps[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedOrganization]);

  const selectedApp = details?.apps.find(app => app.id === appId);
  const page = pages[view];
  const campaignFacts = campaignSummary && campaignSummary.organizationId === details?.organization.id ? campaignSummary : null;
  const appFacts = appSummary && appSummary.appId === selectedApp?.id ? appSummary : null;
  const signedIn = Boolean(authenticated && !tokenHash);
  useEffect(() => {
    if (!signedIn || busy) return;
    const fragment = window.location.hash;
    if (accountViewForFragment(fragment) === view && fragment !== `#${view}`)
      document.getElementById(fragment.slice(1))?.scrollIntoView({block: 'start'});
  }, [view, signedIn, busy, appId]);
  const unenforceable = selectedApp?.blockedCategories.filter(entry => !(campaignCapabilities as readonly string[]).includes(entry)) ?? [];
  const advertiserSteps: Step[] = [
    { label: 'Save your business profile', done: Boolean(details?.advertiser), action: 'Add your business profile' },
    { label: 'Create a campaign and its Sponsored creative', done: Boolean(campaignFacts?.total), action: 'Create your first campaign' },
    { label: 'Approve the exact version you reviewed', done: Boolean(campaignFacts?.approved), action: 'Review and approve your campaign' },
    { label: 'Turn serving on', done: Boolean(campaignFacts?.serving), action: 'Turn serving on for an approved campaign' },
  ];
  const appSteps: Step[] = [
    { label: 'Create your AI app profile', done: Boolean(details?.apps.length), action: 'Add your AI app' },
    { label: 'Save allowed origins and category rules', done: Boolean(selectedApp?.allowedOrigins.length) && !unenforceable.length, action: unenforceable.length ? 'Remove category rules that cannot be enforced' : 'Save the origins your app runs on' },
    { label: 'Issue a server key', done: Boolean(appFacts?.activeKeys), action: 'Issue a server key and copy it once' },
    { label: 'Connect your server and pass the readiness check', done: appFacts?.ready === true, action: 'Connect your server and check readiness' },
  ];
  const selectedCampaign = campaignFacts?.selected ?? null;
  return <div className="account-console"
    onClickCapture={event => { if (event.target instanceof Element && event.target.closest('button, a, summary')) clearResourceSecret(); }}
    onSubmitCapture={clearResourceSecret} onChangeCapture={clearResourceSecret}>
    <Ld.Shell
      top={<Ld.TopBar brand={<Ld.Wordmark />} chips={<>
          <Ld.Tag tone="outline">Account</Ld.Tag>
          {ready && <Ld.Tag tone={financialMode === 'devnet' ? 'brand' : 'outline'}>{modeName(financialMode)}</Ld.Tag>}
        </>}
        actions={<>
          {authenticated && <span className="account-who" title={authenticated.user.email}>{authenticated.user.displayName || authenticated.user.email}</span>}
          <Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Refreshing account', refresh)}>Refresh account</Ld.Button>
          {authenticated && <Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Signing out', async () => {
            await client.signout();
            clearOwnedState();
            setSession({ authenticated: false });
          }, 'Signed out.')}>Sign out</Ld.Button>}
        </>} />}
      side={<Ld.SideNav groups={signedIn ? [
        { label: 'Account', items: [{ href: '#overview', label: pages.overview.nav, current: view === 'overview' }] },
        { label: 'Advertiser', items: [{ href: '#advertiser', label: 'Campaigns', current: view === 'advertiser', meta: campaignFacts ? String(campaignFacts.total) : undefined }] },
        { label: 'AI app owner', items: [{ href: '#app', label: 'Apps and integration', current: view === 'app', meta: details ? String(details.apps.length) : undefined }] },
        { label: 'Money', items: [{ href: '#wallet', label: pages.wallet.nav, current: view === 'wallet' }] },
        { label: 'Settings', items: [{ href: '#settings', label: 'Profile and status', current: view === 'settings' }] },
      ] : [{ label: 'Account', items: [{ href: '#overview', label: 'Sign in', current: true }] }]}
        foot={ready ? `${modeName(financialMode)}. Your account data is separate from the shared demonstration.` : 'Your account data is separate from the shared demonstration.'} />}>
      <Ld.PageBar title={signedIn ? page.title : 'Your account'} sub={signedIn ? page.sub : pages.overview.sub}
        meta={signedIn && details ? <Ld.Tag tone="outline">{details.organization.name}</Ld.Tag> : undefined}
        actions={signedIn && authenticated && authenticated.organizations.length > 1 ? <div className="account-org">
          <label htmlFor="account-organization">Organization</label>
          <select id="account-organization" className="ld-select" value={organizationId} disabled={busy || !profiles}
            onChange={event => {
              const id = event.target.value;
              setOrganizationId(id); setDetails(null); setAppId('');
              void run('Loading organization', async () => setDetails(await client.organization(id)));
            }}>
            {authenticated.organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
          </select>
        </div> : undefined} />

      <div className="account-feedback" data-kind={busy ? 'busy' : notice ? 'done' : undefined} aria-live="polite" aria-atomic="true" role="status">
        {busy ? `${busyLabel}…` : notice}
      </div>
      {error && <div className="account-error" role="alert" tabIndex={-1} ref={errorNode}>{error}</div>}

      {!health && !busy && <Ld.Callout tone="danger" title="Account service unavailable">
        The account service could not be reached or returned an invalid response. No signed-in state has been assumed. Check the server, then select Refresh account.
      </Ld.Callout>}
      {health && !ready && <Ld.Callout tone="warning" title={!isConfigured(health) ? 'Accounts are not configured on this server' : 'Accounts are switched off on this server'}>
        {!isConfigured(health) ? 'The account origin, identity provider or private profile store is not configured.' : 'The account service has not been enabled.'} Sign-up, sign-in and profile changes are unavailable. No demo identity or simulated sign-in is provided.
      </Ld.Callout>}
      {ready && !session && !busy && <Ld.Callout tone="warning" title="Your session could not be checked">
        Select Refresh account to check your session before continuing.
      </Ld.Callout>}

      {tokenHash && <Ld.Panel title="Confirm your email">
        <div className="ld-stack">
          <p className="ld-body">An email-confirmation link was opened. Nothing has been submitted. Confirming will sign you into the account associated with this link{authenticated ? ' and replace your current session' : ''}.</p>
          <p className="ld-secondary">The link parameters have been removed from the address bar. Reloading discards this pending confirmation; reopen the email link if needed.</p>
          <div className="ld-row">
            <Ld.Button disabled={busy || !ready} onClick={() => void run('Confirming email', async () => {
              await client.confirm(tokenHash);
              setTokenHash(null);
              clearOwnedState();
              await readSession();
            }, 'Email confirmed and session checked. Nothing is served or funded until you choose to.')}>Confirm email</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy} onClick={() => { setTokenHash(null); setError(''); }}>Discard link</Ld.Button>
          </div>
        </div>
      </Ld.Panel>}

      {ready && session?.authenticated === false && !tokenHash && <Ld.Panel>
        <div className="account-welcome">
          <div className="ld-stack-lg">
            <h2>One account for advertisers and AI apps</h2>
            <ul className="account-plain-list">
              <li><span className="ld-body ld-strong">Advertise in AI conversations</span><span className="ld-secondary">Write a Sponsored card, choose the conversations you want, set a bid and a budget cap, then approve and switch it on yourself.</span></li>
              <li><span className="ld-body ld-strong">Show Sponsored cards in your AI app</span><span className="ld-secondary">Keep your own answers. Show a labelled Sponsored card below them and see a receipt for every accepted placement.</span></li>
              <li><span className="ld-body ld-strong">Money stays explicit</span><span className="ld-secondary">{modeSentence(financialMode)}</span></li>
            </ul>
          </div>
          <div className="account-auth">
            <div className="ld-seg" role="group" aria-label="Account access">
              <button type="button" aria-pressed={authMode === 'signin'} disabled={busy} onClick={() => { setAuthMode('signin'); setError(''); }}>Sign in</button>
              <button type="button" aria-pressed={authMode === 'signup'} disabled={busy} onClick={() => { setAuthMode('signup'); setError(''); }}>Create account</button>
            </div>
            <AuthForm key={authMode} mode={authMode} busy={busy} run={run} authenticate={async input => {
              if (authMode === 'signup') { await client.signup(input); setAuthMode('signin'); }
              else { await client.signin(input); clearOwnedState(); await readSession(); }
            }} />
          </div>
        </div>
      </Ld.Panel>}

      {authenticated && !tokenHash && <>
        <div className="account-view" hidden={view !== 'overview'}>
          {!authenticated.organizations.length && <Ld.Panel title="Start by naming your organization" sub="Your business profile, campaigns and AI apps belong to an organization you own.">
            <AccountForm label="Create organization" busy={busy || !profiles} submit="Create organization"
              onSubmit={(data, form) => run('Creating organization', async () => {
                const { organization } = await client.createOrganization(String(data.get('name') ?? '').trim());
                setSession(current => current?.authenticated ? { ...current, organizations: [...current.organizations, organization] } : current);
                setOrganizationId(organization.id); setAppId('');
                setDetails({ organization, advertiser: null, apps: [] });
                form.reset();
              }, 'Organization created. You are its owner. Choose a role below to continue.')}>
              <Input label="Organization name" name="name" autoComplete="organization" maxLength={120} />
            </AccountForm>
          </Ld.Panel>}
          {!profiles && <Ld.Callout tone="warning" title="Profiles are not available">Profiles are switched off for this server or session, so campaigns and AI apps cannot be managed here.</Ld.Callout>}
          {organizationId && !details && !busy && <Ld.Callout tone="warning" title="Your organization did not load" actions={<Ld.Button variant="secondary" size="sm" onClick={() => void run('Loading organization', async () => setDetails(await client.organization(organizationId)))}>Reload organization</Ld.Button>}>
            Nothing was changed. Reload to continue.
          </Ld.Callout>}
          {details && profiles && <>
            <div className="account-columns">
              <RoleCard title="Advertise in AI conversations" sub="For businesses" steps={advertiserSteps} href="#advertiser" doneAction="Review activity and spend"
                unavailable={campaignDrafts ? undefined : 'Campaigns are not enabled for this server or session.'} />
              <RoleCard title="Show Sponsored cards in your AI app" sub="For AI app owners" steps={appSteps} href="#app" doneAction="Review deliveries, receipts and earnings"
                unavailable={appCredentials ? undefined : 'Server keys are not enabled for this server or session.'} />
            </div>
            <Ld.Panel title="How money works here" sub={modeName(financialMode)} actions={<Ld.Button variant="secondary" size="sm" href="#wallet">Open wallet →</Ld.Button>}>
              <div className="ld-stack">
                <p className="ld-body">{modeSentence(financialMode)} {walletBindings
                  ? `You can prove wallet ownership here. Transaction broadcasts are ${health?.serving?.broadcastEnabled ? 'enabled, and each one still needs your explicit signature' : 'disabled, so no deposit, payout or refund can be submitted from this server'}.`
                  : 'Own-wallet funding is not enabled on this server.'}</p>
                <MoneyTerms />
              </div>
            </Ld.Panel>
          </>}
        </div>

        <div className="account-view" hidden={view !== 'advertiser'}>
          {!details && <Ld.Empty title="No organization selected" action={<Ld.Button variant="secondary" href="#overview">Go to overview →</Ld.Button>}>Create or choose an organization first.</Ld.Empty>}
          {details && profiles && <>
            <JourneySteps label="Advertiser steps" steps={[
              { href: '#advertiser-profile', title: 'Business profile', note: 'who is advertising', done: Boolean(details.advertiser) },
              { href: '#campaign-editor', title: 'Campaign and creative', note: 'offer, conversations, text', done: Boolean(selectedCampaign) },
              { href: '#campaign-approve', title: 'Approve', note: 'this exact version', done: Boolean(selectedCampaign?.approved) },
              { href: '#campaign-serving', title: 'Turn serving on', note: 'your own switch', done: selectedCampaign?.serving === true },
              { href: '#campaign-activity', title: 'Activity and spend', note: 'placements and receipts', done: false },
            ]} />
            <Ld.Panel id="advertiser-profile" title="Business profile" sub="Who is advertising"
              actions={<span className="ld-tag" data-tone={details.advertiser ? 'success' : 'warning'}>{details.advertiser ? 'Saved' : 'Needed first'}</span>}>
              {details.advertiser ? <div className="ld-stack" key={details.organization.id}>
                <p className="ld-body"><span className="ld-strong">{details.advertiser.name}</span> · {details.advertiser.website}</p>
                {details.advertiser.description && <p className="ld-secondary">{details.advertiser.description}</p>}
                <details className="account-more">
                  <summary>Edit business profile</summary>
                  <AdvertiserForm key={details.advertiser.updatedAt} profile={details.advertiser} busy={busy} run={run}
                    save={async input => {
                      const result = await client.advertiser(details.organization.id, input);
                      setDetails(current => current ? { ...current, advertiser: result.advertiser } : current);
                    }} />
                </details>
              </div> : <AdvertiserForm key={`new-advertiser:${details.organization.id}`} profile={null} busy={busy} run={run}
                save={async input => {
                  const result = await client.advertiser(details.organization.id, input);
                  setDetails(current => current ? { ...current, advertiser: result.advertiser } : current);
                }} />}
            </Ld.Panel>
            {campaignDrafts ? <CampaignResources key={`campaigns:${authenticated.user.id}:${details.organization.id}`}
              client={client} organizationId={details.organization.id} advertiserReady={Boolean(details.advertiser)} busy={busy} run={run}
              onUnauthorized={expireOwnedSession} servingReady={servingReady} financialMode={financialMode}
              brand={details.advertiser ? { name: details.advertiser.name, website: details.advertiser.website } : null} onSummary={setCampaignSummary} />
              : <Ld.Callout tone="warning" title="Campaigns are not available">Campaigns are not enabled for this server or session. Your business profile is saved and nothing else can be created here.</Ld.Callout>}
          </>}
        </div>

        <div className="account-view" hidden={view !== 'app'}>
          {!details && <Ld.Empty title="No organization selected" action={<Ld.Button variant="secondary" href="#overview">Go to overview →</Ld.Button>}>Create or choose an organization first.</Ld.Empty>}
          {details && profiles && <>
            <JourneySteps label="AI app steps" steps={[
              { href: '#ai-apps', title: 'App profile and rules', note: 'origins and categories', done: Boolean(selectedApp) },
              { href: '#app-credentials', title: 'Server key', note: 'shown once', done: Boolean(appFacts?.activeKeys) },
              { href: '#app-integrate', title: 'Connect and check', note: 'API base and readiness', done: appFacts?.ready === true },
              { href: '#app-report', title: 'Deliveries and earnings', note: 'receipts per placement', done: false },
            ]} />
            <Ld.Panel id="ai-apps" title={selectedApp ? selectedApp.name : 'New AI app'} sub="App profile and ad rules"
              actions={<div className="account-org">
                <label htmlFor="account-app">AI app</label>
                <select className="ld-select" id="account-app" value={appId} disabled={busy} onChange={event => { setAppId(event.target.value); setError(''); }}>
                  {details.apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                  <option value="">Create a new AI app</option>
                </select>
              </div>}>
              <AppForm key={`${selectedApp?.id ?? 'new'}:${selectedApp?.updatedAt ?? ''}`} app={selectedApp} busy={busy} run={run}
                save={async input => {
                  const { app } = await client.app(details.organization.id, input, selectedApp?.id);
                  setDetails(current => current ? { ...current, apps: current.apps.some(existing => existing.id === app.id) ? current.apps.map(existing => existing.id === app.id ? app : existing) : [...current.apps, app] } : current);
                  setAppId(app.id);
                }} />
            </Ld.Panel>
            {unenforceable.length > 0 && <Ld.Callout tone="warning" title="Some category rules cannot be enforced">
              {unenforceable.join(', ')}: AXP can only enforce the listed product categories. Ad serving for this app stays off until you remove {unenforceable.length === 1 ? 'this entry' : 'these entries'} and save.
            </Ld.Callout>}
            {!selectedApp && <Ld.Empty title="Save the app profile to continue">The server key, the integration example, the readiness check and your deliveries appear here once the app exists.</Ld.Empty>}
            {selectedApp && (appCredentials ? <AppCredentials key={`credentials:${authenticated.user.id}:${details.organization.id}:${selectedApp.id}`}
              client={client} organizationId={details.organization.id} app={selectedApp} busy={busy} run={run}
              issue={showIssuedCredential} dismissKey={clearResourceSecret} onUnauthorized={expireOwnedSession} servingReady={servingReady} financialMode={financialMode} onSummary={setAppSummary}
              rawKey={issuedKey?.organizationId === details.organization.id && issuedKey.appId === selectedApp.id ? issuedKey.apiKey : null} />
              : <Ld.Callout tone="warning" title="Server keys are not available">Server keys are not enabled for this server or session, so this app cannot be connected from here.</Ld.Callout>)}
            {selectedApp && <OwnerReport key={`report:${authenticated.user.id}:${details.organization.id}:${selectedApp.id}`} client={client}
              organizationId={details.organization.id} resourceId={selectedApp.id} kind="app" ready={servingReady} busy={busy}
              onUnauthorized={expireOwnedSession} />}
          </>}
        </div>

        <div className="account-view" hidden={view !== 'wallet'}>
          <Ld.Panel title="Four things that are never the same" sub={modeName(financialMode)}>
            <div className="ld-stack">
              <MoneyTerms />
              <p className="ld-secondary">A receipt proves an accepted insertion with the Sponsored label. It does not prove attention, clicks or conversion, and by itself it is not a payment.</p>
            </div>
          </Ld.Panel>
          {!details && <Ld.Empty title="No organization selected" action={<Ld.Button variant="secondary" href="#overview">Go to overview →</Ld.Button>}>Create or choose an organization first.</Ld.Empty>}
          {details && !walletBindings && <Ld.Callout tone="warning" title="Own-wallet funding is not enabled on this server">
            {modeSentence(financialMode)} Wallet ownership proofs, deposits, payouts and refunds cannot be made here. The spend and earnings in your reports are {financialMode === 'devnet' ? 'accepted charges that have not been paid out from this page' : 'simulated ledger entries'}.
          </Ld.Callout>}
          {details && walletBindings && <Ld.Panel id="own-wallet-funding" title="Your wallets and channels" sub="Each step needs your own explicit action">
            <AccountFinancialResources key={`finance:${authenticated.user.id}:${details.organization.id}`} client={client}
              organizationId={details.organization.id} apps={details.apps} ready={walletBindings}
              broadcastEnabled={health?.serving?.broadcastEnabled === true} busy={busy} onUnauthorized={expireOwnedSession} />
          </Ld.Panel>}
        </div>

        <div className="account-view" hidden={view !== 'settings'}>
          <div className="account-columns">
            <Ld.Panel id="personal-profile" title="Your profile" sub={authenticated.user.email}>
              <AccountForm key={`${authenticated.user.id}:${authenticated.user.displayName}`} label="Personal profile" busy={busy || !profiles}
                submit="Save display name" onSubmit={data => run('Saving display name', async () => {
                  const result = await client.profile(String(data.get('displayName') ?? '').trim());
                  setSession(current => current?.authenticated ? { ...current, user: result.user } : current);
                }, 'Display name saved.')}>
                <Input label="Display name" name="displayName" value={authenticated.user.displayName} autoComplete="nickname" required={false} maxLength={120} />
              </AccountForm>
            </Ld.Panel>
            <Ld.Panel id="organizations" title="Organizations" sub="You own every organization listed here">
              <div className="ld-stack-lg">
                {authenticated.organizations.length ? <ul className="account-plain-list">
                  {authenticated.organizations.map(org => <li key={org.id}><span className="ld-body ld-strong">{org.name}</span><span className="ld-secondary">{org.id === organizationId ? 'Selected. ' : ''}Owner</span></li>)}
                </ul> : <p className="ld-secondary">No organizations yet. Create one to add a business profile or an AI app.</p>}
                <AccountForm label="Create another organization" busy={busy || !profiles} submit="Create organization" variant="secondary"
                  onSubmit={(data, form) => run('Creating organization', async () => {
                    const { organization } = await client.createOrganization(String(data.get('name') ?? '').trim());
                    setSession(current => current?.authenticated ? { ...current, organizations: [...current.organizations, organization] } : current);
                    setOrganizationId(organization.id); setAppId('');
                    setDetails({ organization, advertiser: null, apps: [] });
                    form.reset();
                  }, 'Organization created and selected. You are its owner.')}>
                  <Input label="New organization name" name="name" autoComplete="organization" maxLength={120} />
                </AccountForm>
              </div>
            </Ld.Panel>
          </div>
        </div>
      </>}

      {(!signedIn || view === 'settings') && health && <Ld.Panel id="account-readiness" title="What this server can do" sub="Read from the server, not assumed">
        <div className="ld-stack">
          <dl className="account-readiness">
            <div><dt>Account service</dt><dd>{!isConfigured(health) ? 'Not configured' : !health.enabled ? 'Switched off' : 'Running'}</dd></div>
            <div><dt>Profile storage</dt><dd>{health.profileStore === 'supabase' ? 'AXP Supabase PostgreSQL' : health.profileStore === 'sqlite-fixture' ? 'Local fixture store (test data only)' : 'Not verified'}</dd></div>
            <div><dt>Profiles</dt><dd>{!ready ? 'Unavailable' : !health.capabilities.profiles ? 'Switched off by the server' : !authenticated ? 'Sign in required' : profiles ? 'Available' : 'Switched off for this session'}</dd></div>
            <div><dt>Campaigns</dt><dd>{campaignDrafts ? 'Available. Approval never starts serving.' : !authenticated ? 'Sign in required' : 'Not enabled for this server or session'}</dd></div>
            <div><dt>Server keys for AI apps</dt><dd>{appCredentials ? 'Available' : !authenticated ? 'Sign in required' : 'Not enabled for this server or session'}</dd></div>
            <div><dt>Ad serving</dt><dd>{!ready ? 'Unavailable' : !health.capabilities.campaignServing ? 'Not connected' : !authenticated ? `Connected (${modeName(financialMode).toLowerCase()}). Sign in required.` : `Connected (${modeName(financialMode).toLowerCase()}). Each campaign must be turned on by its owner.`}</dd></div>
            <div><dt>Wallet ownership proofs</dt><dd>{walletBindings ? 'Available for each campaign and AI app' : 'Not enabled on this server or session'}</dd></div>
            <div><dt>Deposits, payouts and refunds</dt><dd>{financialMode === 'devnet' && walletBindings ? health.serving?.broadcastEnabled ? 'Own-wallet signatures on Solana Devnet, by explicit action only' : 'Unavailable: transaction broadcast is disabled on this server' : 'Not connected. Nothing here can move funds.'}</dd></div>
          </dl>
          <p className="ld-secondary">Allowed origins, blocked categories and payout addresses saved in a profile are declarations. They do not prove wallet ownership or authorize a payment. Server keys never sign transactions. Creating an account gives no ownership of the shared demonstration, its campaigns, wallets or records.</p>
        </div>
      </Ld.Panel>}
    </Ld.Shell>
  </div>;
}
