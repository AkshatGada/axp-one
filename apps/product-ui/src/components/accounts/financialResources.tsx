'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { AccountApiError, type AccountsClient } from './client';
import type { AIApp, Campaign } from './types';
import {
  AccountFinancialClient, FinancialScope, type FinancialChannel, type FinancialOperation,
  type FinancialResource, type FinancialResult, type FinancialSigning, type WalletBinding, type WalletChallenge,
} from './financialClient';
import {
  WalletStandardError, bytesFromBase64, connectWallet, discoverWallets, signWalletMessage,
  signWalletTransaction, type StandardAccount, type StandardWallet,
} from './walletStandard';

export interface AccountFinancialResourcesProps {
  client: AccountsClient;
  organizationId: string;
  campaigns?: Campaign[];
  apps?: AIApp[];
  ready?: boolean;
  broadcastEnabled?: boolean;
  busy?: boolean;
  onUnauthorized?: () => void;
  onConflict?: () => void;
}
const messages: Record<string, string> = {
  account_payment_broadcast_disabled: 'Payments are not available yet, so nothing was sent. Reload the saved channel before continuing.',
  wallet_challenge_expired: 'The ownership challenge expired. Explicitly request a new challenge.',
  verified_wallet_required: 'Both campaign funding and app payout addresses need separate verified ownership proofs.',
  own_wallet_network_unavailable: 'Own-wallet payments support Solana Devnet only. Tempo is unavailable here.',
  close_not_drained: 'Close is blocked by outstanding reservations or accepted charges awaiting authorization. Pause serving, authorize saved charges and inspect again.',
  campaign_version_conflict: 'The campaign version changed. Reload resources and review the current version; frozen channels never follow edits.',
  reconcile_existing_attempt: 'A saved attempt already exists. Reload and explicitly reconcile it; do not sign a replacement.',
  no_reconcilable_attempt: 'There is no signed attempt to check. Contact support before doing anything else; do not replace it.',
  unsigned_plan_expired: 'The unsigned plan expired. Reload saved records, then explicitly prepare this same frozen operation again. Signed unknown attempts must only be reconciled.',
  account_funding_not_connected: 'Payments are not available yet.',
  invalid_financial_response: 'The payment details could not be read. Reload before continuing.',
};
function safeError(error: unknown) {
  if (error instanceof WalletStandardError) return error.message;
  if (error instanceof AccountApiError) return messages[error.code] ?? error.message;
  return 'The operation was rejected or its result is unknown. Nothing is retried automatically. Reload saved records and reconcile an existing attempt before continuing.';
}
/** Display only: six-decimal base units as a decimal string. */
function units(base: string) {
  if (!/^[0-9]{1,30}$/.test(base)) return base;
  const padded = base.padStart(7, '0'), fraction = padded.slice(-6).replace(/0+$/, '');
  const whole = padded.slice(0, -6).replace(/^0+(?=\d)/, '');
  return fraction ? `${whole}.${fraction}` : whole;
}
const plain = (value: string) => value.replaceAll('_', ' ');
// Remounting fences outstanding wallet prompts and clears every private browser value.
const clientKeys = new WeakMap<AccountsClient, number>();
let nextClientKey = 0;
export function AccountFinancialResources(props: AccountFinancialResourcesProps) {
  let clientKey = clientKeys.get(props.client);
  if (clientKey === undefined) { clientKey = ++nextClientKey; clientKeys.set(props.client, clientKey); }
  return <FinancialPanel key={`${clientKey}:${props.organizationId}:${props.ready === true}:${props.broadcastEnabled === true}`} {...props} />;
}
function FinancialPanel({ client, organizationId, campaigns: initialCampaigns = [], apps: initialApps = [],
  ready = false, broadcastEnabled = false, busy: parentBusy = false, onUnauthorized, onConflict,
}: AccountFinancialResourcesProps) {
  const prefix = useId();
  const finance = useMemo(() => new AccountFinancialClient((path, body) => client.financeRequest(path, body)), [client]);
  const scope = useRef(new FinancialScope());
  const mounted = useRef(true);
  const [campaigns, setCampaigns] = useState(() => initialCampaigns.filter(c => c.organizationId === organizationId));
  const [apps, setApps] = useState(() => initialApps.filter(a => a.organizationId === organizationId));
  const [kind, setKind] = useState<FinancialResource>('campaigns');
  const [resourceId, setResourceId] = useState('');
  const [wallets, setWallets] = useState<readonly StandardWallet[]>([]);
  const registered = useRef<readonly StandardWallet[]>([]);
  const [wallet, setWallet] = useState<StandardWallet | null>(null);
  const [account, setAccount] = useState<StandardAccount | null>(null);
  const [expectedAddress, setExpectedAddress] = useState('');
  const [binding, setBinding] = useState<WalletBinding | null>(null);
  const [challenge, setChallenge] = useState<WalletChallenge | null>(null);
  const [channels, setChannels] = useState<FinancialChannel[]>([]);
  const [channelId, setChannelId] = useState('');
  const [signing, setSigning] = useState<FinancialSigning | null>(null);
  const [appId, setAppId] = useState('');
  const [deposit, setDeposit] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [working, setWorking] = useState(false);
  const [status, setStatus] = useState('Choose a campaign or AI app to begin.');
  const [error, setError] = useState('');
  const busy = parentBusy || working || !ready;
  const role = kind === 'campaigns' ? 'payer' as const : 'payee' as const;
  const resources = kind === 'campaigns' ? campaigns : apps;
  const campaign = campaigns.find(c => c.id === resourceId);
  const channel = channels.find(c => c.id === channelId);
  const signerAddress = channel ? role === 'payer' ? channel.payer : channel.payee : expectedAddress;

  useEffect(() => {
    mounted.current = true;
    const stop = ready ? discoverWallets(window, values => { registered.current = values; setWallets(values); }) : () => {};
    return () => { mounted.current = false; scope.current.invalidate(); registered.current = []; stop(); };
  }, [ready]);
  function clearResource() {
    scope.current.invalidate(); setWorking(false); setBinding(null); setChallenge(null); setChannels([]);
    setChannelId(''); setSigning(null); setAcknowledged(false); setBlocked(false); setError('');
  }
  async function run(label: string, action: (current: () => boolean) => Promise<void>, uncertain = false) {
    if (busy || !mounted.current) return;
    let token: ReturnType<FinancialScope['begin']>;
    try { token = scope.current.begin(); } catch { return; }
    const current = () => mounted.current && token.current();
    setWorking(true); setError(''); setStatus(label);
    try { await action(current); }
    catch (failure) {
      if (!current()) return;
      setError(safeError(failure)); setStatus('Stopped. No automatic retry.');
      if (uncertain) { setBlocked(true); setSigning(null); setChallenge(null); setAcknowledged(false); }
      if (failure instanceof AccountApiError && failure.status === 401) {
        clearResource(); setAccount(null); setWallet(null); setExpectedAddress(''); setError(safeError(failure)); onUnauthorized?.();
      }
      if (failure instanceof AccountApiError && failure.code === 'campaign_version_conflict') onConflict?.();
    } finally { if (current()) setWorking(false); token.finish(); }
  }
  function result(value: FinancialResult) {
    setChannels(previous => previous.map(c => c.id === value.channel.id ? value.channel : c));
    setSigning(value.signing ?? null); setAcknowledged(false);
    if (value.channel.requiresReconciliation) setBlocked(true);
  }
  function requireWallet() {
    if (!wallet || !account || !registered.current.includes(wallet)) throw new WalletStandardError('Waiting for a connected Wallet Standard wallet. Enter and connect the expected address.');
    return { wallet, account };
  }
  function loadResources() { void run('Loading account resources…', async current => {
    const [campaignResult, details] = await Promise.all([client.campaigns(organizationId), client.organization(organizationId)]);
    if (!current()) return;
    clearResource(); setResourceId(''); setCampaigns(campaignResult.campaigns.filter(c => c.organizationId === organizationId));
    setApps(details.apps.filter(a => a.organizationId === organizationId)); setStatus('Resources loaded. Choose a campaign or AI app.');
  }); }
  function loadSaved() { if (resourceId) void run('Loading saved ownership proof and channels…', async current => {
    const [savedBinding, savedChannels] = await Promise.all([finance.wallet(organizationId, kind, resourceId), finance.channels(organizationId, kind, resourceId)]);
    if (!current()) return;
    setBinding(savedBinding); setChannels(savedChannels); setChallenge(null); setSigning(null); setAcknowledged(false); setChannelId(''); setBlocked(false);
    setStatus('Saved records loaded. Select a channel; unknown outcomes require explicit reconciliation.');
  }); }
  function prepare(operation: FinancialOperation) { if (channel) void run(`Preparing ${operation} from saved server terms…`, async current => {
    const value = await finance.prepare(organizationId, channel, operation, role);
    if (!current()) return;
    result(value); setStatus(value.signing ? `${operation} prepared. Review frozen terms before requesting a wallet signature.` : 'No accepted charge is awaiting voucher authorization.');
  }, true); }
  function sign() { if (channel && signing) void run('Waiting for your explicit wallet signature…', async current => {
    const connected = requireWallet();
    if (signing.kind !== 'voucher' && (!broadcastEnabled || !acknowledged)) throw new WalletStandardError('Payments are not available yet, so this transaction cannot be submitted.');
    const signed = signing.kind === 'voucher'
      ? await signWalletMessage(connected.wallet, connected.account, channel.payer, bytesFromBase64(signing.messageBase64))
      : await signWalletTransaction(connected.wallet, connected.account, signerAddress, signing.wireBase64);
    if (!current()) return; // Never submit after org/session/resource changes or unmount.
    if (!registered.current.includes(connected.wallet)) throw new WalletStandardError('Wallet was removed. Nothing was submitted.');
    const value = await finance.submit(organizationId, channel, signing, signed, role);
    if (!current()) return;
    result(value);
    if (value.signing?.kind === 'close') setSigning(null);
    setStatus(value.signing?.kind === 'close' ? 'Your close signature was saved. Waiting for the other frozen wallet signer; not finalized. Reload before another explicit action.'
      : value.channel.phase === 'finalized' ? 'Server reports finalized close. Inspect paid and refunded amounts separately.'
        : value.channel.requiresReconciliation ? 'Outcome is unknown. Explicitly reconcile the saved attempt; do not resubmit.'
          : signing.kind === 'voucher' ? 'Server reports cumulative voucher authorization. This is not a finalized payout.'
            : 'Server reports channel funding. Serving remains off until explicitly activated.');
  }, true); }
  const canPrepareOpen = channel && role === 'payer' && (['frozen', 'awaiting_open_signature'].includes(channel.phase) ||
    channel.phase === 'preparation_unknown' && channel.openStatus === 'preparing' && !channel.openTransaction);
  const canPrepareClose = channel && (['funded', 'draining'].includes(channel.phase) ||
    channel.phase === 'preparation_unknown' && channel.closeStatus === 'preparing' && !channel.closeTransaction);
  const canPrepareVoucher = channel && role === 'payer' && (channel.phase === 'funded' ||
    channel.phase === 'authorization_unknown' && channel.pendingAuthorizationStatus === 'preparing');
  const canSign = Boolean(channel && signing && account?.address === signerAddress && !blocked && !channel.requiresReconciliation &&
    (signing.kind === 'voucher' || (broadcastEnabled && acknowledged)));

  return <section className="account-wallet" aria-label="Account-owned wallet funding">
    <div className="ld-stack">
      <div className="ld-row">
        <span className="ld-tag" data-tone="outline">Solana Devnet · test USDC · no real money</span>
        <span className="ld-tag" data-tone={broadcastEnabled ? 'success' : 'warning'}>{broadcastEnabled ? 'Payments on: each one needs your signature' : 'Payments are not available yet'}</span>
      </div>
      <p className="ld-body">{broadcastEnabled
        ? 'A deposit or a close is sent only after you prepare it, tick the authorization box and sign it in your wallet.'
        : 'You can verify your wallet and review your channels. Deposits, payouts and refunds are switched off.'}</p>
      <details className="account-more"><summary>Limits to know</summary>
        <p className="ld-secondary">Test USDC only. 1 test USDC equals 1,000,000 base units. SOL network fees and rent are separate. Nothing connects, signs, funds or sends on its own.</p>
      </details>
      {!ready && <p role="status" className="account-error">Wallet verification is not available yet.</p>}
      <p className="account-wallet-status" role="status" aria-live="polite">{status}</p>
      {error && <p className="account-error" role="alert">{error}</p>}
    </div>
    <fieldset className="account-fields account-wallet-step" disabled={busy}>
      <legend>1. Choose what the wallet is for</legend>
      <p className="ld-secondary">A wallet is verified for one campaign (to fund it) or one AI app (to be paid).</p>
      <div className="account-pair">
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-kind`}>Wallet purpose</label>
          <select className="ld-select" id={`${prefix}-kind`} value={kind} onChange={e => { clearResource(); setKind(e.target.value as FinancialResource); setResourceId(''); }}>
            <option value="campaigns">Fund a campaign</option><option value="apps">Receive payouts for an AI app</option>
          </select>
        </div>
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-resource`}>{kind === 'campaigns' ? 'Campaign' : 'AI app'}</label>
          <select className="ld-select" id={`${prefix}-resource`} value={resourceId} onChange={e => { clearResource(); setResourceId(e.target.value); }}>
            <option value="">Choose one</option>
            {resources.map(resource => <option key={resource.id} value={resource.id}>{'input' in resource ? resource.input.name : resource.name}</option>)}
          </select>
          {!resources.length && <span className="ld-field-h">None loaded yet. Select Reload campaigns and apps.</span>}
        </div>
      </div>
      <div className="ld-row">
        <Ld.Button disabled={!resourceId} onClick={loadSaved}>Load wallet proof and own channels</Ld.Button>
        <Ld.Button variant="secondary" disabled={busy} onClick={loadResources}>Reload campaigns and apps</Ld.Button>
      </div>
    </fieldset>
    <fieldset className="account-fields account-wallet-step" disabled={busy}>
      <legend>2. Verify your wallet</legend>
      <p className="ld-secondary">This signature verifies your wallet and does not send funds. It is not a deposit and cannot authorize spending.</p>
      <div className="ld-row">
        <span className="ld-tag" data-tone={binding ? 'success' : 'outline'}>{binding ? 'Wallet verified' : 'Not verified yet'}</span>
        <span className="ld-tag" data-tone="outline">{account ? 'Wallet connected' : 'No wallet connected'}</span>
      </div>
      <p className="ld-secondary account-break">{binding ? `Verified ${binding.purpose} address: ${binding.address}` : 'No verified wallet loaded. A payout address saved in app settings does not verify a wallet.'}</p>
      <div className="account-pair">
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-wallet`}>Wallet</label>
          <select className="ld-select" id={`${prefix}-wallet`} value={wallet && wallets.includes(wallet) ? String(wallets.indexOf(wallet)) : ''} onChange={e => {
            setWallet(e.target.value === '' ? null : wallets[Number(e.target.value)]); setAccount(null); setChallenge(null);
          }}><option value="">Choose a wallet</option>{wallets.map((candidate, i) => <option key={i} value={String(i)}>{candidate.name}</option>)}</select>
          {!wallets.length && <span className="ld-field-h">No wallet found in this browser. Install or unlock a Solana wallet set to Devnet.</span>}
        </div>
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-address`}>Wallet address (must match the wallet you connect)</label>
          <input className="ld-input" id={`${prefix}-address`} value={expectedAddress} autoComplete="off" spellCheck={false} onChange={e => { setExpectedAddress(e.target.value); setAccount(null); setChallenge(null); }} />
        </div>
      </div>
      <p className="ld-secondary account-break">{account ? `Connected: ${account.address}` : 'Connect the wallet whose address you entered above.'}</p>
      <div className="ld-row">
        <Ld.Button variant="secondary" disabled={!wallet || !expectedAddress} onClick={() => void run('Waiting for wallet connection…', async current => {
          const connected = await connectWallet(wallet!, expectedAddress);
          if (current()) { setAccount(connected); setStatus(`Connected expected Devnet account ${connected.address}. Ownership is not yet verified.`); }
        })}>Connect expected wallet</Ld.Button>
        <Ld.Button variant="secondary" disabled={!resourceId || !account} onClick={() => void run('Requesting one-use ownership challenge…', async current => {
          const value = await finance.challenge(organizationId, kind, resourceId, account!.address);
          if (current()) { setChallenge(value); setStatus('Challenge ready. Review its resource, purpose, origin and expiry before signing.'); }
        }, true)}>Request ownership challenge</Ld.Button>
        <Ld.Button disabled={!challenge || !account} onClick={() => void run('Waiting for ownership signature, then submitting this proof…', async current => {
          const saved = challenge!; if (saved.expiresAt <= Date.now()) throw new WalletStandardError('Challenge expired. Explicitly request a new challenge.');
          const connected = requireWallet();
          const signature = await signWalletMessage(connected.wallet, connected.account, saved.address, new TextEncoder().encode(saved.message));
          if (!current()) return;
          const value = await finance.verifyWallet(organizationId, kind, resourceId, saved, signature);
          if (current()) { setBinding(value); setChallenge(null); setStatus(`Verified ${value.purpose} wallet. No funds were transferred.`); }
        }, true)}>Sign and verify ownership proof</Ld.Button>
      </div>
      {challenge && <details open><summary>Review ownership challenge · expires {new Date(challenge.expiresAt).toISOString()}</summary><pre className="account-break">{challenge.message}</pre></details>}
    </fieldset>
    {kind === 'campaigns' && <fieldset className="account-fields account-wallet-step" disabled={busy || blocked || !campaign}>
      <legend>3. Set the terms with one AI app</legend>
      <p className="ld-secondary">Link this approved campaign version to one app and its verified payout wallet. Freezing the terms sends nothing and does not start the campaign.</p>
      <details className="account-more"><summary>What freezing terms means</summary><p className="ld-secondary">The app, both wallets and the amounts stay fixed from then on, even if profiles change later.</p></details>
      <div className="account-pair">
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-app`}>AI app ID to pay (it can belong to another organization)</label>
          <input className="ld-input" id={`${prefix}-app`} list={`${prefix}-apps`} value={appId} onChange={e => setAppId(e.target.value)} autoComplete="off" />
          <datalist id={`${prefix}-apps`}>{apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</datalist>
        </div>
        <div className="ld-field">
          <label className="ld-field-l" htmlFor={`${prefix}-deposit`}>Deposit in test-USDC base units (maximum 200000)</label>
          <input className="ld-input" id={`${prefix}-deposit`} inputMode="numeric" value={deposit} onChange={e => setDeposit(e.target.value)} autoComplete="off" />
          <span className="ld-field-h">{/^[1-9][0-9]{0,5}$/.test(deposit) ? `Equals ${units(deposit)} test USDC. ` : ''}The deposit is only made later, by a transaction you sign.</span>
        </div>
      </div>
      {campaign ? <p className="ld-secondary">Saved version {campaign.version} · {campaign.status} · campaign cap {campaign.input.budgetCapBaseUnits} base units · {campaign.input.settlementNetwork}</p>
        : <p className="ld-secondary">Choose a campaign in step 1 first.</p>}
      <div className="ld-row">
        <Ld.Button disabled={!campaign || campaign.status !== 'approved' || campaign.input.settlementNetwork !== 'solana-devnet' || !binding || !appId || !deposit || channels.some(c => c.appId === appId)} onClick={() => void run('Freezing reviewed channel terms…', async current => {
          const value = await finance.freeze(organizationId, campaign!.id, campaign!.version, appId, deposit);
          if (current()) { setChannels(previous => [...previous, value]); setChannelId(value.id); setSigning(null); setAcknowledged(false); setStatus('Terms frozen. No deposit or serving activation occurred.'); }
        }, true)}>{campaign ? `Freeze terms · version ${campaign.version}` : 'Freeze terms'}</Ld.Button>
      </div>
    </fieldset>}
    <fieldset className="account-fields account-wallet-step" disabled={busy}>
      <legend>{kind === 'campaigns' ? '4' : '3'}. Channels</legend>
      <p className="ld-secondary">A channel holds the deposit for one campaign and one app. Deposits, authorized charges, payouts and refunds are shown separately. You are the {role === 'payer' ? 'payer' : 'recipient'}.</p>
      <div className="ld-field">
        <label className="ld-field-l" htmlFor={`${prefix}-channel`}>Saved channel</label>
        <select className="ld-select" id={`${prefix}-channel`} value={channelId} onChange={e => { setChannelId(e.target.value); setSigning(null); setAcknowledged(false); setError(''); }}>
          <option value="">Choose a loaded channel</option>{channels.map((c, i) => <option key={c.id} value={c.id}>Channel {i + 1} · {plain(c.phase)}</option>)}
        </select>
        {!channels.length && <span className="ld-field-h">No channels loaded. Use Load wallet proof and own channels in step 1 to inspect saved state.</span>}
      </div>
      {channel && <>
        <div className="ld-row">
          <span className="ld-tag" data-tone="brand">Stage: {plain(channel.phase)}</span>
          <span className="ld-tag" data-tone={channel.servingEnabled ? 'success' : 'outline'}>{channel.servingEnabled ? 'Enabled for new matching' : 'Off for new matching'}</span>
          {channel.phase !== 'finalized' && <span className="ld-tag" data-tone="outline">Not settled</span>}
        </div>
        <ul className="account-money" aria-label="Channel amounts in test USDC">
          <li><b>Deposited</b><span>{channel.openStatus === 'finalized' ? `${units(channel.depositBaseUnits)} test USDC` : `None yet. Terms set ${units(channel.depositBaseUnits)} test USDC.`}</span></li>
          <li><b>Authorized for accepted charges</b><span>{units(channel.authorizedBaseUnits)} test USDC. A signed promise, not a payout.</span></li>
          <li><b>Paid to the AI app</b><span>{units(channel.paidBaseUnits)} test USDC{channel.phase === 'finalized' ? '' : '. Paid only when the channel closes.'}</span></li>
          <li><b>Refunded to the advertiser</b><span>{units(channel.refundBaseUnits)} test USDC{channel.phase === 'finalized' ? '' : '. Unused deposit returns at close.'}</span></li>
        </ul>
        <details className="account-more">
          <summary>Full channel record</summary>
          <dl className="account-readiness account-break">
            <div><dt>Phase / open / close</dt><dd>{channel.phase} / {channel.openStatus} / {channel.closeStatus}</dd></div>
            <div><dt>Pending authorization</dt><dd>{channel.pendingAuthorizationStatus ?? 'None'}</dd></div>
            <div><dt>Frozen campaign / version / app</dt><dd>{channel.campaignId} / {channel.campaignVersion} / {channel.appId}</dd></div>
            <div><dt>Frozen payer</dt><dd>{channel.payer}</dd></div><div><dt>Frozen payee</dt><dd>{channel.payee}</dd></div>
            <div><dt>Terms hash</dt><dd>{channel.termsHash}</dd></div>
            <div><dt>Deposit / cap · test-USDC base units</dt><dd>{channel.depositBaseUnits} / {channel.chargeCapBaseUnits}</dd></div>
            <div><dt>Cumulative authorized / paid / refunded · test-USDC base units</dt><dd>{channel.authorizedBaseUnits} / {channel.paidBaseUnits} / {channel.refundBaseUnits}</dd></div>
            <div><dt>Fees and rent · SOL lamports</dt><dd>{channel.feeAndRentLamports}</dd></div>
            <div><dt>Open transaction</dt><dd>{channel.openTransaction ?? 'None recorded'}</dd></div>
            <div><dt>Close transaction</dt><dd>{channel.closeTransaction ?? 'None recorded'}</dd></div>
          </dl>
        </details>
        {(blocked || channel.requiresReconciliation) && <p role="alert" className="account-error">The outcome of an earlier action is unknown. Do not create new terms or sign again. Reload saved records and select Reconcile saved attempt. If it stays unresolved, contact support.</p>}
        {role === 'payer' && <div className="ld-stack">
          <h4 className="account-part-title">Serving on this channel</h4>
          <div className="ld-row">
            <Ld.Button disabled={blocked || channel.requiresReconciliation || channel.phase !== 'funded' || channel.servingEnabled} onClick={() => void run('Explicitly activating funded channel serving…', async current => {
              const value = await finance.serving(organizationId, channel, true, role); if (current()) { result(value); setStatus('Serving explicitly activated for the frozen funded channel.'); }
            }, true)}>Activate funded channel · version {channel.campaignVersion}</Ld.Button>
            <Ld.Button variant="secondary" disabled={!channel.servingEnabled} onClick={() => void run('Pausing new channel matching…', async current => {
              const value = await finance.serving(organizationId, channel, false, role); if (current()) { result(value); setStatus('New matching paused. Existing reservations and accepted obligations remain.'); }
            }, true)}>Pause channel serving</Ld.Button>
          </div>
          {channel.phase !== 'funded' && <p className="ld-secondary">A channel can serve only after its deposit transaction is finalized.</p>}
        </div>}
        <div className="ld-stack">
          <h4 className="account-part-title">Prepare a wallet action</h4>
          <p className="ld-secondary">Preparing builds the exact message for your wallet from saved server terms. Nothing is signed or sent until you choose to sign below.</p>
          <div className="ld-row">
            {role === 'payer' && <Ld.Button variant="secondary" disabled={blocked || !canPrepareOpen} onClick={() => prepare('open')}>Prepare opening</Ld.Button>}
            {role === 'payer' && <Ld.Button variant="secondary" disabled={blocked || !canPrepareVoucher} onClick={() => prepare('voucher')}>Prepare next accepted-charge voucher</Ld.Button>}
            <Ld.Button variant="secondary" disabled={blocked || !canPrepareClose} onClick={() => prepare('close')}>Prepare / load cooperative close</Ld.Button>
            <Ld.Button variant="secondary" disabled={!channel.openTransaction && !channel.closeTransaction && channel.phase !== 'authorization_unknown'} onClick={() => void run('Reconciling the saved attempt only…', async current => {
              const value = await finance.reconcile(organizationId, channel); if (current()) { result(value); setStatus(value.channel.requiresReconciliation ? 'Saved attempt is still unresolved. No replacement or silent retry was made.' : 'Saved attempt reconciled. Reload saved records before another operation.'); }
            }, true)}>Reconcile saved attempt</Ld.Button>
          </div>
        </div>
        {signing && <div className="account-secret">
          <span className="ld-card-title">Ready for your wallet: {signing.kind}</span>
          <p className="ld-secondary account-break">Prepared {signing.kind} · terms {signing.termsHash}. Required wallet: {signerAddress}.</p>
          {signing.kind === 'voucher' ? <p className="ld-secondary">Accepted charge {signing.chargeId} · cumulative authorization {signing.previousAmountBaseUnits} → {signing.cumulativeAmountBaseUnits} base units. Your signed voucher is never displayed or stored in this browser.</p>
            : <><p className="ld-secondary">Estimated fee/rent bound: {signing.estimatedFeeAndRentLamports} lamports. {signing.kind === 'close' && 'Cooperative close requires both frozen wallets. A partial signature is not payout or finality.'}</p>
              {!broadcastEnabled && <p className="ld-secondary">Payments are not available yet, so this transaction cannot be authorized or submitted.</p>}
              <label className="ld-secondary"><input type="checkbox" checked={acknowledged} disabled={!broadcastEnabled} onChange={e => setAcknowledged(e.target.checked)} /> I authorize this explicit transaction signature submission to broadcast on Solana Devnet when all required signatures are present.</label></>}
          {account?.address !== signerAddress && <p className="ld-secondary">Waiting for the frozen {role} wallet. Connect the exact required address above; no wallet prompt is opened automatically.</p>}
          <div className="ld-row">
            <Ld.Button disabled={!canSign} onClick={sign}>{signing.kind === 'voucher' ? 'Sign and submit saved voucher authorization' : `Sign and submit ${signing.kind} · may broadcast on Devnet`}</Ld.Button>
            <Ld.Button variant="secondary" onClick={() => { setSigning(null); setAcknowledged(false); setStatus('Browser signing payload discarded. Saved server terms and attempts remain unchanged.'); }}>Discard browser signing payload</Ld.Button>
          </div>
        </div>}
      </>}
    </fieldset>
  </section>;
}
