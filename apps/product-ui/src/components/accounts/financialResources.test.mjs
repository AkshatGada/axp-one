// Deterministic component event fixtures, not wallet/browser/network acceptance.
// Transpile the actual TSX and run its hooks in a tiny synchronous fixture host.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import * as financial from './financialClient.ts';
import * as standard from './walletStandard.ts';
import * as accounts from './client.ts';

let host;
const jsx = (type, props, key) => ({ type, props: props ?? {}, key });
const same = (a, b) => a && b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));
const hooks = {
  useState(initial) {
    const h = host, i = h.index++;
    if (!(i in h.slots)) h.slots[i] = typeof initial === 'function' ? initial() : initial;
    return [h.slots[i], value => {
      const next = typeof value === 'function' ? value(h.slots[i]) : value;
      if (!Object.is(next, h.slots[i])) { h.slots[i] = next; h.dirty = true; }
    }];
  },
  useRef(initial) { const h = host, i = h.index++; return h.slots[i] ??= { current: initial }; },
  useId() { host.index++; return 'fixture-panel'; },
  useMemo(fn, deps) { const h = host, i = h.index++; if (!same(h.slots[i]?.deps, deps)) h.slots[i] = { deps, value: fn() }; return h.slots[i].value; },
  useEffect(fn, deps) { const h = host, i = h.index++; if (!same(h.slots[i]?.deps, deps)) h.effects.push(() => {
    h.slots[i]?.cleanup?.(); h.slots[i] = { deps, cleanup: fn() };
  }); },
};
const source = readFileSync(new URL('./financialResources.tsx', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
const imports = { react: hooks, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' }, '@axp/design-system/ledger': { Ld: { Button: 'button' } },
  './client': accounts, './financialClient': financial, './walletStandard': standard };
new Function('require', 'module', 'exports', compiled)(name => { assert.ok(name in imports, `unexpected dependency ${name}`); return imports[name]; }, module, module.exports);
const Component = module.exports.AccountFinancialResources;
function text(node) { return node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node.props?.children); }
function nodes(node, disabled = false, result = []) {
  if (!node || typeof node !== 'object') return result;
  if (Array.isArray(node)) { node.forEach(child => nodes(child, disabled, result)); return result; }
  const blocked = disabled || node.props.disabled === true;
  result.push({ ...node, disabled: blocked }); nodes(node.props.children, blocked, result); return result;
}
function mount(props, target = new EventTarget()) {
  const h = { props, target, slots: [], index: 0, effects: [], dirty: true, tree: null, key: null };
  globalThis.window = target;
  const unmount = () => { h.slots.forEach(slot => slot?.cleanup?.()); h.slots = []; };
  const render = () => {
    globalThis.window = target;
    do {
      h.dirty = false; host = h;
      const root = Component(h.props);
      if (root.key !== h.key) { unmount(); h.key = root.key; }
      h.index = 0; h.tree = root.type(root.props);
      h.effects.splice(0).forEach(effect => effect());
    } while (h.dirty);
    return h.tree;
  };
  const find = predicate => { render(); const result = nodes(h.tree).find(predicate); assert.ok(result, 'fixture control not found'); return result; };
  const button = label => find(node => node.type === 'button' && text(node) === label);
  async function settle() { for (let i = 0; i < 5; i++) { await new Promise(resolve => setImmediate(resolve)); render(); } }
  return { render, unmount, button, text: () => text(render()),
    async click(label) { const node = button(label); assert.equal(node.disabled, false, `disabled control: ${label}`); node.props.onClick(); await settle(); },
    async change(suffix, value) { const node = find(node => node.props.id?.endsWith(suffix)); assert.equal(node.disabled, false); node.props.onChange({ target: { value } }); await settle(); },
    async check(value) { const node = find(node => node.type === 'input' && node.props.type === 'checkbox'); assert.equal(node.disabled, false); node.props.onChange({ target: { checked: value } }); await settle(); },
    async props(next) { h.props = { ...h.props, ...next }; render(); await settle(); }, settle,
  };
}
const org = '10000000-0000-4000-8000-000000000001', campaignId = '20000000-0000-4000-8000-000000000001';
const appId = '30000000-0000-4000-8000-000000000001', channelId = '40000000-0000-4000-8000-000000000001';
const publicKey = new Uint8Array(32).fill(7), payer = standard.base58(publicKey), payee = standard.base58(new Uint8Array(32).fill(8));
const campaign = { id: campaignId, organizationId: org, version: 2, status: 'approved', input: { name: 'Fixture campaign', settlementNetwork: 'solana-devnet', budgetCapBaseUnits: '10000' } };
const app = { id: appId, organizationId: org, name: 'Fixture app' };
const baseChannel = { id: channelId, campaignId, campaignVersion: 2, appId, financialMode: 'devnet', settlementNetwork: 'solana-devnet', asset: 'USDC', decimals: 6,
  signingMode: 'own_wallet', payer, payee, depositBaseUnits: '20000', chargeCapBaseUnits: '10000', termsHash: 'a'.repeat(64), phase: 'frozen', protocolChannelId: null,
  authorizedBaseUnits: '0', paidBaseUnits: '0', refundBaseUnits: '0', feeAndRentLamports: '0', openStatus: 'not_prepared', closeStatus: 'not_prepared',
  openTransaction: null, closeTransaction: null, requiresReconciliation: false, servingEnabled: false, createdAt: 1, pendingAuthorizationStatus: null };
function transaction() {
  const bytes = new Uint8Array(134); bytes[0] = 1; bytes.set([1, 0, 0, 1], 65); bytes.set(publicKey, 69);
  return standard.bytesToBase64(bytes);
}
function fixture(overrides = {}) {
  const requests = [], walletCalls = [], target = new EventTarget();
  let saved = { ...baseChannel, ...overrides };
  let respond;
  const client = { async campaigns() { requests.push({ path: 'campaigns' }); return { campaigns: [campaign] }; },
    async organization() { requests.push({ path: 'organization' }); return { apps: [app] }; },
    async financeRequest(path, body) {
      requests.push({ path, body });
      if (respond) return respond(path, body);
      if (path.endsWith('/wallet')) return { wallet: null };
      if (path.endsWith('/channels')) return { channels: [saved] };
      if (path.endsWith('/open/prepare')) {
        saved = { ...saved, phase: 'awaiting_open_signature', openStatus: 'prepared', requiresReconciliation: false };
        return { channel: saved, signing: { kind: 'open', termsHash: saved.termsHash, wireBase64: transaction(), requiredSigners: [payer], estimatedFeeAndRentLamports: '5000' } };
      }
      if (path.endsWith('/open/sign')) { saved = { ...saved, phase: 'funded', openStatus: 'finalized', openTransaction: 'fixture-tx', servingEnabled: false }; return { channel: saved }; }
      if (path.endsWith('/serving')) { saved = { ...saved, servingEnabled: body.enabled }; return { channel: saved }; }
      assert.fail(`unexpected fixture request: ${path}`);
    } };
  const account = { address: payer, publicKey, chains: ['solana:devnet'], features: ['solana:signMessage', 'solana:signTransaction'] };
  const wallet = { name: 'Fixture wallet', chains: ['solana:devnet'], accounts: [account], features: {
    'standard:connect': { async connect() { walletCalls.push('connect'); return { accounts: [account] }; } },
    'solana:signMessage': { async signMessage(input) { walletCalls.push('message'); return [{ signedMessage: input.message, signature: new Uint8Array(64).fill(3) }]; } },
    'solana:signTransaction': { async signTransaction(input) { walletCalls.push('transaction'); const signed = input.transaction.slice(); signed.fill(3, 1, 65); return [{ signedTransaction: signed }]; } },
  } };
  target.addEventListener('wallet-standard:app-ready', event => event.detail.register(wallet));
  const ui = mount({ client, organizationId: org, campaigns: [campaign], apps: [app], ready: true, broadcastEnabled: false }, target);
  async function select(kind = 'campaigns') {
    await ui.change('-kind', kind); await ui.change('-resource', kind === 'campaigns' ? campaignId : appId);
    await ui.click('Load wallet proof and own channels'); await ui.change('-channel', channelId);
  }
  async function connect() { await ui.change('-wallet', '0'); await ui.change('-address', payer); await ui.click('Connect expected wallet'); }
  return { ui, requests, walletCalls, select, connect, wallet, setResponder(fn) { respond = fn; }, saved: () => saved };
}
test('panel render, discovery and resource reads never connect, sign, broadcast or auto-activate', async () => {
  const f = fixture();
  assert.match(f.ui.text(), /Solana Devnet/); assert.match(f.ui.text(), /Payments are not available yet/);
  assert.equal(f.requests.length, 0); assert.equal(f.walletCalls.length, 0);
  await f.select(); assert.equal(f.requests.length, 2); assert.ok(f.requests.every(r => r.body === undefined));
  await f.ui.click('Prepare opening'); assert.equal(f.walletCalls.length, 0);
  assert.equal(f.ui.button('Sign and submit open · may broadcast on Devnet').disabled, true);
  assert.equal(f.requests.some(r => r.path.endsWith('/serving')), false); f.ui.unmount();
});
test('funding and activation require distinct clicks plus server broadcast gate and acknowledgement', async () => {
  const f = fixture(); await f.ui.props({ broadcastEnabled: true }); await f.select(); await f.connect(); await f.ui.click('Prepare opening');
  assert.equal(f.ui.button('Sign and submit open · may broadcast on Devnet').disabled, true);
  await f.ui.check(true); await f.ui.click('Sign and submit open · may broadcast on Devnet');
  assert.deepEqual(f.walletCalls, ['connect', 'transaction']); assert.equal(f.saved().servingEnabled, false);
  await f.ui.click('Activate funded channel · version 2'); assert.equal(f.saved().servingEnabled, true);
  await f.ui.click('Pause channel serving'); assert.equal(f.saved().servingEnabled, false);
  assert.deepEqual(f.requests.filter(r => r.path.endsWith('/serving')).map(r => r.body), [{ expectedVersion: 2, enabled: true }, { expectedVersion: 2, enabled: false }]); f.ui.unmount();
});
test('app payout view has no activation/open/voucher controls or private voucher payload', async () => {
  const f = fixture({ phase: 'funded', openStatus: 'finalized' }); await f.select('apps');
  const output = f.ui.text(); assert.doesNotMatch(output, /Activate funded channel|Prepare opening|Prepare next accepted-charge voucher/);
  assert.match(output, /Prepare \/ load cooperative close/); assert.equal(f.walletCalls.length, 0); f.ui.unmount();
});
test('unsigned interrupted preparation can explicitly recover after load; signed unknown is reconcile-only', async () => {
  const interrupted = fixture({ phase: 'preparation_unknown', openStatus: 'preparing', requiresReconciliation: true });
  await interrupted.select(); assert.equal(interrupted.ui.button('Prepare opening').disabled, false);
  await interrupted.ui.click('Prepare opening'); assert.equal(interrupted.requests.filter(r => r.body !== undefined).length, 1); interrupted.ui.unmount();
  const unknown = fixture({ phase: 'open_submitted', openStatus: 'unknown', requiresReconciliation: true, openTransaction: 'fixture-saved-signature' });
  await unknown.select(); assert.equal(unknown.ui.button('Prepare opening').disabled, true); assert.equal(unknown.ui.button('Reconcile saved attempt').disabled, false); unknown.ui.unmount();
});
test('unknown prepare errors stop without retry and require explicit reload before re-preparation', async () => {
  const f = fixture(); await f.select();
  f.setResponder(async () => { throw Error('PRIVATE_RPC_DIAGNOSTIC'); });
  await f.ui.click('Prepare opening'); assert.equal(f.requests.filter(r => r.path.endsWith('/open/prepare')).length, 1);
  assert.equal(f.ui.button('Prepare opening').disabled, true); assert.doesNotMatch(f.ui.text(), /PRIVATE_RPC/); assert.match(f.ui.text(), /No automatic retry/);
  await f.ui.change('-channel', ''); await f.ui.change('-channel', channelId);
  assert.equal(f.ui.button('Prepare opening').disabled, true); f.ui.unmount();
});
test('interrupted unsigned voucher preparation can explicitly recover; signed unknown remains reconcile-only', async () => {
  const unsigned = fixture({ phase: 'authorization_unknown', pendingAuthorizationStatus: 'preparing', requiresReconciliation: true });
  await unsigned.select(); assert.equal(unsigned.ui.button('Prepare next accepted-charge voucher').disabled, false);
  unsigned.setResponder(async path => { assert.ok(path.endsWith('/voucher/prepare')); return { channel: { ...unsigned.saved(), phase: 'funded', pendingAuthorizationStatus: null, requiresReconciliation: false }, signing: null }; });
  await unsigned.ui.click('Prepare next accepted-charge voucher'); assert.equal(unsigned.requests.filter(r => r.path.endsWith('/voucher/prepare')).length, 1); unsigned.ui.unmount();
  const signed = fixture({ phase: 'authorization_unknown', pendingAuthorizationStatus: 'unknown', requiresReconciliation: true });
  await signed.select(); assert.equal(signed.ui.button('Prepare next accepted-charge voucher').disabled, true); assert.equal(signed.ui.button('Reconcile saved attempt').disabled, false); signed.ui.unmount();
});
test('an org change while a wallet signature waits clears private state and prevents submission', async () => {
  const f = fixture(); await f.ui.props({ broadcastEnabled: true }); await f.select(); await f.connect(); await f.ui.click('Prepare opening'); await f.ui.check(true);
  let resolve;
  f.wallet.features['solana:signTransaction'].signTransaction = input => new Promise(done => { resolve = () => { const signed = input.transaction.slice(); signed.fill(3, 1, 65); done([{ signedTransaction: signed }]); }; });
  await f.ui.click('Sign and submit open · may broadcast on Devnet'); assert.ok(resolve);
  await f.ui.props({ organizationId: appId }); assert.doesNotMatch(f.ui.text(), new RegExp(channelId));
  assert.match(f.ui.text(), /No wallet connected/); resolve(); await f.ui.settle();
  assert.equal(f.requests.some(r => r.path.endsWith('/open/sign')), false); f.ui.unmount();
});
test('voucher authorization is payer-only, explicit and never renders private native voucher material', async () => {
  const f = fixture({ phase: 'funded', openStatus: 'finalized' }); await f.select(); await f.connect();
  f.setResponder(async (path, body) => {
    if (path.endsWith('/voucher/prepare')) return { channel: f.saved(), signing: {
      kind: 'solana-voucher', network: 'solana-devnet', signatureType: 'ed25519', termsHash: baseChannel.termsHash,
      signer: payer, messageBase64: 'AQID', chargeId: 'fixture-charge', previousAmountBaseUnits: '0', cumulativeAmountBaseUnits: '1000',
      voucher: { signature: 'PRIVATE_VOUCHER' }, signingPayload: { signature: 'PRIVATE_VOUCHER' },
    } };
    assert.ok(path.endsWith('/voucher/sign')); assert.deepEqual(Object.keys(body), ['signature']);
    return { channel: { ...f.saved(), authorizedBaseUnits: '1000' } };
  });
  await f.ui.click('Prepare next accepted-charge voucher');
  assert.deepEqual(f.walletCalls, ['connect']); assert.doesNotMatch(f.ui.text(), /PRIVATE_VOUCHER|AQID/);
  await f.ui.click('Sign and submit saved voucher authorization');
  assert.deepEqual(f.walletCalls, ['connect', 'message']);
  assert.equal(f.requests.filter(r => r.path.endsWith('/voucher/sign')).length, 1);
  assert.match(f.ui.text(), /not a finalized payout/); f.ui.unmount();
});
test('partial cooperative close stops and waits for the other frozen signer without retry', async () => {
  const f = fixture({ phase: 'funded', openStatus: 'finalized' }); await f.ui.props({ broadcastEnabled: true }); await f.select(); await f.connect();
  const closing = { ...f.saved(), phase: 'draining', closeStatus: 'prepared' };
  const closeSigning = { kind: 'close', termsHash: baseChannel.termsHash, wireBase64: transaction(), requiredSigners: [payer, payee], estimatedFeeAndRentLamports: '5000' };
  f.setResponder(async (path, body) => {
    if (path.endsWith('/close/prepare')) return { channel: closing, signing: closeSigning };
    assert.ok(path.endsWith('/close/sign')); assert.deepEqual(Object.keys(body), ['wireBase64']);
    return { channel: closing, signing: closeSigning };
  });
  await f.ui.click('Prepare / load cooperative close'); assert.deepEqual(f.walletCalls, ['connect']);
  await f.ui.check(true); await f.ui.click('Sign and submit close · may broadcast on Devnet');
  assert.match(f.ui.text(), /Waiting for the other frozen wallet signer; not finalized/);
  assert.equal(f.requests.filter(r => r.path.endsWith('/close/sign')).length, 1);
  assert.deepEqual(f.walletCalls, ['connect', 'transaction']);
  assert.equal(nodes(f.ui.render()).some(node => node.type === 'button' && text(node).startsWith('Sign and submit close')), false); f.ui.unmount();
});
test('ownership proof and verification require separate explicit preparation/sign clicks', async () => {
  const f = fixture(); await f.select(); await f.connect();
  f.setResponder(async (path, body) => {
    if (path.endsWith('/wallet/challenge')) return { challengeId: channelId, message: 'Fixture origin/org/resource-bound challenge', encoding: 'utf8',
      signatureEncoding: 'base58', expiresAt: Date.now() + 300000, address: payer, network: 'solana-devnet', purpose: 'funding' };
    assert.ok(path.endsWith('/wallet/verify')); assert.deepEqual(Object.keys(body), ['challengeId', 'signature']);
    return { wallet: { id: channelId, resourceId: campaignId, organizationId: org, ownerId: org, purpose: 'funding', network: 'solana-devnet', address: payer, verifiedAt: 1 } };
  });
  await f.ui.click('Request ownership challenge'); assert.deepEqual(f.walletCalls, ['connect']);
  assert.match(f.ui.text(), /Fixture origin\/org\/resource-bound challenge/);
  await f.ui.click('Sign and verify ownership proof'); assert.deepEqual(f.walletCalls, ['connect', 'message']);
  assert.match(f.ui.text(), /No funds were transferred/); f.ui.unmount();
});
