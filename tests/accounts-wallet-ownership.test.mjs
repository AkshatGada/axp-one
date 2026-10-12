// Non-spending ownership acceptance. These are explicitly fictional resource
// owners and ephemeral Ed25519 keys, not hosted Auth or wallet-extension proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync, randomUUID, sign} from 'node:crypto';
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createFixtureFinancialRepository} from '../packages/accounts/financial-repository.mjs';
import {createAccountFinancialService} from '../packages/accounts/financial-service.mjs';
import {base58} from '../packages/hosted/wallets.mjs';

const wallet = () => {
  const pair = generateKeyPairSync('ed25519');
  return {...pair, address: base58(Buffer.from(pair.publicKey.export({format:'jwk'}).x, 'base64url'))};
};
const signature = (w, c) => base58(sign(null, Buffer.from(c.message, 'utf8'), w.privateKey));
const denied = code => e => e.code === code;
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'axp-ownership-only-'));
  const a = {actor:randomUUID(), org:randomUUID(), resource:randomUUID(), purpose:'funding'};
  const b = {actor:randomUUID(), org:randomUUID(), resource:randomUUID(), purpose:'payout'};
  const store = {
    campaign(actor, org, id) {
      if (actor !== a.actor || org !== a.org || id !== a.resource) throw Object.assign(Error('not_found'), {code:'not_found'});
      return {id};
    },
    details(actor, org) {
      if (actor !== b.actor || org !== b.org) throw Object.assign(Error('not_found'), {code:'not_found'});
      return {apps:[{id:b.resource}]};
    },
  };
  let now = 1000000, repository, service;
  const forbidden = async () => {throw Error('payment_or_rpc_must_not_be_called');};
  const start = origin => {
    repository = createFixtureFinancialRepository({path:join(dir, 'proofs.sqlite')});
    service = createAccountFinancialService({repository, store, origin, stateDir:join(dir, 'state'),
      now:() => now, preflight:forbidden, transportFactory:forbidden, broadcastEnabled:false});
  };
  start('https://ownership-fixture.example.invalid');
  t.after(() => {repository.close(); rmSync(dir, {recursive:true, force:true});});
  return {
    a, b, get service() {return service;}, get repository() {return repository;},
    advance(ms) {now += ms;},
    restart(origin='https://ownership-fixture.example.invalid') {repository.close(); start(origin);},
    challenge(r, w) {return service.challenge(r.actor, r.org, r.resource, r.purpose, {address:w.address, network:'solana-devnet'});},
    verify(r, c, sig) {return service.verifyWallet(r.actor, r.org, r.resource, r.purpose, {challengeId:c.challengeId, signature:sig});},
    read(r) {return service.wallet(r.actor, r.org, r.resource, r.purpose);},
  };
}

test('ownership-only: independent funding and payout proofs persist across restart without payment transport', async t => {
  const f = fixture(t);
  for (const r of [f.a, f.b]) {
    assert.equal(await f.read(r), null);
    const w = wallet(), c = await f.challenge(r, w);
    assert.match(c.message, /not a payment authorization/);
    for (const value of [r.actor, r.org, r.resource, r.purpose, w.address]) assert.ok(c.message.includes(value));
    assert.equal(await f.read(r), null); // An unsigned/rejected prompt proves nothing.
    const bound = await f.verify(r, c, signature(w, c));
    assert.equal(bound.address, w.address);
    assert.equal(bound.purpose, r.purpose);
    assert.equal(Object.hasOwn(bound, 'signature'), false);
    f.restart();
    assert.deepEqual(await f.read(r), bound);
  }
  assert.deepEqual(await f.repository.list('channel', f.a.resource), []);
});

test('ownership-only: wrong key and edited message fail without consuming the legitimate proof', async t => {
  const f = fixture(t), w = wallet(), c = await f.challenge(f.a, w);
  await assert.rejects(f.verify(f.a, c, signature(wallet(), c)), denied('wallet_signature_invalid'));
  await assert.rejects(f.verify(f.a, c, signature(w, {...c, message:c.message+' edited'})), denied('wallet_signature_invalid'));
  assert.equal(await f.read(f.a), null);
  assert.equal((await f.repository.get(`wallet-challenge:${c.challengeId}`)).value.consumedAt, null);
  assert.equal((await f.verify(f.a, c, signature(w, c))).address, w.address);
});

test('ownership-only: account, resource, purpose and origin cannot be exchanged', async t => {
  const f = fixture(t), w = wallet(), c = await f.challenge(f.a, w), sig = signature(w, c);
  await assert.rejects(f.verify({...f.a, actor:f.b.actor}, c, sig), denied('not_found'));
  await assert.rejects(f.verify({...f.a, resource:randomUUID()}, c, sig), denied('not_found'));
  await assert.rejects(f.verify(f.b, c, sig), denied('not_found'));
  await assert.rejects(f.verify({...f.a, purpose:'payout'}, c, sig), denied('not_found'));
  f.restart('https://different-fixture.example.invalid');
  await assert.rejects(f.verify(f.a, c, sig), denied('not_found'));
  assert.equal(await f.read(f.a), null);
});

test('ownership-only: an unconsumed expired challenge cannot install a binding', async t => {
  const f = fixture(t), w = wallet(), c = await f.challenge(f.a, w);
  f.advance(300000);
  await assert.rejects(f.verify(f.a, c, signature(w, c)), denied('wallet_challenge_expired'));
  assert.equal(await f.read(f.a), null);
});

test('ownership-only: replay is stable and cannot replace a newer wallet binding after restart', async t => {
  const f = fixture(t), w1 = wallet(), c1 = await f.challenge(f.a, w1), s1 = signature(w1, c1);
  const old = await f.verify(f.a, c1, s1);
  f.advance(1);
  assert.deepEqual(await f.verify(f.a, c1, s1), old);
  const w2 = wallet(), c2 = await f.challenge(f.a, w2);
  const newer = await f.verify(f.a, c2, signature(w2, c2));
  f.restart();
  assert.deepEqual(await f.verify(f.a, c1, s1), old);
  assert.deepEqual(await f.read(f.a), newer);
  assert.notEqual(old.address, newer.address);
});
