'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, AccountsClient, isConfigured } from './client';
import { consumeConfirmationLink } from './forms';
import { AccountForm, AdvertiserForm, AppForm, AuthForm, Input, type RunAction } from './AccountForms';
import { AppCredentials, CampaignResources, type AppSummary, type AppTab, type CampaignSummary } from './newResourceForms';
import { OwnerReport } from './servingResources';
import { AccountFinancialResources } from './financialResources';
import type { AccountHealth, AccountSession, AppCredential, IssuedAppCredential, OrganizationDetails } from './types';
import { modeName } from './format';
import { destinations } from '../shared/mode';
import { campaignCapabilities } from './resourceForms';
import { accountViews as views, accountViewForFragment, type AccountView as View } from './navigation';

const pages: Record<View, { nav: string; title: string; sub: string }> = {
  overview: { nav: 'Home', title: 'Home', sub: 'Pick up where you left off.' },
  advertiser: { nav: 'Your campaigns', title: 'Your campaigns', sub: 'Reach people in AI conversations with a labelled Sponsored card below the answer.' },
  app: { nav: 'Your AI apps', title: 'Your AI apps', sub: 'Show a labelled Sponsored card below your own answers and see every accepted placement.' },
  wallet: { nav: 'Wallet', title: 'Wallet', sub: 'Verify your wallet and review deposits, charges, payouts and refunds.' },
  settings: { nav: 'Settings', title: 'Settings', sub: 'Your profile and organizations.' },
};
const unavailable = 'Account sign in is unavailable right now. Try again in a few minutes.';
const appTabForSection: Record<string, AppTab> = { 'ai-apps': 'settings', 'app-credentials': 'keys', 'app-integrate': 'connect', 'app-readiness': 'connect', 'app-report': 'deliveries' };
const appTabs: Array<{ key: AppTab; label: string }> = [{ key: 'connect', label: 'Connect' }, { key: 'keys', label: 'API keys' }, { key: 'deliveries', label: 'Deliveries' }, { key: 'settings', label: 'App settings' }];

type Step = { label: string; done: boolean; action: string };
/** One role the person already uses: where it stands and its single next action. */
function RoleRow({ title, status, steps, href, doneAction, primary, unavailable: blocked }: { title: string; status: string; steps: Step[]; href: string; doneAction: string; primary: boolean; unavailable?: string }) {
  const next = steps.find(step => !step.done);
  return <div className="account-role-row">
    <div>
      <h3 className="ld-card-title">{title}</h3>
      <p className="ld-secondary">{status}</p>
    </div>
    {blocked ? <span className="ld-secondary">{blocked}</span> : <div className="account-role-next">
      <span><span className="ld-caption">{next ? 'Next' : 'All set'}</span><span className="ld-body ld-strong">{next ? next.action : doneAction}</span></span>
      <Ld.Button variant={primary ? 'primary' : 'secondary'} href={href}>{next ? 'Continue →' : 'Open →'}</Ld.Button>
    </div>}
  </div>;
}
function progress(steps: Step[]) {
  const next = steps.findIndex(step => !step.done);
  return steps.map((step, index) => ({ title: step.label, state: step.done ? 'done' as const : index === next ? 'current' as const : 'todo' as const }));
}

/** The four money facts that must never be confused with one another. */
function MoneyTerms() {
  return <ul className="account-money">
    <li><b>Wallet verification</b><span>A signed message that shows you control a wallet. It sends no funds.</span></li>
    <li><b>Deposit</b><span>Test funds an advertiser sets aside for one AI app. Not spend.</span></li>
    <li><b>Accepted charge</b><span>Added when an AI app confirms a Sponsored card was shown. Owed, not yet paid out.</span></li>
    <li><b>Payout and refund</b><span>When a channel closes, the app is paid the accepted total and the advertiser gets the rest back. Two separate amounts.</span></li>
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
  const [intent, setIntent] = useState<'advertiser' | 'app' | null>(null);
  const [appTab, setAppTab] = useState<AppTab>('connect');
  const [section, setSection] = useState('');
  const chosenAppTab = useRef('');
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
      if (name === 'create') setAuthMode('signup');
      setSection(name);
      if (appTabForSection[name]) { chosenAppTab.current = '*'; setAppTab(appTabForSection[name]); }
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
    if (accountViewForFragment(fragment) === view && fragment !== `#${view}`) {
      const target = document.getElementById(fragment.slice(1));
      const disclosure = target?.closest('details');
      if (disclosure) disclosure.open = true;
      target?.scrollIntoView({block: 'start'});
    }
  }, [view, signedIn, busy, appId]);
  const unenforceable = selectedApp?.blockedCategories.filter(entry => !(campaignCapabilities as readonly string[]).includes(entry)) ?? [];
  const advertiserSteps: Step[] = [
    { label: 'Business profile', done: Boolean(details?.advertiser), action: 'Create your business profile' },
    { label: 'Campaign', done: Boolean(campaignFacts?.total), action: 'Create your first campaign' },
    { label: 'Approve', done: Boolean(campaignFacts?.approved), action: 'Review and approve your campaign' },
    { label: 'Go live', done: Boolean(campaignFacts?.serving), action: 'Turn on an approved campaign' },
  ];
  const appSteps: Step[] = [
    { label: 'Add your app', done: Boolean(details?.apps.length), action: 'Add your AI app' },
    { label: 'Get your API key', done: Boolean(appFacts?.activeKeys), action: 'Get your API key' },
    { label: 'Connect your app', done: appFacts?.ready === true, action: unenforceable.length ? 'Fix the ad rules for your app' : 'Connect your app' },
  ];
  // Open the tab that holds this app's next step, once per app, unless the person already chose one.
  const appFactsKnown = Boolean(appFacts && appFacts.activeKeys !== null && (appFacts.ready !== null || !servingReady || appFacts.activeKeys === 0));
  useEffect(() => {
    if (!selectedApp || !appFacts || !appFactsKnown || chosenAppTab.current === '*' || chosenAppTab.current === selectedApp.id) return;
    chosenAppTab.current = selectedApp.id;
    setAppTab(!appFacts.activeKeys ? 'keys' : appFacts.ready === true ? 'deliveries' : 'connect');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedApp?.id, appFactsKnown]);
  const advertiserInUse = Boolean(details?.advertiser || campaignFacts?.total);
  const appInUse = Boolean(details?.apps.length);
  const advertiserNext = advertiserSteps.some(step => !step.done), appNext = appSteps.some(step => !step.done);
  const balance = financialMode === 'devnet' ? 'Solana Devnet · test USDC · no real money' : 'Test balance · no real money';
  const createOrganization = (name: string, then?: 'advertiser' | 'app' | null) => run('Creating organization', async () => {
    const { organization } = await client.createOrganization(name);
    setSession(current => current?.authenticated ? { ...current, organizations: [...current.organizations, organization] } : current);
    setOrganizationId(organization.id); setAppId('');
    setDetails({ organization, advertiser: null, apps: [] });
    if (then) window.location.hash = then;
  }, 'Organization created.');
  const signOut = () => void run('Signing out', async () => {
    await client.signout();
    clearOwnedState();
    setSession({ authenticated: false });
  }, 'Signed out.');
  const selectedCampaign = campaignFacts?.selected ?? null;
  return <div className="account-console"
    onClickCapture={event => { if (event.target instanceof Element && event.target.closest('button, a, summary')) clearResourceSecret(); }}
    onSubmitCapture={clearResourceSecret} onChangeCapture={clearResourceSecret}>
    <Ld.Shell
      top={<Ld.TopBar brand={<Ld.Wordmark />}
        run={<Ld.Context kind="account" label="Your account" detail={signedIn ? details?.organization.name ?? authenticated?.user.email : 'Private to you'} />}
        chips={ready ? <Ld.Tag tone="outline">{balance}</Ld.Tag> : undefined}
        actions={<>
          {authenticated && <span className="account-who" title={authenticated.user.email}>{authenticated.user.displayName || authenticated.user.email}</span>}
          {authenticated ? <Ld.Button variant="secondary" disabled={busy} onClick={signOut}>Sign out</Ld.Button>
            : <Ld.Button variant="ghost" href={destinations.demoDashboard.href}>View the shared demo →</Ld.Button>}
        </>} />}
      side={<Ld.SideNav groups={[
        { label: 'Your account', items: signedIn ? [
          { href: '#overview', label: pages.overview.nav, current: view === 'overview' },
          { href: '#advertiser', label: pages.advertiser.nav, current: view === 'advertiser', meta: campaignFacts ? String(campaignFacts.total) : undefined },
          { href: '#app', label: pages.app.nav, current: view === 'app', meta: details ? String(details.apps.length) : undefined },
          { href: '#wallet', label: pages.wallet.nav, current: view === 'wallet' },
          { href: '#settings', label: pages.settings.nav, current: view === 'settings' },
        ] : [{ href: '#overview', label: 'Sign in', current: true }] },
        { label: 'Shared demo', items: [
          { href: destinations.demoDashboard.href, label: `${destinations.demoDashboard.label} →` },
          { href: destinations.exampleChat.href, label: `${destinations.exampleChat.label} →` },
          { href: destinations.sdkGuide.href, label: `${destinations.sdkGuide.label} →` },
        ] },
      ]} foot={<><strong>Your account</strong><p>{ready ? `${balance}.` : 'Private to you.'}</p></>} />}>
      <Ld.PageBar title={signedIn ? page.title : authMode === 'signup' ? 'Create your account' : 'Sign in'} sub={signedIn ? page.sub : 'Your campaigns and AI apps, private to you.'}
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
      {error && <div className="account-error" role="alert" tabIndex={-1} ref={errorNode}>{error}{signedIn && /Refresh account/.test(error) && <> <button type="button" className="account-inline-action" disabled={busy} onClick={() => void run('Refreshing account', refresh)}>Refresh account</button></>}</div>}

      {((!health && !busy) || (health && !ready)) && <Ld.Notice tone="blocked" title={unavailable}
        actions={<Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Checking again', refresh)}>Try again</Ld.Button>} />}
      {ready && !session && !busy && <Ld.Notice tone="blocked" title="We could not check whether you are signed in."
        actions={<Ld.Button variant="secondary" onClick={() => void run('Checking again', refresh)}>Try again</Ld.Button>} />}

      {tokenHash && <Ld.Panel title="Confirm your email">
        <div className="ld-stack">
          <p className="ld-body">You opened an email confirmation link. Nothing has been submitted. Confirming signs you in to the account for this link{authenticated ? ' and signs you out of the current one' : ''}.</p>
          <p className="ld-secondary">If you reload this page, open the link from your email again.</p>
          <div className="ld-row">
            <Ld.Button disabled={busy || !ready} onClick={() => void run('Confirming email', async () => {
              await client.confirm(tokenHash);
              setTokenHash(null);
              clearOwnedState();
              await readSession();
            }, 'Email confirmed. You are signed in.')}>Confirm email</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy} onClick={() => { setTokenHash(null); setError(''); }}>Discard link</Ld.Button>
          </div>
        </div>
      </Ld.Panel>}

      {ready && session?.authenticated === false && !tokenHash && <Ld.Panel>
        <div className="account-welcome">
          <div className="ld-stack-lg">
            <div className="account-intro">
              <h2>{authMode === 'signup' ? 'Create your AXP account' : 'Welcome to AXP'}</h2>
              <p className="ld-secondary">Your campaigns and AI apps, in one place.</p>
            </div>
            <ul className="account-plain-list account-welcome-roles">
              <li><span className="ld-body ld-strong">For advertisers</span><span className="ld-secondary">Create campaigns and see where they appear.</span></li>
              <li><span className="ld-body ld-strong">For AI apps</span><span className="ld-secondary">Connect your app and see every accepted placement.</span></li>
            </ul>
            <p className="account-mode-note">{financialMode === 'synthetic' ? 'Test balances only. No real money moves.' : 'Solana Devnet test tokens only. Every payment needs your own signature.'}</p>
            <p className="account-mode-note">Looking for the public example? <a className="ld-link" href={destinations.demoDashboard.href}>View the shared demo →</a></p>
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
          {!profiles && <Ld.Notice tone="blocked" title="Campaigns and AI apps are not available yet." />}
          {organizationId && !details && !busy && <Ld.Notice tone="blocked" title="Your organization did not load. Nothing was changed."
            actions={<Ld.Button variant="secondary" onClick={() => void run('Loading organization', async () => setDetails(await client.organization(organizationId)))}>Reload</Ld.Button>} />}
          {profiles && (!authenticated.organizations.length || (details && !advertiserInUse && !appInUse)) && <Ld.Panel>
            <div className="account-start">
              <div className="account-intro">
                <h2>What would you like to do?</h2>
                <p className="ld-secondary">Pick one to start. You can add the other at any time.</p>
              </div>
              <div className="ld-choices" role="group" aria-label="Choose how you will use AXP">
                {details ? <>
                  <a className="ld-choice" href="#advertiser"><b>Advertise in AI conversations</b><span>Show your offer as a labelled Sponsored card below relevant answers.</span><em>Create your business profile →</em></a>
                  <a className="ld-choice" href="#app"><b>Earn from my AI app</b><span>Show a Sponsored card below your own answers and track each placement.</span><em>Add your AI app →</em></a>
                </> : <>
                  <button type="button" className="ld-choice" aria-pressed={intent === 'advertiser'} onClick={() => setIntent('advertiser')}><b>Advertise in AI conversations</b><span>Show your offer as a labelled Sponsored card below relevant answers.</span></button>
                  <button type="button" className="ld-choice" aria-pressed={intent === 'app'} onClick={() => setIntent('app')}><b>Earn from my AI app</b><span>Show a Sponsored card below your own answers and track each placement.</span></button>
                </>}
              </div>
              {!details && intent && <div className="account-start-next">
                <AccountForm label="Name your organization" busy={busy} submit="Continue →"
                  onSubmit={data => createOrganization(String(data.get('name') ?? '').trim(), intent)}>
                  <Input label="Name your organization" name="name" autoComplete="organization" maxLength={120}
                    hint={intent === 'advertiser' ? 'Usually your company. Your campaigns belong to it.' : 'Usually your company. Your AI apps belong to it.'} />
                </AccountForm>
              </div>}
            </div>
          </Ld.Panel>}
          {details && profiles && (advertiserInUse || appInUse) && <Ld.Panel flush>
            {advertiserInUse && <RoleRow title="Advertising" href="#advertiser" steps={advertiserSteps} doneAction="See results"
              primary={advertiserNext || !appNext || !appInUse}
              status={campaignFacts ? `${campaignFacts.total} campaign${campaignFacts.total === 1 ? '' : 's'} · ${campaignFacts.serving} live` : details.advertiser?.name ?? 'Business profile saved'}
              unavailable={campaignDrafts ? undefined : 'Campaigns are not available yet.'} />}
            {appInUse && <RoleRow title="AI apps" href="#app" steps={appSteps} doneAction="See deliveries"
              primary={!advertiserInUse || (!advertiserNext && appNext)}
              status={`${details.apps.length} app${details.apps.length === 1 ? '' : 's'}${appFacts?.activeKeys ? ` · ${appFacts.activeKeys} active API key${appFacts.activeKeys === 1 ? '' : 's'}` : ''}`}
              unavailable={appCredentials ? undefined : 'API keys are not available yet.'} />}
            <p className="account-also">{!advertiserInUse ? <>Also want to advertise? <a className="ld-link" href="#advertiser">Create your business profile →</a></>
              : !appInUse ? <>Also have an AI app? <a className="ld-link" href="#app">Add your AI app →</a></>
                : <>Balances here are {financialMode === 'devnet' ? 'test tokens' : 'test balances'}. No real money moves. <a className="ld-link" href="#wallet">Wallet →</a></>}</p>
          </Ld.Panel>}
        </div>

        <div className="account-view" hidden={view !== 'advertiser'}>
          {!details && <Ld.Empty title="Start from Home" action={<Ld.Button variant="secondary" href="#overview">Go to Home →</Ld.Button>}>Name your organization first.</Ld.Empty>}
          {details && profiles && <>
            {advertiserNext && <Ld.Steps label="Advertiser progress" steps={progress(advertiserSteps)} />}
            {!details.advertiser ? <Ld.Panel id="advertiser-profile" title="Create your business profile" sub="Your name and website appear on your Sponsored card.">
              <AdvertiserForm key={`new-advertiser:${details.organization.id}`} profile={null} busy={busy} run={run}
                save={async input => {
                  const result = await client.advertiser(details.organization.id, input);
                  setDetails(current => current ? { ...current, advertiser: result.advertiser } : current);
                }} />
            </Ld.Panel> : <details className="account-summary-bar" id="advertiser-profile" key={details.organization.id}>
              <summary><span><b>{details.advertiser.name}</b><span className="ld-secondary">{details.advertiser.website}</span></span><span className="account-summary-edit">Edit business profile</span></summary>
              <div className="account-summary-body">
                <AdvertiserForm key={details.advertiser.updatedAt} profile={details.advertiser} busy={busy} run={run}
                  save={async input => {
                    const result = await client.advertiser(details.organization.id, input);
                    setDetails(current => current ? { ...current, advertiser: result.advertiser } : current);
                  }} />
              </div>
            </details>}
            {details.advertiser && (campaignDrafts ? <CampaignResources key={`campaigns:${authenticated.user.id}:${details.organization.id}`}
              client={client} organizationId={details.organization.id} advertiserReady={Boolean(details.advertiser)} busy={busy} run={run}
              onUnauthorized={expireOwnedSession} servingReady={servingReady} financialMode={financialMode} section={section}
              brand={details.advertiser ? { name: details.advertiser.name, website: details.advertiser.website } : null} onSummary={setCampaignSummary} />
              : <Ld.Notice tone="blocked" title="Campaigns are not available yet.">Your business profile is saved.</Ld.Notice>)}
          </>}
        </div>

        <div className="account-view" hidden={view !== 'app'}>
          {!details && <Ld.Empty title="Start from Home" action={<Ld.Button variant="secondary" href="#overview">Go to Home →</Ld.Button>}>Name your organization first.</Ld.Empty>}
          {details && profiles && <>
            {appNext && <Ld.Steps label="AI app progress" steps={progress(appSteps)} />}
            {!selectedApp ? <Ld.Panel id="ai-apps" title="Add your AI app" sub="Tell us where your app runs. You get an API key next."
              actions={details.apps.length ? <Ld.Button variant="ghost" size="sm" disabled={busy} onClick={() => setAppId(details.apps[0].id)}>Cancel</Ld.Button> : undefined}>
              <AppForm key="new" app={undefined} busy={busy} run={run}
                save={async input => {
                  const { app } = await client.app(details.organization.id, input);
                  setDetails(current => current ? { ...current, apps: [...current.apps, app] } : current);
                  setAppId(app.id);
                }} />
            </Ld.Panel> : <>
              <div className="account-app-head">
                <div className="account-app-id">
                  {details.apps.length > 1 ? <div className="account-org">
                    <label htmlFor="account-app">AI app</label>
                    <select className="ld-select" id="account-app" value={appId} disabled={busy} onChange={event => { chosenAppTab.current = ''; setAppId(event.target.value); setError(''); }}>
                      {details.apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                    </select>
                  </div> : <h2 className="ld-section-title">{selectedApp.name}</h2>}
                  <span className="ld-secondary">{selectedApp.website}</span>
                </div>
                <Ld.Button variant="ghost" size="sm" disabled={busy} onClick={() => { setAppId(''); setError(''); }}>Add another app</Ld.Button>
              </div>
              {unenforceable.length > 0 && <Ld.Notice tone="blocked" title="Some ad rules cannot be applied, so ads stay off for this app."
                actions={<Ld.Button variant="secondary" onClick={() => { chosenAppTab.current = '*'; setAppTab('settings'); }}>Fix ad rules</Ld.Button>}>
                Remove {unenforceable.join(', ')} from the categories you will not show, then save.
              </Ld.Notice>}
              <Ld.TabBar label={`${selectedApp.name} sections`} idBase="app" tabs={appTabs} value={appTab} onChange={tab => { chosenAppTab.current = '*'; setAppTab(tab); }} />
              {appCredentials ? <AppCredentials key={`credentials:${authenticated.user.id}:${details.organization.id}:${selectedApp.id}`}
                client={client} organizationId={details.organization.id} app={selectedApp} busy={busy} run={run} tab={appTab}
                issue={showIssuedCredential} dismissKey={clearResourceSecret} onUnauthorized={expireOwnedSession} servingReady={servingReady} financialMode={financialMode} onSummary={setAppSummary}
                rawKey={issuedKey?.organizationId === details.organization.id && issuedKey.appId === selectedApp.id ? issuedKey.apiKey : null} />
                : (appTab === 'keys' || appTab === 'connect') && <Ld.Notice tone="blocked" title="API keys are not available yet.">Your app is saved. You can connect it once keys are available.</Ld.Notice>}
              <div role="tabpanel" id="app-panel-deliveries" aria-labelledby="app-tab-deliveries" hidden={appTab !== 'deliveries'}>
                <OwnerReport key={`report:${authenticated.user.id}:${details.organization.id}:${selectedApp.id}`} client={client}
                  organizationId={details.organization.id} resourceId={selectedApp.id} kind="app" ready={servingReady} busy={busy}
                  onUnauthorized={expireOwnedSession} />
              </div>
              <div role="tabpanel" id="app-panel-settings" aria-labelledby="app-tab-settings" hidden={appTab !== 'settings'}>
                <Ld.Panel id="ai-apps" title="App settings" sub="Where your app runs and which ads it will not show">
                  <AppForm key={`${selectedApp.id}:${selectedApp.updatedAt}`} app={selectedApp} busy={busy} run={run}
                    save={async input => {
                      const { app } = await client.app(details.organization.id, input, selectedApp.id);
                      setDetails(current => current ? { ...current, apps: current.apps.map(existing => existing.id === app.id ? app : existing) } : current);
                      setAppId(app.id);
                    }} />
                </Ld.Panel>
              </div>
            </>}
          </>}
        </div>

        <div className="account-view" hidden={view !== 'wallet'}>
          {!details && <Ld.Empty title="Start from Home" action={<Ld.Button variant="secondary" href="#overview">Go to Home →</Ld.Button>}>Name your organization first.</Ld.Empty>}
          {details && !walletBindings && <Ld.Panel title="Payments are not available yet" sub={balance}>
            <div className="ld-stack">
              <p className="ld-body">Spend and earnings in your reports are {financialMode === 'devnet' ? 'accepted charges in test tokens. Nothing has been paid out' : 'test balances. No real money moves'}.</p>
              <ul className="account-pay-actions">
                <li><span><b>Advertiser deposits</b><span className="ld-secondary">Set funds aside for a campaign.</span></span><Ld.Button variant="secondary" disabled>Add funds</Ld.Button></li>
                <li><span><b>AI app payouts</b><span className="ld-secondary">Receive what your app has earned.</span></span><Ld.Button variant="secondary" disabled>Withdraw earnings</Ld.Button></li>
              </ul>
            </div>
          </Ld.Panel>}
          {details && walletBindings && <Ld.Panel id="own-wallet-funding" title="Your wallets and channels" sub={balance}>
            <AccountFinancialResources key={`finance:${authenticated.user.id}:${details.organization.id}`} client={client}
              organizationId={details.organization.id} apps={details.apps} ready={walletBindings}
              broadcastEnabled={health?.serving?.broadcastEnabled === true} busy={busy} onUnauthorized={expireOwnedSession} />
          </Ld.Panel>}
          {details && <details className="account-disclosure">
            <summary>What each money term means</summary>
            <div className="ld-stack">
              <MoneyTerms />
              <p className="ld-secondary">A receipt shows that a Sponsored card was shown with its label. It does not show attention, clicks or sales, and it is not a payment.</p>
            </div>
          </details>}
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
                </ul> : <p className="ld-secondary">No organizations yet.</p>}
                <details className="account-more">
                  <summary>Add another organization</summary>
                  <AccountForm label="Create another organization" busy={busy || !profiles} submit="Create organization" variant="secondary"
                    onSubmit={(data, form) => createOrganization(String(data.get('name') ?? '').trim()).then(() => form.reset())}>
                    <Input label="New organization name" name="name" autoComplete="organization" maxLength={120} />
                  </AccountForm>
                </details>
              </div>
            </Ld.Panel>
          </div>
          <div className="account-settings-foot">
            <span className="ld-secondary">Something look out of date?</span>
            <Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Refreshing account', refresh)}>Refresh account</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy} onClick={signOut}>Sign out</Ld.Button>
          </div>
        </div>
      </>}
    </Ld.Shell>
  </div>;
}
