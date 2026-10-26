import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash,generateKeyPairSync,sign } from 'node:crypto';
import { encodeAuthorization,decodeAuthorization,base58Encode,publicKeyBytes,ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { domainHash,orderId,unitId,matchId,operationId,verifyAuthorization,effectiveRemaining,aggregateDeltas,fee,isEd25519Point,findProgramAddress,sha256,canonicalResponse } from '../../packages/machine-market/native/domain.mjs';
import { hex,pub } from './native-trading-fixtures.test.mjs';
const h=(...v)=>createHash('sha256').update(Buffer.concat(v)).digest('hex');
test('domain and IDs independently concatenate exact bytes and endian fields',()=>{
  const run={genesis:hex(1),program:pub(2),market:pub(3)},domain=domainHash(run);assert.equal(domain,h(Buffer.from('AXP-MM-V2'),Buffer.alloc(32,1),Buffer.alloc(32,2),Buffer.alloc(32,3)));
  assert.equal(orderId({domain,actor:pub(4),nonce:hex(5)}),h(Buffer.from(domain,'hex'),Buffer.alloc(32,4),Buffer.alloc(32,5)));
  assert.equal(unitId({series:pub(6),serial:258}),h(Buffer.alloc(32,6),Buffer.from([2,1])));
  const cursor=Buffer.alloc(8),gross=Buffer.alloc(8);cursor.writeBigUInt64LE(257n);gross.writeBigUInt64LE(10000n);
  const id=matchId({domain,buyOrderId:hex(7),sellOrderId:hex(8),unit:pub(9),expectedCursor:'257',gross:'10000',fundingKind:1});assert.equal(id,h(Buffer.from(domain,'hex'),Buffer.alloc(32,7),Buffer.alloc(32,8),Buffer.alloc(32,9),cursor,gross,Buffer.from([1])));
  assert.equal(operationId({domain,type:'FundMatch',matchId:id}),h(Buffer.from(domain,'hex'),Buffer.from([3]),Buffer.from(id,'hex')));
});
test('Ed25519 binds entire economic authorization; canonical wire mutation fails retained signature',()=>{
  const pair=generateKeyPairSync('ed25519'),actor=base58Encode(pair.publicKey.export({type:'spki',format:'der'}).subarray(-32)),domain=hex(2),nonce=hex(3);
  const value={kind:'BookOrder',domain,actor,nonce,orderId:orderId({domain,actor,nonce}),side:0,lane:0,series:pub(5),refundFace:'0',exactUnit:ZERO_KEY,expectedCursor:'0',limit:'100',validUntilSlot:'50',minRemainingAfter:0,tif:0,quantity:1};
  const bytes=encodeAuthorization(value),signature=sign(null,bytes,pair.privateKey).toString('base64'),envelope={authorization:bytes.toString('base64'),signature,domain,allowedActors:[actor],currentSlot:'49'};
  assert.equal(verifyAuthorization(envelope).value.actor,actor);assert.throws(()=>verifyAuthorization({...envelope,currentSlot:'50'}),{code:'EXPIRED'});
  for(const change of [{limit:'101'},{tif:1},{minRemainingAfter:1},{nonce:hex(4)},{lane:1,refundFace:'100'}])assert.throws(()=>verifyAuthorization({...envelope,authorization:encodeAuthorization({...value,...change}).toString('base64')}),{code:'INVALID_AUTH'});
  const wrong={...value,orderId:hex(6)},b=encodeAuthorization(wrong);assert.throws(()=>verifyAuthorization({...envelope,authorization:b.toString('base64'),signature:sign(null,b,pair.privateKey).toString('base64')}),{code:'INVALID_AUTH'});
});
test('V7 effective rights reject invalid pairs, primary minima, sponsored overrides and exhausted resales',()=>{
  const valid={transferable:1,maxTransfers:3};for(const invalid of [{transferable:0,maxTransfers:3},{transferable:1,maxTransfers:0}])assert.throws(()=>effectiveRemaining({series:invalid,unit:null,fundingKind:0,minRemainingAfter:0}),{code:'INVALID_INPUT'});
  assert.throws(()=>effectiveRemaining({series:{transferable:0,maxTransfers:0},unit:null,fundingKind:0,minRemainingAfter:1}),{code:'INCOMPATIBLE'});
  assert.equal(effectiveRemaining({series:valid,unit:null,fundingKind:0,minRemainingAfter:3}),3);
  for(let count=0;count<3;count++)assert.equal(effectiveRemaining({series:valid,unit:{sponsored:0,transferCount:count},fundingKind:1,minRemainingAfter:0}),2-count);
  assert.throws(()=>effectiveRemaining({series:valid,unit:{sponsored:0,transferCount:3},fundingKind:1,minRemainingAfter:0}),{code:'INCOMPATIBLE'});
  assert.throws(()=>effectiveRemaining({series:valid,unit:null,fundingKind:2,minRemainingAfter:1}),{code:'INCOMPATIBLE'});
});
test('canonical PDA excludes Ed25519 points; exact bump/hash and public point checks',()=>{
  for(let i=0;i<8;i++){const pair=generateKeyPairSync('ed25519');assert.ok(isEd25519Point(pair.publicKey.export({type:'spki',format:'der'}).subarray(-32)));}
  const seed=Buffer.from('axp-mkt-v2'),program=pub(7),pda=findProgramAddress([seed],program);const expected=h(seed,Buffer.from([pda.bump]),publicKeyBytes(program),Buffer.from('ProgramDerivedAddress'));assert.equal(base58Encode(Buffer.from(expected,'hex')),pda.address);assert.equal(isEd25519Point(publicKeyBytes(pda.address)),false);
  for(let bump=255;bump>pda.bump;bump--)assert.ok(isEd25519Point(Buffer.from(h(seed,Buffer.from([bump]),publicKeyBytes(program),Buffer.from('ProgramDerivedAddress')),'hex')));
});
test('fees and recurring-wallet deltas conserve primary-only claim; canonical response immutable bytes',()=>{
  assert.equal(fee('99'),'0');assert.equal(fee('100'),'1');assert.equal(fee('1000000000'),'10000000');assert.throws(()=>fee('1000000001'),{code:'INVALID_INPUT'});
  const A=pub(1),B=pub(2),collector=pub(3),result=aggregateDeltas([{key:A,delta:-10000n},{key:A,delta:14850n},{key:B,delta:-15000n},{key:B,delta:7920n},{key:A,delta:-8000n},{key:collector,delta:230n}]);assert.equal(result[A],'-3150');assert.equal(result[B],'-7080');assert.equal(result[collector],'230');
  const response=canonicalResponse({z:2,a:'independent content'});assert.equal(response.bytes.toString(),'{"a":"independent content","z":2}');assert.equal(response.responseHash,sha256(response.bytes));
});

test('frozen native account metas preserve writable seller, direct owner Start and secondary primary receipt',async()=>{
  const {instructionMetas,deduplicateMetas}=await import('../../packages/machine-market/native/domain.mjs');
  const roles=['payer','beneficiary','seller','matcher','collector','market','series','unit','match','buyUse','sellUse','primaryMatch'];const accounts=Object.fromEntries(roles.map((name,i)=>[name,pub(i+1)]));accounts.beneficiary=accounts.payer;
  const metas=instructionMetas({type:'Fund',fundingKind:1,accounts});assert.equal(metas.length,13);assert.deepEqual(metas[2],{role:'seller',pubkey:accounts.seller,isSigner:true,isWritable:true});assert.deepEqual(metas[12],{role:'primaryMatch',pubkey:accounts.primaryMatch,isSigner:false,isWritable:false});assert.equal(metas[11].pubkey,ZERO_KEY);
  assert.equal(deduplicateMetas(metas).length,12);assert.equal(deduplicateMetas(metas)[0].isWritable,true);
  const start=instructionMetas({type:'StartDelivery',accounts:{owner:pub(1),market:pub(2),series:pub(3),unit:pub(4)}});assert.deepEqual(start.map(m=>[m.role,m.isSigner,m.isWritable]),[['owner',true,true],['market',false,false],['series',false,false],['unit',false,true]]);
  assert.throws(()=>instructionMetas({type:'Fund',fundingKind:0,accounts}),{code:'INVALID_INPUT'});
});

test('all five PDA families match public cross-language vectors',async()=>{
  const {readFileSync}=await import('node:fs');
  const fixture=JSON.parse(readFileSync(new URL('../../artifacts/machine-market/phase1/pda-vectors.json',import.meta.url)));
  assert.equal(fixture.vectors.length,40);
  for(const v of fixture.vectors)assert.deepEqual(findProgramAddress(v.seeds.map(s=>Buffer.from(s,'hex')),v.program),{address:v.address,bump:v.bump},v.name);
});
