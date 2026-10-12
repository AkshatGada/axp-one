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
  account_payment_broadcast_disabled: 'The server broadcast gate is disabled. No successful broadcast is confirmed. Reload the saved channel before continuing.',
  wallet_challenge_expired: 'The ownership challenge expired. Explicitly request a new challenge.',
  verified_wallet_required: 'Both campaign funding and app payout addresses need separate verified ownership proofs.',
  own_wallet_network_unavailable: 'Own-wallet payments support Solana Devnet only. Tempo is unavailable here.',
  close_not_drained: 'Close is blocked by outstanding reservations or accepted charges awaiting authorization. Pause serving, authorize saved charges and inspect again.',
  campaign_version_conflict: 'The campaign version changed. Reload resources and review the current version; frozen channels never follow edits.',
  reconcile_existing_attempt: 'A saved attempt already exists. Reload and explicitly reconcile it; do not sign a replacement.',
  no_reconcilable_attempt: 'No signed attempt can be reconciled. The saved state needs operator inspection; do not replace it.',
  unsigned_plan_expired: 'The unsigned plan expired. Reload saved records, then explicitly prepare this same frozen operation again. Signed unknown attempts must only be reconciled.',
  account_funding_not_connected: 'Account-owned funding is unavailable on this server.',
  invalid_financial_response: 'The financial response did not match the expected Devnet account contract. Reload before continuing.',
};
function safeError(error: unknown) {
  if (error instanceof WalletStandardError) return error.message;
  if (error instanceof AccountApiError) return messages[error.code] ?? error.message;
  return 'The operation was rejected or its result is unknown. Nothing is retried automatically. Reload saved records and reconcile an existing attempt before continuing.';
}
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
  const [status, setStatus] = useState('Choose a resource, then explicitly load its saved wallet proof and channels.');
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
    if (signing.kind !== 'voucher' && (!broadcastEnabled || !acknowledged)) throw new WalletStandardError('Broadcast permission is required for transaction signature submission.');
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

  return <section className="ld-stack-lg" aria-label="Account-owned wallet funding">
    <h2 className="ld-body">Own-wallet funding · Solana Devnet</h2>
    <p className="ld-secondary">Test USDC only · financial mode devnet · 1 USDC = 1,000,000 base units. SOL fees and rent are separate. Tempo and mainnet are unavailable. A wallet proof is not a deposit; authorization is not payout.</p>
    <p className="ld-body">Server broadcast gate: {broadcastEnabled ? 'enabled for explicit transaction signature submissions' : 'disabled — native transactions cannot be submitted here'}.</p>
    <p className="ld-secondary">Nothing connects, signs, funds, activates or broadcasts automatically. Open/close signature submission may broadcast when all required signatures are present. No provider or model calls are made by this panel.</p>
    {!ready && <p role="status">Account wallet bindings are unavailable on this server.</p>}
    <p role="status" aria-live="polite">{status}</p>
    {error && <p className="account-error" role="alert">{error}</p>}
    <Ld.Button variant="secondary" disabled={busy} onClick={loadResources}>Reload campaigns and apps</Ld.Button>
    <fieldset className="account-fields" disabled={busy}>
      <legend>Account resource</legend>
      <label className="ld-field-l" htmlFor={`${prefix}-kind`}>Wallet purpose</label>
      <select className="ld-select" id={`${prefix}-kind`} value={kind} onChange={e => { clearResource(); setKind(e.target.value as FinancialResource); setResourceId(''); }}>
        <option value="campaigns">Campaign funding · payer</option><option value="apps">AI app payout · payee</option>
      </select>
      <label className="ld-field-l" htmlFor={`${prefix}-resource`}>{kind === 'campaigns' ? 'Campaign' : 'AI app'}</label>
      <select className="ld-select" id={`${prefix}-resource`} value={resourceId} onChange={e => { clearResource(); setResourceId(e.target.value); }}>
        <option value="">Choose a saved resource</option>
        {resources.map(resource => <option key={resource.id} value={resource.id}>{'input' in resource ? resource.input.name : resource.name}</option>)}
      </select>
      <Ld.Button variant="secondary" disabled={!resourceId} onClick={loadSaved}>Load wallet proof and own channels</Ld.Button>
    </fieldset>
    <fieldset className="account-fields" disabled={busy}>
      <legend>Connect and prove wallet control</legend>
      <label className="ld-field-l" htmlFor={`${prefix}-wallet`}>Wallet Standard wallet</label>
      <select className="ld-select" id={`${prefix}-wallet`} value={wallet && wallets.includes(wallet) ? String(wallets.indexOf(wallet)) : ''} onChange={e => {
        setWallet(e.target.value === '' ? null : wallets[Number(e.target.value)]); setAccount(null); setChallenge(null);
      }}><option value="">Choose a wallet</option>{wallets.map((candidate, i) => <option key={i} value={String(i)}>{candidate.name}</option>)}</select>
      {!wallets.length && <p className="ld-secondary">Waiting for a Wallet Standard wallet supporting Solana Devnet and message signing. Install/unlock one, then return here. No connection prompt is opened automatically.</p>}
      <label className="ld-field-l" htmlFor={`${prefix}-address`}>Expected wallet address (must match the wallet account)</label>
      <input className="ld-input" id={`${prefix}-address`} value={expectedAddress} autoComplete="off" spellCheck={false} onChange={e => { setExpectedAddress(e.target.value); setAccount(null); setChallenge(null); }} />
      <Ld.Button variant="secondary" disabled={!wallet || !expectedAddress} onClick={() => void run('Waiting for wallet connection…', async current => {
        const connected = await connectWallet(wallet!, expectedAddress);
        if (current()) { setAccount(connected); setStatus(`Connected expected Devnet account ${connected.address}. Ownership is not yet verified.`); }
      })}>Connect expected wallet</Ld.Button>
      <p className="ld-secondary account-break">{account ? `Connected: ${account.address}` : 'No wallet connected.'}</p>
      <p className="ld-secondary account-break">{binding ? `Verified ${binding.purpose} address: ${binding.address}` : 'No verified proof loaded for this resource. Profile payout declarations do not prove ownership.'}</p>
      <Ld.Button variant="secondary" disabled={!resourceId || !account} onClick={() => void run('Requesting one-use ownership challenge…', async current => {
        const value = await finance.challenge(organizationId, kind, resourceId, account!.address);
        if (current()) { setChallenge(value); setStatus('Challenge ready. Review its resource, purpose, origin and expiry before signing.'); }
      }, true)}>Request ownership challenge</Ld.Button>
      {challenge && <details open><summary>Review ownership challenge · expires {new Date(challenge.expiresAt).toISOString()}</summary><pre className="account-break">{challenge.message}</pre></details>}
      <Ld.Button disabled={!challenge || !account} onClick={() => void run('Waiting for ownership signature, then submitting this proof…', async current => {
        const saved = challenge!; if (saved.expiresAt <= Date.now()) throw new WalletStandardError('Challenge expired. Explicitly request a new challenge.');
        const connected = requireWallet();
        const signature = await signWalletMessage(connected.wallet, connected.account, saved.address, new TextEncoder().encode(saved.message));
        if (!current()) return;
        const value = await finance.verifyWallet(organizationId, kind, resourceId, saved, signature);
        if (current()) { setBinding(value); setChallenge(null); setStatus(`Verified ${value.purpose} wallet. No funds were transferred.`); }
      }, true)}>Sign and verify ownership proof</Ld.Button>
    </fieldset>
    {kind === 'campaigns' && <fieldset className="account-fields" disabled={busy || blocked || !campaign}>
      <legend>Freeze this campaign’s channel terms</legend>
      <p className="ld-secondary">Requires the exact approved saved campaign version and a separately verified payout app. Freezing terms performs read-only native preflight; it does not sign, deposit or activate serving. Frozen app, payer, payee and amounts never follow later edits.</p>
      <label className="ld-field-l" htmlFor={`${prefix}-app`}>Counterparty payout app ID (including an app owned by another organization)</label>
      <input className="ld-input" id={`${prefix}-app`} list={`${prefix}-apps`} value={appId} onChange={e => setAppId(e.target.value)} autoComplete="off" />
      <datalist id={`${prefix}-apps`}>{apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}</datalist>
      <label className="ld-field-l" htmlFor={`${prefix}-deposit`}>Deposit · integer test-USDC base units (maximum 200000)</label>
      <input className="ld-input" id={`${prefix}-deposit`} inputMode="numeric" value={deposit} onChange={e => setDeposit(e.target.value)} autoComplete="off" />
      {campaign && <p className="ld-secondary">Saved version {campaign.version} · {campaign.status} · campaign cap {campaign.input.budgetCapBaseUnits} base units · {campaign.input.settlementNetwork}</p>}
      <Ld.Button disabled={!campaign || campaign.status !== 'approved' || campaign.input.settlementNetwork !== 'solana-devnet' || !binding || !appId || !deposit || channels.some(c => c.appId === appId)} onClick={() => void run('Freezing reviewed channel terms…', async current => {
        const value = await finance.freeze(organizationId, campaign!.id, campaign!.version, appId, deposit);
        if (current()) { setChannels(previous => [...previous, value]); setChannelId(value.id); setSigning(null); setAcknowledged(false); setStatus('Terms frozen. No deposit or serving activation occurred.'); }
      }, true)}>Freeze terms · version {campaign?.version ?? '—'}</Ld.Button>
    </fieldset>}
    <fieldset className="account-fields" disabled={busy}>
      <legend>Own channels · {role}</legend>
      <label className="ld-field-l" htmlFor={`${prefix}-channel`}>Saved channel</label>
      <select className="ld-select" id={`${prefix}-channel`} value={channelId} onChange={e => { setChannelId(e.target.value); setSigning(null); setAcknowledged(false); setError(''); }}>
        <option value="">Choose a loaded channel</option>{channels.map(c => <option key={c.id} value={c.id}>{c.id} · {c.phase}</option>)}
      </select>
      {!channels.length && <p className="ld-secondary">No channels loaded. Use Load wallet proof and own channels to inspect saved state.</p>}
      {channel && <>
        <dl className="account-readiness account-break">
          <div><dt>Phase / open / close</dt><dd>{channel.phase} / {channel.openStatus} / {channel.closeStatus}</dd></div>
          <div><dt>Serving</dt><dd>{channel.servingEnabled ? 'Enabled for new matching' : 'Off for new matching'}</dd></div>
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
        {(blocked || channel.requiresReconciliation) && <p role="alert">An operation is uncertain or needs reconciliation. Do not create replacement terms or repeat a signature submission. Reload saved records and reconcile explicitly; unresolved preparation may need operator recovery.</p>}
        {role === 'payer' && <div className="ld-row">
          <Ld.Button disabled={blocked || channel.requiresReconciliation || channel.phase !== 'funded' || channel.servingEnabled} onClick={() => void run('Explicitly activating funded channel serving…', async current => {
            const value = await finance.serving(organizationId, channel, true, role); if (current()) { result(value); setStatus('Serving explicitly activated for the frozen funded channel.'); }
          }, true)}>Activate funded channel · version {channel.campaignVersion}</Ld.Button>
          <Ld.Button variant="secondary" disabled={!channel.servingEnabled} onClick={() => void run('Pausing new channel matching…', async current => {
            const value = await finance.serving(organizationId, channel, false, role); if (current()) { result(value); setStatus('New matching paused. Existing reservations and accepted obligations remain.'); }
          }, true)}>Pause channel serving</Ld.Button>
        </div>}
        <div className="ld-row">
          {role === 'payer' && <Ld.Button variant="secondary" disabled={blocked || !canPrepareOpen} onClick={() => prepare('open')}>Prepare opening</Ld.Button>}
          {role === 'payer' && <Ld.Button variant="secondary" disabled={blocked || !canPrepareVoucher} onClick={() => prepare('voucher')}>Prepare next accepted-charge voucher</Ld.Button>}
          <Ld.Button variant="secondary" disabled={blocked || !canPrepareClose} onClick={() => prepare('close')}>Prepare / load cooperative close</Ld.Button>
          <Ld.Button variant="secondary" disabled={!channel.openTransaction && !channel.closeTransaction && channel.phase !== 'authorization_unknown'} onClick={() => void run('Reconciling the saved attempt only…', async current => {
            const value = await finance.reconcile(organizationId, channel); if (current()) { result(value); setStatus(value.channel.requiresReconciliation ? 'Saved attempt is still unresolved. No replacement or silent retry was made.' : 'Saved attempt reconciled. Reload saved records before another operation.'); }
          }, true)}>Reconcile saved attempt</Ld.Button>
        </div>
        {signing && <div className="ld-stack">
          <p className="ld-secondary">Prepared {signing.kind} · terms {signing.termsHash}. Required wallet: {signerAddress}.</p>
          {signing.kind === 'voucher' ? <p className="ld-secondary">Accepted charge {signing.chargeId} · cumulative authorization {signing.previousAmountBaseUnits} → {signing.cumulativeAmountBaseUnits} base units. Only the payer receives the unsigned native message; no signed private voucher is displayed or persisted.</p>
            : <><p className="ld-secondary">Estimated fee/rent bound: {signing.estimatedFeeAndRentLamports} lamports. {signing.kind === 'close' && 'Cooperative close requires both frozen wallets. A partial signature is not payout or finality.'}</p>
              <label className="ld-secondary"><input type="checkbox" checked={acknowledged} disabled={!broadcastEnabled} onChange={e => setAcknowledged(e.target.checked)} /> I authorize this explicit transaction signature submission to broadcast on Solana Devnet when all required signatures are present.</label></>}
          {account?.address !== signerAddress && <p className="ld-secondary">Waiting for the frozen {role} wallet. Connect the exact required address above; no wallet prompt is opened automatically.</p>}
          <Ld.Button disabled={!canSign} onClick={sign}>{signing.kind === 'voucher' ? 'Sign and submit saved voucher authorization' : `Sign and submit ${signing.kind} · may broadcast on Devnet`}</Ld.Button>
          <Ld.Button variant="secondary" onClick={() => { setSigning(null); setAcknowledged(false); setStatus('Browser signing payload discarded. Saved server terms and attempts remain unchanged.'); }}>Discard browser signing payload</Ld.Button>
        </div>}
      </>}
    </fieldset>
  </section>;
}
