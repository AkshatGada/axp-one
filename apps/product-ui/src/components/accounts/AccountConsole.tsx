'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, AccountsClient, isConfigured } from './client';
import { consumeConfirmationLink } from './forms';
import { AccountForm, AdvertiserForm, AppForm, AuthForm, Input, type RunAction } from './AccountForms';
import { AppCredentials, CampaignResources } from './newResourceForms';
import type { AccountHealth, AccountSession, AppCredential, IssuedAppCredential, OrganizationDetails } from './types';

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
    window.addEventListener('popstate', clearOnNavigation);
    window.addEventListener('hashchange', clearOnNavigation);
    window.addEventListener('pagehide', clearOnNavigation);
    window.addEventListener('beforeunload', clearOnNavigation);
    return () => {
      mounted.current = false;
      secretEpoch.current++;
      setIssuedKey(null);
      window.removeEventListener('popstate', clearOnNavigation);
      window.removeEventListener('hashchange', clearOnNavigation);
      window.removeEventListener('pagehide', clearOnNavigation);
      window.removeEventListener('beforeunload', clearOnNavigation);
    };
    // Initial reads only. All mutations require an explicit form or button action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (error) errorNode.current?.focus(); }, [error]);

  const selectedApp = details?.apps.find(app => app.id === appId);
  return <div className="account-console"
    onClickCapture={event => { if (event.target instanceof Element && event.target.closest('button, a, summary')) clearResourceSecret(); }}
    onSubmitCapture={clearResourceSecret} onChangeCapture={clearResourceSecret}>
    <Ld.Shell
      top={<Ld.TopBar brand={<Ld.Wordmark />} chips={<Ld.Tag tone="outline">Account · owned resources</Ld.Tag>}
        actions={<>
          <Ld.Button variant="secondary" disabled={busy} onClick={() => void run('Refreshing account', refresh)}>Refresh account</Ld.Button>
          {authenticated && <Ld.Button variant="ghost" disabled={busy} onClick={() => void run('Signing out', async () => {
            await client.signout();
            clearOwnedState();
            setSession({ authenticated: false });
          }, 'Signed out.')}>Sign out</Ld.Button>}
        </>} />}
      side={<Ld.SideNav groups={[{ label: 'Account', items: [
        { href: '#main', label: 'Overview' },
        ...(authenticated ? [{ href: '#personal-profile', label: 'Personal profile' }, { href: '#organizations', label: 'Organizations' }] : []),
        ...(details && profiles ? [{ href: '#advertiser-profile', label: 'Advertiser profile' }, { href: '#ai-apps', label: 'AI apps' }] : []),
        ...(details && campaignDrafts ? [{ href: '#owned-campaigns', label: 'Campaign drafts' }] : []),
        ...(selectedApp && appCredentials ? [{ href: '#app-credentials', label: 'SDK credentials' }] : []),
        { href: '#account-readiness', label: 'Capabilities' },
      ] }]} foot="Your organizations and profiles are separate from the shared product demo." />}>
      <Ld.PageBar title="Your account" sub="Manage your identity, organizations, private campaign drafts and server-side app credentials. Serving and funding are not connected." />

      <div className="account-feedback" aria-live="polite" aria-atomic="true" role="status">
        {busy ? `${busyLabel}…` : notice}
      </div>
      {error && <div className="account-error" role="alert" tabIndex={-1} ref={errorNode}>{error}</div>}

      {!health && !busy && <Ld.Panel title="Account service unavailable">
        <p className="ld-body">The account API could not be reached or returned an invalid response. No authenticated state has been assumed. Check the server, then select Refresh account.</p>
      </Ld.Panel>}
      {health && !ready && <Ld.Panel title={!isConfigured(health) ? 'Accounts are not configured' : 'Accounts are disabled'}>
        <p className="ld-body">{!isConfigured(health) ? 'The account origin, Supabase provider or private profile store is not configured on this server.' : 'The account service has not been enabled on this server.'} Sign-up, sign-in and profile changes are unavailable. No demo identity or simulated sign-in is provided.</p>
      </Ld.Panel>}
      {ready && !session && !busy && <Ld.Panel title="Session could not be checked">
        <p className="ld-body">Select Refresh account to check your session before continuing.</p>
      </Ld.Panel>}

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
            }, 'Email confirmed. Session checked. Serving and funding remain unavailable.')}>Confirm email</Ld.Button>
            <Ld.Button variant="secondary" disabled={busy} onClick={() => { setTokenHash(null); setError(''); }}>Discard link</Ld.Button>
          </div>
        </div>
      </Ld.Panel>}

      {ready && session?.authenticated === false && !tokenHash && <Ld.Panel title={authMode === 'signin' ? 'Sign in' : 'Create your account'}>
        <div className="ld-stack-lg account-auth">
          <div className="ld-row" role="group" aria-label="Account access">
            <button className={`ld-btn ld-btn--${authMode === 'signin' ? 'primary' : 'secondary'}`} type="button" aria-pressed={authMode === 'signin'} disabled={busy} onClick={() => { setAuthMode('signin'); setError(''); }}>Sign in</button>
            <button className={`ld-btn ld-btn--${authMode === 'signup' ? 'primary' : 'secondary'}`} type="button" aria-pressed={authMode === 'signup'} disabled={busy} onClick={() => { setAuthMode('signup'); setError(''); }}>Sign up</button>
          </div>
          <AuthForm key={authMode} mode={authMode} busy={busy} run={run} authenticate={async input => {
            if (authMode === 'signup') { await client.signup(input); setAuthMode('signin'); }
            else { await client.signin(input); clearOwnedState(); await readSession(); }
          }} />
        </div>
      </Ld.Panel>}

      {authenticated && !tokenHash && <>
        <Ld.Panel id="personal-profile" title="Personal profile">
          <div className="ld-stack-lg">
            <p className="ld-body account-break">Signed in as {authenticated.user.email}</p>
            <AccountForm key={`${authenticated.user.id}:${authenticated.user.displayName}`} label="Personal profile" busy={busy || !profiles}
              submit="Save display name" onSubmit={data => run('Saving display name', async () => {
                const result = await client.profile(String(data.get('displayName') ?? '').trim());
                setSession(current => current?.authenticated ? { ...current, user: result.user } : current);
              }, 'Display name saved.')}>
              <Input label="Display name" name="displayName" value={authenticated.user.displayName} autoComplete="nickname" required={false} maxLength={120} />
            </AccountForm>
          </div>
        </Ld.Panel>
        <Ld.Panel id="organizations" title="Organizations" sub="Create an organization or choose one you own.">
          <div className="account-columns">
            <div className="ld-field">
              <label htmlFor="account-organization" className="ld-field-l">Selected organization</label>
              <select id="account-organization" className="ld-select" value={organizationId} disabled={busy || !profiles || !authenticated.organizations.length}
                onChange={event => {
                  const id = event.target.value;
                  setOrganizationId(id); setDetails(null); setAppId('');
                  void run('Loading organization', async () => setDetails(await client.organization(id)));
                }}>
                {!authenticated.organizations.length && <option value="">No organizations yet</option>}
                {authenticated.organizations.map(org => <option key={org.id} value={org.id}>{org.name} · owner</option>)}
              </select>
              {!authenticated.organizations.length && <p className="ld-secondary">Create an organization to add advertiser and AI-app profiles.</p>}
              {organizationId && !details && !busy && <Ld.Button variant="secondary" onClick={() => void run('Loading organization', async () => setDetails(await client.organization(organizationId)))}>Reload organization</Ld.Button>}
            </div>
            <AccountForm label="Create organization" busy={busy || !profiles} submit="Create organization"
              onSubmit={(data, form) => run('Creating organization', async () => {
                const { organization } = await client.createOrganization(String(data.get('name') ?? '').trim());
                setSession(current => current?.authenticated ? { ...current, organizations: [...current.organizations, organization] } : current);
                setOrganizationId(organization.id); setAppId('');
                setDetails({ organization, advertiser: null, apps: [] });
                form.reset();
              }, 'Organization created. You are its owner.')}>
              <Input label="New organization name" name="name" autoComplete="organization" maxLength={120} />
            </AccountForm>
          </div>
        </Ld.Panel>
        {details && profiles && <div className="account-columns account-profile-columns" key={details.organization.id}>
          <Ld.Panel id="advertiser-profile" title="Advertiser profile" sub={details.organization.name}>
            <AdvertiserForm key={details.advertiser?.updatedAt ?? 'new-advertiser'} profile={details.advertiser} busy={busy} run={run}
              save={async input => {
                const result = await client.advertiser(details.organization.id, input);
                setDetails(current => current ? { ...current, advertiser: result.advertiser } : current);
              }} />
          </Ld.Panel>
          <Ld.Panel id="ai-apps" title="AI-app profiles" sub={details.organization.name}>
            <div className="ld-stack-lg">
              <div className="ld-field">
                <label className="ld-field-l" htmlFor="account-app">Create or edit an AI app</label>
                <select className="ld-select" id="account-app" value={appId} disabled={busy} onChange={event => { setAppId(event.target.value); setError(''); }}>
                  <option value="">Create a new AI app</option>
                  {details.apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                </select>
                {!details.apps.length && <p className="ld-secondary">No AI-app profiles yet.</p>}
              </div>
              <AppForm key={`${selectedApp?.id ?? 'new'}:${selectedApp?.updatedAt ?? ''}`} app={selectedApp} busy={busy} run={run}
                save={async input => {
                  const { app } = await client.app(details.organization.id, input, selectedApp?.id);
                  setDetails(current => current ? { ...current, apps: current.apps.some(existing => existing.id === app.id) ? current.apps.map(existing => existing.id === app.id ? app : existing) : [...current.apps, app] } : current);
                  setAppId(app.id);
                }} />
            </div>
          </Ld.Panel>
        </div>}
        {details && campaignDrafts && <CampaignResources key={`campaigns:${authenticated.user.id}:${details.organization.id}`}
          client={client} organizationId={details.organization.id} advertiserReady={Boolean(details.advertiser)} busy={busy} run={run}
          onUnauthorized={expireOwnedSession} />}
        {details && appCredentials && (selectedApp ? <AppCredentials key={`credentials:${authenticated.user.id}:${details.organization.id}:${selectedApp.id}`}
          client={client} organizationId={details.organization.id} app={selectedApp} busy={busy} run={run}
          issue={showIssuedCredential} dismissKey={clearResourceSecret} onUnauthorized={expireOwnedSession}
          rawKey={issuedKey?.organizationId === details.organization.id && issuedKey.appId === selectedApp.id ? issuedKey.apiKey : null} /> :
          <Ld.Panel id="app-credentials" title="Server-side SDK credentials"><p className="ld-body">Create or select an AI-app profile above to manage its own server credentials. Serving and funding are not connected.</p></Ld.Panel>)}
      </>}

      <Ld.Panel id="account-readiness" title="Capabilities and readiness">
        <div className="ld-stack">
          <p className="ld-body">Owned resources stay in your signed-in organization. Account creation does not grant ownership of the shared demo, its campaigns, wallets or records.</p>
          <dl className="account-readiness">
            <div><dt>Account service</dt><dd>{!health ? 'Not verified' : !isConfigured(health) ? 'Unconfigured' : !health.enabled ? 'Disabled' : 'Configured'}</dd></div>
            <div><dt>Profile database</dt><dd>{health?.profileStore === 'supabase' ? 'AXP Supabase PostgreSQL' : health?.profileStore === 'sqlite-fixture' ? 'Local fixture store' : 'Not verified'}</dd></div>
            <div><dt>Profiles</dt><dd>{!ready ? 'Unavailable' : !health?.capabilities.profiles ? 'Disabled by server' : !authenticated ? 'Sign in required' : profiles ? 'Available' : 'Disabled for this session'}</dd></div>
            <div><dt>Campaign drafts</dt><dd>{campaignDrafts ? 'Available · approval does not activate serving' : !authenticated ? 'Sign in required; server capability not assumed' : 'Not enabled for this server/session'}</dd></div>
            <div><dt>App credentials</dt><dd>{appCredentials ? 'Available · configuration access only' : !authenticated ? 'Sign in required; server capability not assumed' : 'Not enabled for this server/session'}</dd></div>
            <div><dt>Campaign serving</dt><dd>Not connected</dd></div>
            <div><dt>Native funding</dt><dd>Not connected · no financial authority</dd></div>
          </dl>
          <p className="ld-secondary">Allowed origins, prohibited categories and payout addresses are declarations. SDK configuration reads saved app metadata, not serving readiness. These declarations do not verify wallet ownership or authorize payments. Shared account serving and app-bound settlement remain separate integration gates.</p>
        </div>
      </Ld.Panel>
    </Ld.Shell>
  </div>;
}
