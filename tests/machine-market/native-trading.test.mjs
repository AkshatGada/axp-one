import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { createTradingStore } from '../../packages/machine-market/native/trading.mjs';
import { decodeAuthorization,ZERO_KEY } from '../../packages/machine-market/native/codec.mjs';
import { sha256 } from '../../packages/machine-market/native/domain.mjs';
import { setup,trade,persist,resolve,hex } from './native-trading-fixtures.test.mjs';
const auth=env=>decodeAuthorization(Buffer.from(env.authorization,'base64'));
const invalid=(fn,code)=>assert.throws(fn,{code});
function cancel(f,name,o,key){return f.envelope(name,{kind:'Cancel',originalOrderId:o.id,originalNonce:o.nonce,originalAuthHash:o.authHash,expectedOrderVersion:String(o.version)},key);}
function primary(f,unit=f.units[0],price='100',buyer='buyerA',at='2'){return trade(f,{unit,price,buyer,at});}
function mandate(f,{budget='1000',perGrant='100',maxGrants=10}={}){
  const e=f.envelope('sponsor',{kind:'SponsorMandate',campaignId:hex(90),series:f.series,packetHash:hex(91),budget,perGrant,maxGrants,eligibleCount:2,eligibleKeys:[f.run.buyerA,f.run.buyerB,ZERO_KEY,ZERO_KEY],validUntilSlot:'900',version:1});
  return f.store.admitCampaign(e,{currentSlot:'2'});
}
function sponsor(f,c,{unit=f.units[0],buyer='buyerA',amount='100',packetHash=c.packetHash,assessment=1}={}){
  const consentEnvelope=f.envelope(buyer,{kind:'SponsoredConsent',orderId:hex(1),campaignId:c.campaignId,campaignVersion:1,series:f.series,unit,cursor:'0',amount,sponsor:f.run.sponsor,packetHash,validUntilSlot:'800',assessment,nontransferable:1});
  return {consentEnvelope,issuerEnvelope:f.order('issuer',{side:1,unit,limit:amount}),currentSlot:'3',walletContext:f.store.captureWallet(f.run.sponsor)};
}
function terminal(f,reason,{unit=f.units[0],slot='10'}={}){
  let u=f.store.getUnit(unit);
  if(reason!=='expiry'){
    const name=u.owner===f.run.buyerA?'buyerA':'buyerB';const env=f.envelope(name,{kind:'DeliveryRequest',unit,expectedCursor:u.cursor,series:f.series,resourceHash:hex(35)});u=f.store.referenceStartDelivery(env,{currentSlot:slot});
  }
  const recipient=['failure','timeout'].includes(reason)?(u.sponsored?u.sponsorRefundKey:u.owner):f.run.issuer;
  const n=BigInt(u.refundFace),fee=['failure','timeout'].includes(reason)?0n:n/100n,values={[recipient]:n-fee};if(fee)values[f.run.collector]=(values[f.run.collector]??0n)+fee;
  const wallets=Object.entries(values).map(([key,delta])=>{const w=f.store.captureWallet(key);return {key,balance:(BigInt(w.balance)+delta).toString(),rent:w.rent};});
  return f.store.referenceTerminal({unit,reason,currentSlot:reason==='timeout'?(BigInt(slot)+150n).toString():slot,expectedCursor:u.cursor,requestHash:u.requestHash,wallets});
}

test('T1 V1 price-time equal asks and both maker-price directions; one principal hold with price improvement',t=>{
  const f=setup(t);const a=f.admit(f.order('issuer',{side:1,unit:f.units[0],limit:'100'}));f.admit(f.order('issuer',{side:1,unit:f.units[1],limit:'100'}));
  const b=f.admit(f.order('buyerA',{limit:'120'}));const m=f.store.getMatch(b.matchId);assert.equal(m.sellOrderId,a.id);assert.equal(m.gross,'100');assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.equal(m.pricingProvenance,'book-maker-price');
  const g=setup(t);const resting=g.admit(g.order('buyerA',{limit:'120'}));const incoming=g.admit(g.order('issuer',{side:1,limit:'100'}));assert.equal(g.store.getMatch(incoming.matchId).buyOrderId,resting.id);assert.equal(g.store.getMatch(incoming.matchId).gross,'120');
});

test('T1 T5 IOC evaluates once, GTC requires explicit valid slot, expiry equality releases holds',t=>{
  const f=setup(t),ioc=f.admit(f.order('buyerA',{limit:'120',tif:1}));assert.equal(ioc.state,'NoFill');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');
  f.admit(f.order('issuer',{side:1,limit:'100'}));assert.equal(f.store.getOrder(ioc.id).state,'NoFill');invalid(()=>f.store.reserveMatch(ioc.id,{currentSlot:'3',walletContext:f.store.captureWallet(f.run.buyerA)}),'PENDING_SETTLEMENT');
  const e=f.order('buyerB',{limit:'90',deadline:'5'});const resting=f.admit(e);assert.equal(resting.state,'Open');assert.equal(f.store.expireOrders({currentSlot:'5'}).expired,1);assert.equal(f.store.getOrder(resting.id).state,'Expired');assert.equal(f.store.captureWallet(f.run.buyerB).held,'0');
  invalid(()=>f.admit(f.order('buyerB',{deadline:'5'}),'5'),'EXPIRED');
});

test('T2 authenticated nonce/new HTTP key preserves identity/priority and rejects changed signed economic bytes',t=>{
  const f=setup(t),e=f.order('buyerA',{limit:'90'},'http-one'),o=f.admit(e);const retry=f.admit({...e,idempotencyKey:'http-two'});assert.equal(retry.id,o.id);assert.equal(retry.sequence,o.sequence);assert.equal(f.store.captureWallet(f.run.buyerA).held,'90');
  const original=auth(e),changed=f.envelope('buyerA',{...original,limit:'91'},'http-three');invalid(()=>f.admit(changed),'NONCE_CONFLICT');
  const malformed={...e,authorization:changed.authorization};invalid(()=>f.admit(malformed),'INVALID_AUTH');
  f.store.cancelUnsigned(cancel(f,'buyerA',o,'cancel'),{currentSlot:'3'});const terminal=f.admit({...e,idempotencyKey:'http-four'});assert.equal(terminal.state,'Cancelled');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');
});

test('T3 cancel/reserve/NeverSignedAbort has no single-leg release and never reopens priority',t=>{
  const f=setup(t),ask=f.admit(f.order('issuer',{side:1})),bid=f.admit(f.order('buyerA'));const m=f.store.getMatch(bid.matchId);
  invalid(()=>f.store.cancelUnsigned(cancel(f,'buyerA',f.store.getOrder(bid.id)),{currentSlot:'3'}),'PENDING_SETTLEMENT');assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');
  f.store.abortNeverSignedMatch(m.id,{expectedVersion:m.version});assert.equal(f.store.getOrder(ask.id).state,'FailedClosed');assert.equal(f.store.getOrder(bid.id).state,'FailedClosed');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');
  assert.equal(f.store.abortNeverSignedMatch(m.id,{expectedVersion:f.store.getMatch(m.id).version}).state,'FailedClosed');
  const a=f.admit(f.order('issuer',{side:1})),b=f.admit(f.order('buyerA'));assert.ok(a.sequence>ask.sequence&&b.sequence>bid.sequence);
});

test('T3 signed/unknown attempt prevents abort, cancellation and new signing; exact bytes survive restart',t=>{
  const f=setup(t,{disk:true}),ask=f.admit(f.order('issuer',{side:1})),bid=f.admit(f.order('buyerA'));let op=persist(f,bid.matchId);const signature=op.attempt.signature;
  invalid(()=>f.store.abortNeverSignedMatch(bid.matchId,{expectedVersion:f.store.getMatch(bid.matchId).version}),'PENDING_SETTLEMENT');
  op=f.store.observeOperation(op.id,{expectedVersion:op.version,contextSlot:'4',status:'unknown'});assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.ok(f.store.projectActor(f.run.buyerA).operatingUnknown);
  invalid(()=>f.store.cancelUnsigned(cancel(f,'buyerA',f.store.getOrder(bid.id)),{currentSlot:'4'}),'PENDING_SETTLEMENT');f.reopen();assert.equal(f.store.getOperation(op.id).attempt.signature,signature);assert.equal(f.store.getOperation(op.id).attempt.transaction,op.attempt.transaction);
  resolve(f,bid.matchId,'5');assert.equal(f.store.getOrder(ask.id).state,'Filled');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');assert.equal(f.store.getUnit(f.units[0]).owner,f.run.buyerA);
});

test('T5 exact finalized failure releases principal/campaign only once; unknown is never assumed failure',t=>{
  const f=setup(t),ask=f.admit(f.order('issuer',{side:1})),bid=f.admit(f.order('buyerA'));const op=persist(f,bid.matchId);resolve(f,bid.matchId,'4',{status:'failure'});
  assert.equal(f.store.captureWallet(f.run.buyerA).balance,'1000000');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');assert.equal(f.store.getOrder(ask.id).state,'FailedClosed');assert.equal(f.store.getUnit(f.units[0]).state,'IssuerOpen');
  const resolved=f.store.getOperation(op.id);assert.equal(f.store.observeOperation(op.id,{expectedVersion:resolved.version,contextSlot:'5',status:'unknown'}).state,'ResolvedFailure');
});

test('V7 invalid/nontransferable primary cannot create any hold; valid primary minimum3 works',t=>{
  const f=setup(t,{transferable:0,maxTransfers:0}),before=f.store.captureWallet(f.run.buyerA);invalid(()=>f.admit(f.order('buyerA',{min:1})),'INCOMPATIBLE');assert.deepEqual(f.store.captureWallet(f.run.buyerA),before);
  primary(f);invalid(()=>f.admit(f.order('buyerA',{side:1,lane:1,cursor:'1'})),'INCOMPATIBLE');
  const g=setup(t);g.admit(g.order('issuer',{side:1}));const b=g.admit(g.order('buyerA',{min:3}));assert.equal(g.store.getMatch(b.matchId).instruction.minRemainingAfter,3);
});

test('V8 incoming ask filters higher bid before selection; reverse direction applies same remaining-rights predicate',t=>{
  const f=setup(t);primary(f);trade(f,{seller:'buyerA',buyer:'buyerB',lane:1,cursor:'1',at:'5'});trade(f,{seller:'buyerB',buyer:'buyerA',lane:1,cursor:'2',at:'7'});
  const high=f.admit(f.order('buyerB',{lane:1,limit:'120',min:1}),'9'),low=f.admit(f.order('buyerB',{lane:1,limit:'110',min:0}),'9');
  const ask=f.admit(f.order('buyerA',{side:1,lane:1,cursor:'3',limit:'100'}),'9');assert.equal(f.store.getMatch(ask.matchId).buyOrderId,low.id);assert.equal(f.store.getMatch(ask.matchId).gross,'110');assert.equal(f.store.getOrder(high.id).state,'Open');
  const g=setup(t);primary(g);trade(g,{seller:'buyerA',buyer:'buyerB',lane:1,cursor:'1',at:'5'});trade(g,{seller:'buyerB',buyer:'buyerA',lane:1,cursor:'2',at:'7'});g.admit(g.order('buyerA',{side:1,lane:1,cursor:'3',limit:'100'}),'9');const b=g.admit(g.order('buyerB',{lane:1,limit:'120',min:1}),'9');assert.equal(b.state,'Open');assert.equal(b.matchId,null);
});

test('T1 EXACT claim-face compatibility skips cheaper same-Series unit',t=>{
  const f=setup(t);primary(f,f.units[0],'100');primary(f,f.units[1],'60','buyerA','5');
  f.admit(f.order('buyerA',{side:1,lane:1,unit:f.units[1],cursor:'1',refundFace:'60',limit:'50'}),'7');const proper=f.admit(f.order('buyerA',{side:1,lane:1,unit:f.units[0],cursor:'1',refundFace:'100',limit:'70'}),'7');
  const b=f.admit(f.order('buyerB',{lane:1,refundFace:'100',limit:'80'}),'7');assert.equal(f.store.getMatch(b.matchId).sellOrderId,proper.id);assert.equal(f.store.getMatch(b.matchId).refundFace,'100');assert.equal(f.store.getMatch(b.matchId).gross,'70');
});

test('V9 delayed higher wallet observation cannot combine with newer retired holds for admission OR signing',t=>{
  const f=setup(t),bid=f.admit(f.order('buyerA',{limit:'100'})),captured=f.store.captureWallet(f.run.buyerA);const ask=f.admit(f.order('issuer',{side:1}));persist(f,ask.matchId);resolve(f,ask.matchId,'10');
  const current=f.store.captureWallet(f.run.buyerA);assert.ok(current.walletStateVersion>captured.walletStateVersion);assert.equal(current.held,'0');
  const next=f.order('buyerA',{limit:'100'});invalid(()=>f.store.admitAuthorization(next,{currentSlot:'11',walletContext:captured}),'STALE_CURSOR');assert.equal(f.store.captureWallet(f.run.buyerA).held,'0');
  f.admit(next,'11');const a2=f.admit(f.order('issuer',{side:1,unit:f.units[1]}),'11');let op=f.store.getOperation(f.store.getMatch(a2.matchId).operationId);op=f.store.prepareNativeOperation(op.id,{expectedVersion:op.version});let signed=false;
  invalid(()=>f.store.persistSignedAttempt(op.id,{expectedVersion:op.version,currentSlot:'12',walletContext:captured,signExact(){signed=true;}}),'STALE_CURSOR');assert.equal(signed,false);
});

test('T3 shared balances enforce aggregate principal holds and reject a second live backend',t=>{
  const f=setup(t,{disk:true});const first=f.admit(f.order('buyerA',{limit:'700000'}));invalid(()=>f.admit(f.order('buyerA',{limit:'300000'})),'INSUFFICIENT_AVAILABLE');assert.equal(f.store.captureWallet(f.run.buyerA).held,'700000');
  invalid(()=>createTradingStore({filename:f.filename,run:f.run}),'RUN_MISMATCH');assert.equal(f.store.getOrder(first.id).state,'Open');f.reopen();assert.equal(f.store.captureWallet(f.run.buyerA).held,'700000');
  const sql=new DatabaseSync(f.filename,{readOnly:true});assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM principal_holds').get().n,1);assert.equal(sql.prepare("SELECT owner_type FROM principal_holds").get().owner_type,'order');sql.close();
});

test('T4 V10 regular-first and sponsor-first share one exact Unit guard and truthful price provenance',t=>{
  const f=setup(t),c=mandate(f);const pending=sponsor(f,c);f.admit(f.order('issuer',{side:1,limit:'100'}));const b=f.admit(f.order('buyerB',{limit:'120'}));invalid(()=>f.store.sponsorAccess(pending),'PENDING_SETTLEMENT');assert.equal(f.store.getCampaign(c.campaignId).activeReservedCount,0);assert.equal(f.store.getMatch(b.matchId).pricingProvenance,'book-maker-price');
  const g=setup(t),c2=mandate(g);const grant=g.store.sponsorAccess(sponsor(g,c2));assert.equal(g.store.getMatch(grant.matchId).pricingProvenance,'sponsored-fixed-price');assert.equal(g.store.getMatch(grant.matchId).gross,'100');
  const higher=g.admit(g.order('buyerB',{limit:'120'}));assert.equal(higher.state,'Open');assert.equal(higher.matchId,null);invalid(()=>g.admit(g.order('issuer',{side:1,limit:'100'})),'PENDING_SETTLEMENT');
});

test('T4 concurrent 60+60/cap100 reserves one, exact negative assessment accepted; refund never replenishes',t=>{
  const f=setup(t,{sponsoredPrice:'60'}),c=mandate(f,{budget:'100',perGrant:'60',maxGrants:2});const grant=f.store.sponsorAccess(sponsor(f,c,{amount:'60',assessment:1}));
  invalid(()=>f.store.sponsorAccess(sponsor(f,c,{amount:'60',unit:f.units[1],buyer:'buyerB'})),'INSUFFICIENT_AVAILABLE');assert.equal(f.store.getCampaign(c.campaignId).activeReservedGross,'60');
  persist(f,grant.matchId,'4');resolve(f,grant.matchId,'5');assert.equal(f.store.getCampaign(c.campaignId).consumedGross,'60');assert.equal(f.store.getCampaign(c.campaignId).activeReservedGross,'0');assert.equal(f.store.getUnit(f.units[0]).sponsored,1);
  invalid(()=>f.admit(f.order('buyerA',{side:1,lane:1,cursor:'1',refundFace:'60'}),'6'),'INCOMPATIBLE');terminal(f,'failure');const after=f.store.getCampaign(c.campaignId);assert.equal(after.refundedGross,'60');assert.equal(after.consumedGross,'60');assert.equal(f.store.captureWallet(f.run.sponsor).balance,'1000000');assert.equal(f.store.captureWallet(f.run.buyerA).balance,'1000000');
  invalid(()=>f.store.sponsorAccess(sponsor(f,c,{amount:'60',unit:f.units[1]})),'INSUFFICIENT_AVAILABLE');
});

test('T4 campaign packet/price/unit/count constraints and unknown allowance survive restart',t=>{
  const f=setup(t,{disk:true}),c=mandate(f,{maxGrants:1});invalid(()=>f.store.sponsorAccess(sponsor(f,c,{packetHash:hex(92)})),'INCOMPATIBLE');invalid(()=>f.store.sponsorAccess(sponsor(f,c,{amount:'101'})),'INCOMPATIBLE');
  const grant=f.store.sponsorAccess(sponsor(f,c));let op=persist(f,grant.matchId);op=f.store.observeOperation(op.id,{expectedVersion:op.version,contextSlot:'4',status:'unknown'});f.reopen();assert.equal(f.store.getCampaign(c.campaignId).activeReservedCount,1);
  invalid(()=>f.store.sponsorAccess(sponsor(f,c,{unit:f.units[1]})),'INSUFFICIENT_AVAILABLE');resolve(f,grant.matchId,'5',{status:'failure'});assert.equal(f.store.getCampaign(c.campaignId).consumedCount,0);assert.equal(f.store.getCampaign(c.campaignId).activeReservedCount,0);
});

for(const outcome of ['failure','delivery','expiry'])test('primary-only P claim, rising/falling immediate Q proceeds and recurring owner: '+outcome,t=>{
  const f=setup(t);primary(f,f.units[0],'10000');trade(f,{seller:'buyerA',buyer:'buyerB',lane:1,cursor:'1',face:'10000',price:'15000',at:'5'});trade(f,{seller:'buyerB',buyer:'buyerA',lane:1,cursor:'2',face:'10000',price:'8000',at:'7'});
  assert.equal(f.store.captureWallet(f.run.buyerA).balance,'996850');assert.equal(f.store.captureWallet(f.run.buyerB).balance,'992920');assert.equal(f.store.captureWallet(f.run.collector).balance,'1000230');assert.equal(f.store.captureWallet(f.run.issuer).balance,'1000000');assert.equal(f.store.getUnit(f.units[0]).refundFace,'10000');
  terminal(f,outcome,{slot:outcome==='expiry'?'1000':'10'});assert.equal(f.store.captureWallet(f.run.buyerB).balance,'992920');
  if(outcome==='failure'){assert.equal(f.store.captureWallet(f.run.buyerA).balance,'1006850');assert.equal(f.store.captureWallet(f.run.collector).balance,'1000230');}else {assert.equal(f.store.captureWallet(f.run.issuer).balance,'1009900');assert.equal(f.store.captureWallet(f.run.collector).balance,'1000330');}
  assert.equal(f.store.projectActor(f.run.buyerA).nativeEvidence,false);assert.ok(f.store.projectActor(f.run.buyerA).matches.filter(m=>m.fundingKind===1).every(m=>m.state==='SecondarySettled'));
});

test('T5 lease survives useBy; equality timeout and no locked expiry payout',t=>{
  const f=setup(t,{useBySlot:'1000'});primary(f);const u=f.store.getUnit(f.units[0]);const env=f.envelope('buyerA',{kind:'DeliveryRequest',unit:u.address,expectedCursor:u.cursor,series:f.series,resourceHash:hex(35)}),lock=f.store.referenceStartDelivery(env,{currentSlot:'999'});
  assert.equal(lock.lockDeadlineSlot,'1149');invalid(()=>f.store.referenceTerminal({unit:u.address,reason:'expiry',currentSlot:'1000',expectedCursor:lock.cursor,wallets:[]}),'INCOMPATIBLE');
  invalid(()=>f.store.referenceTerminal({unit:u.address,reason:'timeout',currentSlot:'1148',expectedCursor:lock.cursor,requestHash:lock.requestHash,wallets:[]}),'EXPIRED');
  const w=f.store.captureWallet(f.run.buyerA);f.store.referenceTerminal({unit:u.address,reason:'timeout',currentSlot:'1149',expectedCursor:lock.cursor,requestHash:lock.requestHash,wallets:[{key:f.run.buyerA,balance:(BigInt(w.balance)+100n).toString(),rent:w.rent}]});assert.equal(f.store.getUnit(u.address).state,'Refunded');
});

test('read-only projection and FULL bounded SQLite configuration',t=>{
  const f=setup(t,{disk:true}),sql=new DatabaseSync(f.filename,{readOnly:true}),before=sql.prepare('SELECT COUNT(*) AS n FROM events').get().n;
  for(let i=0;i<5;i++)f.store.projectActor(f.run.buyerA);assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM events').get().n,before);sql.close();const info=f.store.storageInfo();assert.equal(info.synchronous,2);assert.equal(info.fullfsync,1);assert.ok(info.maximumPages*info.pageSize<=24*1024*1024);assert.ok(info.main+info.wal<50*1024*1024);
});

test('T1 self-cross rejects incoming ask and keeps original bid/hold intact',t=>{
  const f=setup(t);primary(f);const own=f.admit(f.order('buyerA',{lane:1,refundFace:'100',limit:'120'}),'5');
  invalid(()=>f.admit(f.order('buyerA',{side:1,lane:1,cursor:'1',refundFace:'100',limit:'100'}),'5'),'SELF_TRADE');assert.equal(f.store.getOrder(own.id).state,'Open');assert.equal(f.store.captureWallet(f.run.buyerA).held,'120');
});

test('T2 filled order reuse on fresh HTTP key never acquires a second Unit; fresh nonce does',t=>{
  const f=setup(t);f.admit(f.order('issuer',{side:1,unit:f.units[0]}));const bid=f.order('buyerA'),o=f.admit(bid);persist(f,o.matchId);resolve(f,o.matchId);
  f.admit(f.order('issuer',{side:1,unit:f.units[1]}),'5');const replay=f.admit({...bid,idempotencyKey:'another-http-key'},'5');assert.equal(replay.state,'Filled');assert.equal(f.store.getUnit(f.units[1]).state,'IssuerOpen');
  const fresh=f.admit(f.order('buyerA'),'5');assert.equal(fresh.state,'Reserved');assert.notEqual(fresh.id,o.id);
});

test('signer may have signed then throw: committed uncertainty prevents NeverSignedAbort or another attempt',t=>{
  const f=setup(t);f.admit(f.order('issuer',{side:1}));const b=f.admit(f.order('buyerA'));let op=f.store.getOperation(f.store.getMatch(b.matchId).operationId);op=f.store.prepareNativeOperation(op.id,{expectedVersion:op.version});
  invalid(()=>f.store.persistSignedAttempt(op.id,{expectedVersion:op.version,currentSlot:'3',walletContext:f.store.captureWallet(f.run.buyerA),prepared:{blockhash:f.run.matcher,lastValidBlockHeight:'100',feeReserve:'100',rentReserve:'100'},signExact(){throw Error('UNTRUSTED_PRIVATE_ERROR');}}),'PENDING_SETTLEMENT');
  assert.equal(f.store.getOperation(op.id).state,'Quarantined');assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');assert.ok(f.store.projectActor(f.run.buyerA).operatingUnknown);
  invalid(()=>f.store.abortNeverSignedMatch(b.matchId,{expectedVersion:f.store.getMatch(b.matchId).version}),'PENDING_SETTLEMENT');assert.ok(!JSON.stringify(f.store.getOperation(op.id)).includes('UNTRUSTED_PRIVATE_ERROR'));
});

test('economic success with unknown operating fees retains full allowance until separately coherent fee observation',t=>{
  const f=setup(t);f.admit(f.order('issuer',{side:1}));const b=f.admit(f.order('buyerA'));persist(f,b.matchId);let op=resolve(f,b.matchId,'4',{operatingFeesKnown:false});assert.equal(op.state,'ResolvedSuccess');assert.ok(f.store.projectActor(f.run.buyerA).operatingUnknown);
  const w=f.store.captureWallet(f.run.matcher);op=f.store.observeOperatingCost(op.id,{expectedVersion:op.version,contextSlot:'5',fee:'50',rent:'100',wallet:{key:f.run.matcher,balance:(BigInt(w.balance)-150n).toString(),rent:w.rent}});assert.equal(op.state,'ResolvedSuccess');assert.equal(f.store.projectActor(f.run.buyerA).operatingUnknown,false);assert.equal(f.store.captureWallet(f.run.buyerA).balance,'999900');
});

test('ordinary ingress event cap refuses atomically while funded Unit still drains without eviction',t=>{
  const f=setup(t,{disk:true});primary(f);const sql=new DatabaseSync(f.filename);sql.exec('BEGIN');const insert=sql.prepare("INSERT INTO events(type,entity_id,data) VALUES('capacity-fixture','bounded','{}')");while(sql.prepare('SELECT COUNT(*) AS n FROM events').get().n<3072)insert.run();sql.exec('COMMIT');
  const before=f.store.captureWallet(f.run.buyerB);invalid(()=>f.admit(f.order('buyerB',{limit:'90'}),'5'),'CAPACITY');assert.deepEqual(f.store.captureWallet(f.run.buyerB),before);
  terminal(f,'failure',{slot:'6'});assert.equal(f.store.getUnit(f.units[0]).state,'Refunded');assert.ok(sql.prepare('SELECT COUNT(*) AS n FROM events').get().n>3072);sql.close();
});

test('late/conflicting observations never regress economic success or repeat principal payment',t=>{
  const f=setup(t);f.admit(f.order('issuer',{side:1}));const b=f.admit(f.order('buyerA'));persist(f,b.matchId);let op=resolve(f,b.matchId,'10');const w=f.store.captureWallet(f.run.buyerA);
  invalid(()=>f.store.observeOperation(op.id,{expectedVersion:op.version,contextSlot:'9',status:'unknown'}),'STALE_CURSOR');assert.equal(f.store.getUnit(f.units[0]).state,'FundedOpen');
  op=f.store.observeOperation(op.id,{expectedVersion:op.version,contextSlot:'11',status:'failure'});assert.equal(op.state,'Quarantined');assert.equal(f.store.captureWallet(f.run.buyerA).balance,w.balance);
});

test('actual DB enforces three resales maximum even for minimum0 and returning owners',t=>{
  const f=setup(t);primary(f);trade(f,{seller:'buyerA',buyer:'buyerB',lane:1,cursor:'1',at:'5'});trade(f,{seller:'buyerB',buyer:'buyerA',lane:1,cursor:'2',at:'7'});trade(f,{seller:'buyerA',buyer:'buyerB',lane:1,cursor:'3',at:'9'});
  const u=f.store.getUnit(f.units[0]);assert.equal(u.transferCount,3);assert.equal(u.cursor,'4');invalid(()=>f.admit(f.order('buyerB',{side:1,lane:1,cursor:'4',min:0}),'11'),'INCOMPATIBLE');
});

test('signing rechecks aggregate spendable balance before callback, even with a current observation version',t=>{
  const f=setup(t);f.admit(f.order('issuer',{side:1}));const b=f.admit(f.order('buyerA'));const w=f.store.captureWallet(f.run.buyerA);f.store.observeWallet({key:f.run.buyerA,balance:'1000',rent:'1000',contextSlot:'4',expectedVersion:w.walletStateVersion});let op=f.store.getOperation(f.store.getMatch(b.matchId).operationId);op=f.store.prepareNativeOperation(op.id,{expectedVersion:op.version});let called=false;
  invalid(()=>f.store.persistSignedAttempt(op.id,{expectedVersion:op.version,currentSlot:'5',walletContext:f.store.captureWallet(f.run.buyerA),signExact(){called=true;}}),'INSUFFICIENT_AVAILABLE');assert.equal(called,false);assert.equal(f.store.captureWallet(f.run.buyerA).held,'100');
});
