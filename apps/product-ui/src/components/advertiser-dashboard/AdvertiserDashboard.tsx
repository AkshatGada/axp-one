'use client';
// The shared demo dashboard: public example campaigns, no sign in. The chrome
// always says so; a visitor's own campaigns live in the account console.
import { useEffect, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { canRetryOpening, financialModeLabel, launchNotice, nativePayments, paymentOperationProblem, type PaymentOperationResult } from './payment';
import { CampaignEditor } from './CampaignEditor';
import { CampaignList } from './CampaignList';
import { CampaignDetail } from './CampaignDetail';
import { api, campaignRows, type Bootstrap, type Campaign, type ProductState } from './model';
import { DemoContext, destinations, useAccountPresence } from '../shared/mode';

type View = 'campaigns' | 'account' | 'editor' | 'detail';
export type CampaignAction = 'pause' | 'resume' | 'duplicate' | 'settle' | 'payout' | 'close' | 'reconcile' | 'authorize' | 'launch';
const paymentVerbs = ['settle', 'payout', 'close', 'reconcile', 'authorize', 'launch'];
const workingTitle: Record<string, string> = {
  launch: 'Retrying the saved channel opening', settle: 'Closing the payment channel', close: 'Closing the payment channel',
  payout: 'Processing the publisher payout', reconcile: 'Checking the saved payment status', authorize: 'Authorizing accepted deliveries',
};

export function AdvertiserDashboard() {
  const [bootstrap, setBootstrap] = useState<Bootstrap | null>(null), [state, setState] = useState<ProductState | null>(null);
  const [editorDirty, setEditorDirty] = useState(false);
  const [view, setView] = useState<View>('campaigns'), [selected, setSelected] = useState<string | null>(null), [editing, setEditing] = useState<Campaign | undefined>();
  const [error, setError] = useState(''), [message, setMessage] = useState(''), [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [paymentOperation, setPaymentOperation] = useState('');
  const [accountName, setAccountName] = useState(''), [accountURL, setAccountURL] = useState(''), [accountErrors, setAccountErrors] = useState<Record<string, string>>({});
  const presence = useAccountPresence();
  async function refresh() { const next = await api<ProductState>('/state'); setState(next); return next; }
  async function load() {
    setLoading(true); setError('');
    try { const [b, s] = await Promise.all([api<Bootstrap>('/bootstrap'), api<ProductState>('/state')]); setBootstrap(b); setState(s); setAccountName(s.account?.name ?? ''); setAccountURL(s.account?.websiteURL ?? ''); }
    catch (e) { setError(e instanceof Error ? e.message : 'The workspace could not be loaded.'); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  useEffect(() => {
    const update = () => { if (document.visibilityState === 'visible' && state && view !== 'editor') void refresh().catch(() => {}); };
    window.addEventListener('focus', update); document.addEventListener('visibilitychange', update);
    const timer = setInterval(update, 15000);
    return () => { window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); clearInterval(timer); };
  }, [Boolean(state), view]);
  async function saveAccount() {
    const e: Record<string, string> = {};
    if (!accountName.trim()) e.name = 'Enter a workspace name.';
    try { const u = new URL(accountURL); if (u.protocol !== 'https:' || u.username || u.password) throw new Error(); } catch { e.url = 'Use a complete https website address.'; }
    setAccountErrors(e); if (Object.keys(e).length) return;
    setBusy(true); setError('');
    try { await api('/account', bootstrap?.csrf, { name: accountName.trim(), websiteURL: accountURL.trim() }); await refresh(); setMessage('Workspace saved.'); setView('campaigns'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not save the workspace.'); }
    finally { setBusy(false); }
  }
  const native = nativePayments(bootstrap, state);
  const rows = state ? campaignRows(state) : [], current = rows.find(c => c.id === selected);
  function open(c: Campaign) { setError(''); setMessage(''); if (c.status === 'draft') { setEditing(c); setView('editor'); } else { setSelected(c.id); setView('detail'); } }
  function create() { setEditing(undefined); setMessage(''); setError(''); setView('editor'); }
  function leaveEditor() { return !(view === 'editor' && editorDirty) || window.confirm('Leave this editor? Unsaved changes will be lost. Save your draft first to keep them.'); }
  function go(next: 'campaigns' | 'account') { if (!leaveEditor()) return; setView(next); setError(''); setMessage(''); }
  async function action(c: Campaign, verb: CampaignAction) {
    setBusy(true); setError(''); setMessage(''); setPaymentOperation(paymentVerbs.includes(verb) ? verb : '');
    try {
      if (verb === 'launch') { const fresh = await refresh(); const saved = campaignRows(fresh).find(row => row.id === c.id); if (!saved || !canRetryOpening(saved)) throw new Error('This opening can no longer be retried. Inspect its updated status and reconcile the saved operation if required.'); }
      const result = await api<{ campaign: Campaign; paymentOperation?: PaymentOperationResult }>(`/campaigns/${encodeURIComponent(c.id)}/${verb}`, bootstrap?.csrf, {}); await refresh();
      const paymentProblem = paymentOperationProblem(result.paymentOperation); if (paymentProblem) { setError(paymentProblem); return; }
      if (verb === 'duplicate') { setEditing(result.campaign); setView('editor'); }
      else setMessage(verb === 'launch' ? launchNotice(result.campaign, native) : verb === 'authorize' ? 'Accepted-delivery authorization processed. Inspect the saved cumulative voucher status below.' : verb === 'reconcile' ? 'Payment status refreshed from the saved operation.' : verb === 'payout' ? result.paymentOperation?.status === 'finalized' ? 'Publisher payout confirmed. The campaign remains open.' : 'Payout requested. Inspect the saved transaction status; the campaign remains open.' : verb === 'settle' || verb === 'close' ? nativePayments(bootstrap, state) ? result.campaign.status === 'settled' ? 'Channel closure confirmed. Inspect the publisher payout and unused-deposit refund below.' : 'Settlement requested. Inspect the channel status and transaction evidence below.' : 'Campaign closed. Its test credits are recorded as settled.' : verb === 'pause' ? 'Campaign paused. It will not compete for new placements.' : 'Campaign resumed. It can compete again.');
    } catch (e) { await refresh().catch(() => {}); setError(e instanceof Error ? e.message : 'The action could not be completed.'); }
    finally { setBusy(false); setPaymentOperation(''); }
  }
  async function reload() { setBusy(true); try { await refresh(); setError(''); } catch (e) { setError(e instanceof Error ? e.message : 'Refresh failed.'); } finally { setBusy(false); } }
  const signedIn = presence.state === 'signed-in';
  const item = (href: string, label: string, current = false, meta?: string) => ({ href, label, current, meta });
  const modeFoot = !bootstrap ? 'Loading the shared demo.' : native ? 'Test tokens on a test network. No real money.' : 'Test credits. No real money moves.';
  return <div className="ad-dashboard"><Ld.Shell
    top={<Ld.TopBar brand={<Ld.Wordmark href="/" />} run={<DemoContext />}
      chips={<Ld.Tag tone="outline">{bootstrap && !native ? 'Test credits · no real money' : financialModeLabel(bootstrap, state)}</Ld.Tag>}
      actions={<><Ld.Button variant="ghost" href={destinations.exampleChat.href}>{destinations.exampleChat.label} →</Ld.Button>{signedIn ? <Ld.Button variant="secondary" href="/account/">Your account</Ld.Button> : <Ld.Button variant="secondary" href="/account/">Sign in</Ld.Button>}</>} />}
    side={<Ld.SideNav
      groups={[
        { label: 'Shared demo', items: [item('#campaigns', 'Campaigns', view !== 'account', String(rows.length)), item('#account', 'Demo workspace', view === 'account'), item(destinations.exampleChat.href, `${destinations.exampleChat.label} →`), item(destinations.sdkGuide.href, `${destinations.sdkGuide.label} →`)] },
        { label: 'Your account', items: signedIn ? [item(destinations.yourCampaigns.href, `${destinations.yourCampaigns.label} →`), item(destinations.yourApps.href, `${destinations.yourApps.label} →`)] : [item(destinations.account.href, 'Sign in →')] },
      ]}
      foot={<><strong>Shared demo</strong><p>{modeFoot}</p></>}
      Link={({ href, children, className, ...rest }) => <a {...rest} href={href} className={className} onClick={e => { if (href === '#campaigns' || href === '#account') { e.preventDefault(); go(href === '#account' ? 'account' : 'campaigns'); } }}>{children}</a>} />}>
    {error && <Ld.Notice tone="error" title="That did not work">{error}</Ld.Notice>}
    {busy && native && paymentOperation && <Ld.Notice tone="working" title={workingTitle[paymentOperation] ?? 'Working'}>Waiting for the saved operation. Network confirmation can take up to a minute.</Ld.Notice>}
    {message && <Ld.Notice tone="done">{message}</Ld.Notice>}
    {loading ? <>
      <Ld.PageBar title="Campaigns" sub="Loading the shared demo." />
      <Ld.Panel flush><Ld.Skeleton rows={3} label="Loading campaigns" /></Ld.Panel>
    </> : !state || !bootstrap ? <>
      <Ld.PageBar title="Campaigns" sub="Example advertisers in the shared demo." />
      <Ld.Empty title="The shared demo is unavailable right now" action={<Ld.Button onClick={() => void load()}>Try again</Ld.Button>}>Nothing was changed. Your own account is not affected.</Ld.Empty>
    </> : !state.account || view === 'account' ? <>
      <Ld.PageBar title={state.account ? 'Demo workspace' : 'Name the demo workspace'} sub="The shared demo has one public workspace. Its name appears to everyone who opens the demo." />
      <Ld.Panel title="Workspace details">
        <form onSubmit={e => { e.preventDefault(); void saveAccount(); }} noValidate className="ad-form-fields ad-narrow">
          <Ld.Field label="Workspace name" error={accountErrors.name}><input className="ld-input" autoComplete="organization" value={accountName} onChange={e => setAccountName(e.target.value)} maxLength={120} aria-invalid={Boolean(accountErrors.name)} /></Ld.Field>
          <Ld.Field label="Website" hint="Starts with https://. Each campaign can use its own destination." error={accountErrors.url}><input type="url" className="ld-input" autoComplete="url" value={accountURL} onChange={e => setAccountURL(e.target.value)} maxLength={500} aria-invalid={Boolean(accountErrors.url)} /></Ld.Field>
          <div className="ld-row"><Ld.Button type="submit" disabled={busy}>{busy ? 'Saving…' : state.account ? 'Save workspace' : 'Continue →'}</Ld.Button>{state.account && <Ld.Button variant="ghost" onClick={() => go('campaigns')}>Cancel</Ld.Button>}</div>
        </form>
      </Ld.Panel>
    </> : view === 'editor' ? <CampaignEditor key={editing?.id ?? 'new'} initial={editing} bootstrap={bootstrap} account={state.account} onDirtyChange={setEditorDirty} onSaved={async () => { await refresh(); }} onClose={() => setView('campaigns')} onLaunched={campaign => { setSelected(campaign.id); setView('detail'); setMessage(launchNotice(campaign, native)); }} />
    : view === 'detail' && current ? <CampaignDetail campaign={current} state={state} bootstrap={bootstrap} native={native} busy={busy} onBack={() => setView('campaigns')} onAction={verb => void action(current, verb)} />
    : <CampaignList state={state} bootstrap={bootstrap} native={native} busy={busy} presence={presence} rows={rows} onOpen={open} onCreate={create} onReload={() => void reload()} />}
  </Ld.Shell></div>;
}
