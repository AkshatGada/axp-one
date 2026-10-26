/** Scripted RPC responses only: real core/store/fences/signatures; no socket, validator or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync,sign} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {goldenVectors} from '../../packages/machine-market/native/golden.mjs';
import {base58Encode,encodeAccount,encodeAuthorization,ZERO_KEY,ZERO_HASH} from '../../packages/machine-market/native/codec.mjs';
import {domainHash,deriveMarketPda,deriveSeriesPda,deriveUnitPda,unitId,operationId,orderId,sha256,seriesTermsHash,fundTermsHash} from '../../packages/machine-market/native/domain.mjs';
import {createTradingStore} from '../../packages/machine-market/native/trading.mjs';
import {parseTransaction} from '../../packages/machine-market/native/transaction.mjs';
import {createLocalRpc,BPF_LOADER} from '../../packages/machine-market/native/rpc.mjs';
import {createImmutableSources} from '../../packages/machine-market/native/delivery.mjs';
import {createNativeObserver} from '../../packages/machine-market/native/observations.mjs';
import {createNativeService} from '../../packages/machine-market/native/service.mjs';
const key=n=>base58Encode(Buffer.alloc(32,n)),hex=n=>Buffer.alloc(32,n).toString('hex');
const defaults=kind=>structuredClone(goldenVectors().vectors.find(v=>v.family==='account'&&v.name===kind).input);

for(const scenario of ['service','direct','failure','finalize-response-loss'])test('real native trading store delivery scenario='+scenario+' with restart and exact replay guards', {timeout:15000}, async t=>{
 const directStart=scenario==='direct',sourceFailure=scenario==='failure';let sourceAvailable=true;
 const generated=Array.from({length:3},()=>generateKeyPairSync('ed25519'));const publicKeys=generated.map(k=>base58Encode(k.publicKey.export({format:'der',type:'spki'}).subarray(-32)));
 const run={genesis:hex(50),program:key(51),initializer:publicKeys[0],marketNonce:hex(2),matcher:publicKeys[0],gateway:publicKeys[0],collector:key(3),issuer:publicKeys[1],buyerA:publicKeys[2],buyerB:key(6),sponsor:key(7)};run.market=deriveMarketPda(run).address;
 const directory=await mkdtemp(path.join(tmpdir(),'axp-native-service-'));t.after(()=>rm(directory,{recursive:true,force:true}));const filename=path.join(directory,'trading.sqlite');let store=createTradingStore({filename,run,mode:'native'});t.after(()=>store.close());
 const domain=domainHash(run),content='Immutable independent owned fixture.';let slot=100;
 const seriesId=hex(8),seriesAddress=deriveSeriesPda({...run,seriesId}).address;
 const seriesTerms={seriesId,issuer:run.issuer,resourceHash:sha256(Buffer.from(content)),versionHash:sha256(Buffer.from('v1')),format:0,useBySlot:'200',sponsoredPrice:'10000',cap:1,maxTransfers:3,transferable:1,contentBytes:Buffer.byteLength(content)};
 store.registerSeries({address:seriesAddress,...seriesTerms,currentSlot:'100'});const uid=unitId({series:seriesAddress,serial:0}),unitAddress=deriveUnitPda({...run,unitId:uid}).address;store.registerUnit({address:unitAddress,series:seriesAddress,serial:0,currentSlot:'100'});
 const roleKeys=[...new Set([run.matcher,run.issuer,run.buyerA,run.buyerB,run.sponsor,run.collector])];for(const actor of roleKeys)store.observeWallet({key:actor,balance:'1000000000',rent:'1000',contextSlot:'100',expectedVersion:0});
 const raw=new Map(roleKeys.map(actor=>[actor,{owner:ZERO_KEY,lamports:1000000000,executable:false,data:['','base64'],rentEpoch:18446744073709551615}]));
 const programBytes=Buffer.alloc(80);Buffer.from([127,69,76,70]).copy(programBytes);raw.set(run.program,{owner:BPF_LOADER,lamports:1000000,executable:true,data:[programBytes.toString('base64'),'base64']});raw.set(ZERO_KEY,{owner:ZERO_KEY,lamports:1000000,executable:true,data:['','base64']});
 const market={...defaults('Market'),market:run.market,...Object.fromEntries(['initializer','marketNonce','genesis','matcher','gateway','issuer','buyerA','buyerB','sponsor'].map(k=>[k,run[k]])),feeCollector:run.collector,issuedSeries:0,issuedUnits:0,fundedMatches:0};
 const put=(address,account,lamports)=>raw.set(address,{owner:run.program,lamports,executable:false,data:[encodeAccount(account).toString('base64'),'base64'],rentEpoch:18446744073709551615});put(run.market,market,1000);
 const series={kind:'Series',state:1,market:run.market,...seriesTerms,termsHash:seriesTermsHash(seriesTerms),issued:0};
 let unit={...defaults('Unit'),market:run.market,series:seriesAddress,unitId:uid,serial:0,owner:run.issuer,state:0,cursor:'0',transferCount:0,sponsored:0,primaryMatch:ZERO_KEY,latestMatch:ZERO_KEY,refundFace:'0',sponsorRefundKey:ZERO_KEY,requestHash:ZERO_HASH,lockStartCursor:'0',lockStartSlot:'0',lockDeadlineSlot:'0',terminalOpHash:ZERO_HASH,responseHash:ZERO_HASH,terminalSlot:'0',terminalReason:0};let primary;
 const transactions=new Map();let sends=0,signs=0;const captured=[];
 const debit=(actor,amount)=>{raw.get(actor).lamports-=amount;};const credit=(actor,amount)=>{raw.get(actor).lamports+=amount;};
 const fetchImpl=async(_url,options)=>{
  const r=JSON.parse(options.body);let result;
  switch(r.method){
   case'getGenesisHash':result=key(50);break;
   case'getMultipleAccounts':result={context:{slot},value:r.params[0].map(address=>raw.get(address)??null)};break;
   case'getLatestBlockhash':result={context:{slot},value:{blockhash:key(55),lastValidBlockHeight:2000}};break;
   case'getFeeForMessage':result={context:{slot},value:5000};break;
   case'getMinimumBalanceForRentExemption':result=1000;break;
   case'getSlot':result=slot;break;case'getBlockHeight':result=100;break;
   case'isBlockhashValid':result={context:{slot},value:true};break;
   case'getTransaction':result=transactions.get(r.params[0])??null;break;
   case'sendTransaction':{
    sends++;const tx=parseTransaction(r.params[0]),i=tx.instruction,op=store.native.get(i.operationId),a=op.accounts;assert.equal(op.state,'Submitted');assert.equal(op.attempt.transaction,r.params[0]);captured.push(i.type);
    const pre=tx.accountKeys.map(address=>raw.get(address)?.lamports??0);debit(tx.accountKeys[0],5000);
    if(i.type==='IssueSeries'){put(seriesAddress,series,1000);debit(run.matcher,1000);market.issuedSeries=1;put(run.market,market,1000);}
    else if(i.type==='RegisterUnit'){put(unitAddress,unit,1000);debit(run.matcher,1000);series.issued=1;put(seriesAddress,series,1000);market.issuedUnits=1;put(run.market,market,1000);}
    else if(i.type==='Fund'){
     assert.equal(i.fundingKind,0);debit(a.payer,Number(i.gross));debit(run.matcher,3000);
     const semantic=[a.market,a.series,a.unit,a.payer,a.beneficiary,a.seller,a.matcher,a.collector,a.buyUse,a.sellUse,ZERO_KEY];
     primary={...defaults('Match'),market:run.market,matchId:i.matchId,unit:unitAddress,series:seriesAddress,expectedCursor:i.expectedCursor,fundedCursor:'1',payer:a.payer,beneficiary:a.beneficiary,seller:a.seller,buyNonce:i.buyNonce,sellNonce:i.sellNonce,buyAuthHash:i.buyAuthHash,sellAuthHash:i.sellAuthHash,gross:i.gross,fee:'100',tradeKind:0,packetHash:ZERO_HASH,campaignId:ZERO_HASH,fundTermsHash:fundTermsHash(i,semantic),fundedSlot:String(slot),terminalOpHash:ZERO_HASH,terminalSlot:'0',rentReserve:'1000',primaryClaimFace:i.gross,terminalRecipient:ZERO_KEY,previousMatch:ZERO_KEY};
     put(a.match,primary,11000);for(const [address,actor,nonce,authHash]of [[a.buyUse,a.beneficiary,i.buyNonce,i.buyAuthHash],[a.sellUse,a.seller,i.sellNonce,i.sellAuthHash]])put(address,{...defaults('OrderUse'),market:run.market,actor,nonce,authHash,match:a.match,consumedSlot:String(slot)},1000);
     unit={...unit,state:1,owner:a.beneficiary,cursor:'1',primaryMatch:a.match,latestMatch:a.match,refundFace:i.gross};put(unitAddress,unit,1000);market.fundedMatches=1;put(run.market,market,1000);
    }else if(i.type==='StartDelivery'){assert.equal(unit.owner,a.owner);unit={...unit,state:2,cursor:'2',requestHash:i.requestHash,lockStartCursor:i.expectedCursor,lockStartSlot:String(slot),lockDeadlineSlot:String(slot+150)};put(unitAddress,unit,1000);}
    else if(i.type==='RefundFailure'){debit(a.primaryMatch,10000);credit(a.refundRecipient,10000);primary={...primary,state:3,terminalOpHash:i.operationId,terminalSlot:String(slot),terminalRecipient:a.refundRecipient};put(a.primaryMatch,primary,1000);unit={...unit,state:4,cursor:'3',terminalOpHash:i.operationId,terminalSlot:String(slot),terminalReason:2};put(unitAddress,unit,1000);}
    else if(i.type==='FinalizeDelivery'){
     const check=new DatabaseSync(filename,{readOnly:true});try{const saved=check.prepare('SELECT response_hash FROM native_private_responses').get();assert.equal(saved.response_hash,i.responseHash);}finally{check.close();}
     debit(a.primaryMatch,10000);credit(run.issuer,9900);credit(run.collector,100);primary={...primary,state:2,terminalOpHash:i.operationId,terminalSlot:String(slot),terminalRecipient:run.issuer};put(a.primaryMatch,primary,1000);unit={...unit,state:3,cursor:'3',responseHash:i.responseHash,terminalOpHash:i.operationId,terminalSlot:String(slot),terminalReason:1};put(unitAddress,unit,1000);
    }else throw Error('Unexpected scripted fixture instruction');
    const post=tx.accountKeys.map(address=>raw.get(address)?.lamports??0);transactions.set(tx.signature,{slot,version:'legacy',transaction:[r.params[0],'base64'],meta:{err:null,fee:5000,preBalances:pre,postBalances:post,computeUnitsConsumed:10000}});if(scenario==='finalize-response-loss'&&i.type==='FinalizeDelivery')throw Error('fixture lost finalized response');result=tx.signature;break;
   }
   default:throw Error('Unexpected injected RPC method');
  }
  return new Response(JSON.stringify({jsonrpc:'2.0',id:r.id,result}),{headers:{'content-type':'application/json'}});
 };
 const signers=new Map(publicKeys.map((actor,index)=>[actor,message=>{signs++;const db=new DatabaseSync(filename,{readOnly:true});try{assert.ok(db.prepare("SELECT 1 FROM native_outbox WHERE state='Signing'").get());assert.ok(db.prepare('SELECT 1 FROM native_fences').get());}finally{db.close();}return sign(null,message,generated[index].privateKey);} ]));
 const rpc=createLocalRpc({endpoint:'http://127.0.0.1:8899',run,programBytes,fetchImpl});let service=createNativeService({run,rpc,store,signers,operatorToken:'local-fixture-operator-token-32-bytes',repository:{getSeriesSource:()=>sourceAvailable?Buffer.from(content):null,getSponsorPacket:()=>null}});
 const issue={type:'IssueSeries',operationId:operationId({domain,type:'IssueSeries',seriesId}),...Object.fromEntries(['seriesId','resourceHash','versionHash','format','useBySlot','sponsoredPrice','cap','maxTransfers','transferable','contentBytes'].map(k=>[k,seriesTerms[k]]))};
 await service.executeOperation((await service.prepare({instruction:issue,accounts:{issuer:run.issuer,matcher:run.matcher,market:run.market,series:seriesAddress}})).id);
 const register={type:'RegisterUnit',operationId:operationId({domain,type:'RegisterUnit',unitId:uid}),seriesId,serial:0};await service.executeOperation((await service.prepare({instruction:register,accounts:{issuer:run.issuer,matcher:run.matcher,market:run.market,series:seriesAddress,unit:unitAddress}})).id);
 const authorize=(actorIndex,value,idempotencyKey)=>{const bytes=encodeAuthorization(value);return {authorization:bytes.toString('base64'),signature:sign(null,bytes,generated[actorIndex].privateKey).toString('base64'),idempotencyKey};};
 const order=(actor,nonce,side)=>({kind:'BookOrder',domain,actor,nonce,orderId:orderId({domain,actor,nonce}),side,lane:0,series:seriesAddress,refundFace:'0',exactUnit:side?unitAddress:ZERO_KEY,expectedCursor:'0',limit:'10000',validUntilSlot:'190',minRemainingAfter:0,tif:0,quantity:1});
 await service.orders(authorize(1,order(run.issuer,hex(60),1),'ask'));const filled=await service.orders(authorize(2,order(run.buyerA,hex(61),0),'bid'));assert.equal(filled.state,'Filled');assert.equal(store.getUnit(unitAddress).owner,run.buyerA);assert.equal(store.captureWallet(run.buyerA).held,'0');
 const request={kind:'DeliveryRequest',domain,actor:run.buyerA,nonce:hex(62),unit:unitAddress,expectedCursor:'1',series:seriesAddress,resourceHash:seriesTerms.resourceHash};if(directStart){unit={...unit,state:2,cursor:'2',requestHash:sha256(encodeAuthorization(request)),lockStartCursor:'1',lockStartSlot:String(slot),lockDeadlineSlot:String(slot+150)};put(unitAddress,unit,1000);assert.equal(store.getUnit(unitAddress).state,'FundedOpen');}else{await service.startDelivery(authorize(2,request,'start'));assert.equal(store.getUnit(unitAddress).state,'DeliveryLocked');}
 const requestHash=sha256(encodeAuthorization(request));if(sourceFailure)sourceAvailable=false;if(scenario==='finalize-response-loss'){await assert.rejects(service.processDelivery({unit:unitAddress,requestHash,idempotencyKey:'process'}),{code:'PENDING_SETTLEMENT'});const id=operationId({domain,type:'FinalizeDelivery',unit:unitAddress,requestHash}),original=store.native.get(id).attempt.transaction,beforeSends=sends,beforeSigns=signs;assert.equal(store.native.get(id).state,'Unknown');store.close();store=createTradingStore({filename,run,mode:'native'});service=createNativeService({run,rpc,store,signers,operatorToken:'local-fixture-operator-token-32-bytes',repository:{getSeriesSource:()=>null,getSponsorPacket:()=>null}});await service.reconcile(id);assert.equal(store.native.get(id).attempt.transaction,original);assert.equal(sends,beforeSends);assert.equal(signs,beforeSigns);}else await service.processDelivery({unit:unitAddress,requestHash,idempotencyKey:'process'});sourceAvailable=false;assert.equal(store.getUnit(unitAddress).state,sourceFailure?'Refunded':'Consumed');
 slot=1000;const read={kind:'ReadDelivery',domain,actor:run.buyerA,nonce:hex(63),unit:unitAddress,requestHash,consumedCursor:'3',validUntilSlot:'2000'};const envelope=authorize(2,read,'read');
 const beforeRows=(()=>{const db=new DatabaseSync(filename,{readOnly:true});try{return db.prepare('SELECT COUNT(*) AS n FROM requests').get().n;}finally{db.close();}})();
 let delivered;if(sourceFailure){await assert.rejects(service.readDelivery(envelope),{code:'INVALID_AUTH'});assert.equal(store.captureWallet(run.buyerA).balance,'1000000000');assert.equal(raw.get(run.collector).lamports,1000000000);}else{delivered=await service.readDelivery(envelope);const replayed=await service.readDelivery(envelope);assert.deepEqual(replayed,delivered);assert.equal(delivered.response.content,content);assert.equal(sha256(Buffer.from(delivered.responseBase64,'base64')),unit.responseHash);}
 const db=new DatabaseSync(filename,{readOnly:true});try{assert.equal(db.prepare('SELECT COUNT(*) AS n FROM requests').get().n,beforeRows);}finally{db.close();}
 await assert.rejects(service.readDelivery(authorize(1,{...read,actor:run.issuer},'old-owner')),{code:'INVALID_AUTH'});assert.deepEqual(captured,['IssueSeries','RegisterUnit','Fund',...(directStart?[]:['StartDelivery']),sourceFailure?'RefundFailure':'FinalizeDelivery']);assert.equal(sends,directStart?4:5);assert.ok(signs>=4);
 const oldSendCount=sends,oldSignCount=signs;store.close();store=createTradingStore({filename,run,mode:'native'});
 const reopened=createNativeService({run,rpc,store,signers,operatorToken:'local-fixture-operator-token-32-bytes',repository:{getSeriesSource:()=>sourceAvailable?Buffer.from(content):null,getSponsorPacket:()=>null}});
 if(sourceFailure)await assert.rejects(reopened.readDelivery(envelope),{code:'INVALID_AUTH'});else assert.deepEqual(await reopened.readDelivery(envelope),delivered);
 if(!directStart){await assert.rejects(reopened.startDelivery(authorize(2,{...request,nonce:hex(99)},'start')),{code:'NONCE_CONFLICT'});assert.equal((await reopened.startDelivery(authorize(2,request,'start'))).operationId,operationId({domain,type:'StartDelivery',unit:unitAddress,requestHash}));}
 await assert.rejects(reopened.processDelivery({unit:unitAddress,requestHash:hex(98),idempotencyKey:'process'}),{code:'NONCE_CONFLICT'});
 assert.equal((await reopened.processDelivery({unit:unitAddress,requestHash,idempotencyKey:'process'})).state,'ResolvedSuccess');assert.equal(sends,oldSendCount);assert.equal(signs,oldSignCount);
 const fundOperation=store.getMatch(filled.matchId).operationId;assert.equal((await reopened.reconcile(fundOperation)).state,'ResolvedSuccess');assert.equal(store.getUnit(unitAddress).state,sourceFailure?'Refunded':'Consumed');assert.equal(store.getUnit(unitAddress).cursor,'3');
 const op=store.native.get(fundOperation),savedTransaction=transactions.get(op.attempt.signature);transactions.delete(op.attempt.signature);
 const pruned=await createNativeObserver({rpc,run}).observeFinalized(op);assert.equal(pruned.status,'success');assert.equal(pruned.evidence,'account-state-only');assert.equal(pruned.signature,null);assert.equal(pruned.feeKnown,false);assert.equal(pruned.effects,null);assert.equal(pruned.operatingCost,null);
 await reopened.reconcile(fundOperation);assert.equal(store.native.get(fundOperation).blocked,false);assert.equal(store.native.getEvidence(fundOperation).operatingFeesKnown,true);transactions.set(op.attempt.signature,savedTransaction);
});
