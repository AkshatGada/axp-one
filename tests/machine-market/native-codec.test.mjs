import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { encodeAuthorization,decodeAuthorization,encodeInstruction,decodeInstruction,encodeAccount,decodeAccount,canonicalBase64,publicKeyBytes,base58Encode,decimal,ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
const golden=JSON.parse(readFileSync(new URL('../../artifacts/machine-market/phase1/golden-vectors.json',import.meta.url)));
const enc={authorization:encodeAuthorization,instruction:encodeInstruction,account:encodeAccount},dec={authorization:decodeAuthorization,instruction:decodeInstruction,account:decodeAccount};
const invalid=fn=>assert.throws(fn,{code:'INVALID_INPUT'});
const get=(family,name)=>golden.vectors.find(v=>v.family===family&&v.name===name);
const lengths={authorization:{BookOrder:238,Cancel:209,SponsorMandate:358,SponsoredConsent:325,DeliveryRequest:209,ReadDelivery:185},instruction:{Init:322,IssueSeries:155,RegisterUnit:68,Fund:316,StartDelivery:106,FinalizeDelivery:106,RefundFailure:74,TimeoutRefund:74,ExpireUnused:42},account:{Market:393,Series:229,Unit:383,Match:619,OrderUse:178}};
for(const vector of golden.vectors)test('golden '+vector.family+' '+vector.name,()=>{
  const bytes=Buffer.from(vector.hex,'hex');assert.equal(bytes.length,lengths[vector.family][vector.name]);assert.deepEqual(enc[vector.family](vector.input),bytes);assert.deepEqual(dec[vector.family](bytes),vector.input);
  invalid(()=>dec[vector.family](Buffer.concat([bytes,Buffer.from([0])])));invalid(()=>dec[vector.family](bytes.subarray(0,-1)));invalid(()=>enc[vector.family]({...vector.input,extra:0}));
});
test('authorization/instruction literal offsets independent of schema descriptors',()=>{
  const auth=Buffer.from(get('authorization','BookOrder').hex,'hex');assert.equal(auth.subarray(0,8).toString(),'AXPAUTH2');assert.equal(auth[8],1);assert.ok(auth.subarray(9,41).every(b=>b===42));assert.ok(auth.subarray(41,73).every(b=>b===43));assert.ok(auth.subarray(73,105).every(b=>b===44));
  assert.equal(auth[137],0);assert.equal(auth[138],0);assert.equal(auth.readBigUInt64LE(171),0n);assert.ok(auth.subarray(179,211).every(b=>b===0));assert.equal(auth.readBigUInt64LE(211),0n);assert.equal(auth.readBigUInt64LE(219),10000n);assert.equal(auth.readBigUInt64LE(227),(1n<<64n)-1n);assert.deepEqual([...auth.subarray(235)],[3,0,1]);
  const fund=Buffer.from(get('instruction','Fund').hex,'hex');assert.equal(fund[0],3);assert.equal(fund[1],2);assert.equal(fund.readBigUInt64LE(202),10000n);assert.equal(fund.readBigUInt64LE(210),12000n);assert.equal(fund.readBigUInt64LE(218),10000n);assert.equal(fund[242],2);assert.equal(fund[243],1);assert.equal(fund.readBigUInt64LE(244),6000n);assert.ok(fund.subarray(252,316).every(n=>n===0));
  const mandate=Buffer.from(get('authorization','SponsorMandate').hex,'hex');assert.equal(mandate[219],2);assert.ok(mandate.subarray(284,348).every(n=>n===0));
});
test('literal account offsets, strict magic, states and high-bit rejection',()=>{
  const market=Buffer.from(get('account','Market').hex,'hex');assert.equal(market.readUInt16LE(362),100);assert.equal(market[364],3);assert.equal(market.readUInt16LE(365),16);assert.equal(market.readUInt16LE(367),64);assert.equal(market.readUInt16LE(369),256);assert.equal(market.readBigUInt64LE(377),150n);assert.equal(market.readBigUInt64LE(385),1000000000n);
  const unit=Buffer.from(get('account','Unit').hex,'hex');assert.equal(unit.readBigUInt64LE(140),(1n<<64n)-1n);assert.equal(unit[148],3);assert.equal(unit[149],0);assert.equal(unit[382],0);
  for(const family of ['authorization','account']){const v=get(family,family==='account'?'Unit':'BookOrder');const b=Buffer.from(v.hex,'hex');b[0]|=128;invalid(()=>dec[family](b));}
  const b=Buffer.from(get('account','Unit').hex,'hex');b[9]=6;invalid(()=>decodeAccount(b));const i=Buffer.from(get('instruction','Fund').hex,'hex');i[1]=1;invalid(()=>decodeInstruction(i));
  for(const type of ['constructor','__proto__','toString']){invalid(()=>encodeAuthorization({kind:type}));invalid(()=>encodeInstruction({type}));invalid(()=>encodeAccount({kind:type}));}
});
test('canonical primitive boundaries reject coercion and noncanonical encodings',()=>{
  for(const value of [0,1n,'01','-1','1.0','1e2','18446744073709551616',' 1'])invalid(()=>decimal(value));assert.equal(decimal('18446744073709551615'),(1n<<64n)-1n);
  for(const value of ['AA','AA=','AA===','AB==',' A A==','AA==\n','-_=='])invalid(()=>canonicalBase64(value));assert.deepEqual(canonicalBase64('AA==',1),Buffer.from([0]));
  assert.deepEqual(publicKeyBytes(ZERO_KEY),Buffer.alloc(32));for(const value of ['1'.repeat(31),'1'.repeat(33),'0'.repeat(32),'O'.repeat(44),Buffer.alloc(32)])invalid(()=>publicKeyBytes(value));assert.equal(base58Encode(Buffer.alloc(32)),ZERO_KEY);
});
test('canonical issuance pairs, counts, enum/quantity and unused mandate slots reject',()=>{
  const issue=get('instruction','IssueSeries').input;
  for(const [transferable,maxTransfers] of [[0,3],[1,0],[2,1],[1,4],[-1,1]])invalid(()=>encodeInstruction({...issue,transferable,maxTransfers}));
  const order=get('authorization','BookOrder').input;for(const changed of [{quantity:2},{tif:2},{side:2},{lane:1},{minRemainingAfter:4},{limit:100},{limit:'00'}])invalid(()=>encodeAuthorization({...order,...changed}));
  const mandate=get('authorization','SponsorMandate').input;invalid(()=>encodeAuthorization({...mandate,eligibleCount:0}));invalid(()=>encodeAuthorization({...mandate,eligibleCount:1}));invalid(()=>encodeAuthorization({...mandate,eligibleKeys:[ZERO_KEY,...mandate.eligibleKeys.slice(1)]}));
});

test('unused lock/terminal account fields must be zero, not ignored padding',()=>{
  const unit=Buffer.from(get('account','Unit').hex,'hex');unit[254]=1;invalid(()=>decodeAccount(unit));
  const match=Buffer.from(get('account','Match').hex,'hex');match[499]=1;invalid(()=>decodeAccount(match));
});
