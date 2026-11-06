import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {buildDeliveryRequirements, buildPaymentRequired, encodeHeader, validateAuthorizationBinding, transferStage} from '../../packages/arc/protocol.mjs';
import {loadArcSDK} from '../../packages/arc/sdk.mjs';
import {ARC_NETWORK as N, arcRPCURL} from '../../packages/arc/network.mjs';
const payer = `0x${'11'.repeat(20)}`, payTo = `0x${'22'.repeat(20)}`;
test('Studio-derived protocol builds exact USDC requirements and an x402 v2 challenge', () => {
  const requirements = buildDeliveryRequirements({payTo, amountBaseUnits: '1'});
  const required = buildPaymentRequired('https://example.test/receipt/one', requirements);
  assert.equal(required.accepts[0].amount, '1'); assert.equal(required.accepts[0].network, N.caip2);
  assert.equal(required.accepts[0].asset, N.token); assert.equal(required.accepts[0].extra.verifyingContract, N.gatewayWallet);
  assert.deepEqual(JSON.parse(Buffer.from(encodeHeader(required), 'base64')), required);
  assert.throws(() => buildDeliveryRequirements({payTo, amountBaseUnits: '0'}));
  assert.throws(() => buildDeliveryRequirements({payTo: `0x${'0'.repeat(40)}`, amountBaseUnits: '1'}));
  assert.equal(transferStage('received'), 'accepted'); assert.equal(transferStage('confirmed'), 'confirmed');
  assert.equal(transferStage('completed'), 'finalized');
});
test('authorization is bound to amount, payer, publisher, resource, network and validity', () => {
  const requirements = buildDeliveryRequirements({payTo, amountBaseUnits: '4000'}), resourceUrl = 'https://example.test/receipt/one';
  const payload = {x402Version: 2, accepted: requirements, resource: {url: resourceUrl}, payload: {
    signature: `0x${'a'.repeat(130)}`, authorization: {from: payer, to: payTo, value: '4000', nonce: `0x${'a'.repeat(64)}`, validAfter: '0', validBefore: '700000'},
  }};
  assert.equal(validateAuthorizationBinding({payload, requirements, resourceUrl, payer, nowSeconds: 1}).value, '4000');
  for (const mutation of [p => {p.payload.authorization.value = '4001';}, p => {p.payload.authorization.to = payer;},
    p => {p.payload.authorization.from = payTo;}, p => {p.resource.url += 'different';}, p => {p.accepted.network = 'eip155:1';},
    p => {p.payload.authorization.validBefore = '100';}, p => {p.payload.authorization.nonce = '0x123';}]) {
    const changed = structuredClone(payload); mutation(changed);
    assert.throws(() => validateAuthorizationBinding({payload: changed, requirements, resourceUrl, payer, nowSeconds: 1}));
  }
  assert.throws(() => arcRPCURL('https://user:secret@example.test')); assert.throws(() => arcRPCURL('http://example.test'));
});
test('official Circle SDK creates a verifiable Arc EIP-3009 authorization without RPC or transfers', {skip: !existsSync(new URL('../../tooling/arc-sdk/node_modules/@circle-fin/x402-batching/package.json', import.meta.url))}, async () => {
  const {client, accounts, viem} = loadArcSDK(), account = accounts.privateKeyToAccount(accounts.generatePrivateKey());
  let typedData;
  const scheme = new client.BatchEvmScheme({address: account.address, signTypedData: async data => {typedData = data; return account.signTypedData(data);}});
  const requirements = buildDeliveryRequirements({payTo, amountBaseUnits: '1'}), partial = await scheme.createPaymentPayload(2, requirements);
  const resourceUrl = 'https://example.test/receipt/one', payload = {...partial, accepted: requirements, resource: {url: resourceUrl}};
  validateAuthorizationBinding({payload, requirements, resourceUrl, payer: account.address});
  assert.equal(typedData.domain.chainId, N.chainId); assert.equal(typedData.domain.name, 'GatewayWalletBatched');
  assert.equal(typedData.domain.verifyingContract.toLowerCase(), N.gatewayWallet.toLowerCase());
  assert.equal(await viem.verifyTypedData({...typedData, address: account.address, signature: partial.payload.signature}), true);
});

test('signed zero-value approval preserves exact chain, amount, recipient, nonce and fee identity', {skip: !existsSync(new URL('../../tooling/arc-sdk/node_modules/@circle-fin/x402-batching/package.json', import.meta.url))}, async () => {
  const {validateArcNativeTransaction} = await import('../../packages/arc/transport.mjs');
  const {viem: v, accounts} = loadArcSDK(), account = accounts.privateKeyToAccount(accounts.generatePrivateKey());
  const request = {chainId: N.chainId, type: 'eip1559', to: N.token, value: 0n, nonce: 0, gas: 80000n, maxFeePerGas: 30000000000n, maxPriorityFeePerGas: 1000000000n,
    data: v.encodeFunctionData({abi: v.erc20Abi, functionName:'approve',args:[N.gatewayWallet,20000n]})};
  const wire = await account.signTransaction(request), signed = {kind:'approve', amountBaseUnits:'20000', nonce:0,wire,transactionHash:v.keccak256(wire),feeReservationAttoUSD:String(request.gas*request.maxFeePerGas)};
  assert.equal((await validateArcNativeTransaction(signed, account.address)).chainId, N.chainId);
  await assert.rejects(validateArcNativeTransaction({...signed, amountBaseUnits:'20001'}, account.address));
  await assert.rejects(validateArcNativeTransaction({...signed, nonce:1}, account.address));
  await assert.rejects(validateArcNativeTransaction({...signed, feeReservationAttoUSD:'1'}, account.address));
  const wrongWire = await account.signTransaction({...request, chainId:1});
  await assert.rejects(validateArcNativeTransaction({...signed, wire:wrongWire,transactionHash:v.keccak256(wrongWire)}, account.address));
});

test('saved payment integrity survives canonical SQLite persistence without re-signing', {skip: !existsSync(new URL('../../tooling/arc-sdk/node_modules/@circle-fin/x402-batching/package.json', import.meta.url))}, async () => {
  const {validateArcPaymentIntegrity} = await import('../../packages/arc/transport.mjs');
  const {canonical} = await import('../../packages/contracts/index.mjs');
  const {client,accounts,viem:v} = loadArcSDK(), account=accounts.privateKeyToAccount(accounts.generatePrivateKey());
  const r=buildDeliveryRequirements({payTo,amountBaseUnits:'2000'}), scheme=new client.BatchEvmScheme({address:account.address,signTypedData:d=>account.signTypedData(d)});
  const partial=await scheme.createPaymentPayload(2,r), payload={...partial,accepted:r,resource:{url:'https://example.test/receipt/one',description:'A receipt',mimeType:'application/json'}};
  for(const encoding of ['legacy','canonical-json-v1']) {
    const signed={requirements:r,payload,nonce:payload.payload.authorization.nonce,payloadHash:v.keccak256(v.toHex(encoding==='legacy'?JSON.stringify(payload):canonical(payload))),...(encoding==='legacy'?{}:{payloadHashEncoding:encoding})};
    const saved=JSON.parse(canonical(signed));
    assert.doesNotThrow(()=>validateArcPaymentIntegrity(saved,account.address,payTo));
    assert.equal(saved.payload.payload.signature,payload.payload.signature);
    saved.payload.payload.authorization.value='2001';
    assert.throws(()=>validateArcPaymentIntegrity(saved,account.address,payTo));
  }
});
