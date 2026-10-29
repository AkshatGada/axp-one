import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {goldenVectors} from '../../packages/machine-market/native/golden.mjs';
import {base58Encode,encodeAccount,ZERO_KEY,ZERO_HASH} from '../../packages/machine-market/native/codec.mjs';
import {sha256,deriveMarketPda,deriveSeriesPda,deriveUnitPda,deriveMatchPda,deriveOrderUsePda,unitId,domainHash,operationId,seriesTermsHash,findProgramAddress,fundTermsHash} from '../../packages/machine-market/native/domain.mjs';
import {createLocalRpc,localEndpoint,decodeRpcAccount,BPF_LOADER,UPGRADEABLE_LOADER} from '../../packages/machine-market/native/rpc.mjs';
import {validateNativeAccount,nativeProof,transactionEffects} from '../../packages/machine-market/native/observations.mjs';
import {canonicalSponsorPacket,prepareDeliveryResponse,createDeliveryCoordinator} from '../../packages/machine-market/native/delivery.mjs';
import {createTradingHandler} from '../../packages/machine-market/native/service.mjs';
const key=n=>base58Encode(Buffer.alloc(32,n)),hex=n=>Buffer.alloc(32,n).toString('hex');
function fixture(operating=key(1)){
 const run={genesis:hex(50),program:key(51),initializer:operating,marketNonce:hex(2),matcher:operating,gateway:operating,collector:key(3),issuer:key(4),buyerA:key(5),buyerB:key(6),sponsor:key(7)};run.market=deriveMarketPda(run).address;
 const defaults=kind=>structuredClone(goldenVectors().vectors.find(v=>v.family==='account'&&v.name===kind).input);
 const market={...defaults('Market'),market:run.market,initializer:run.initializer,marketNonce:run.marketNonce,genesis:run.genesis,matcher:run.matcher,gateway:run.gateway,feeCollector:run.collector,issuer:run.issuer,buyerA:run.buyerA,buyerB:run.buyerB,sponsor:run.sponsor};
 const content='Independent owned fixture, unchanged by a sponsor.';
 const series={...defaults('Series'),market:run.market,seriesId:hex(8),issuer:run.issuer,resourceHash:sha256(Buffer.from(content)),versionHash:sha256(Buffer.from('v1')),format:0,useBySlot:'200',sponsoredPrice:'10000',cap:8,issued:1,maxTransfers:3,transferable:1,contentBytes:Buffer.byteLength(content)};series.termsHash=seriesTermsHash(series);const seriesAddress=deriveSeriesPda({...run,seriesId:series.seriesId}).address;
 const unit={...defaults('Unit'),market:run.market,series:seriesAddress,unitId:unitId({series:seriesAddress,serial:0}),serial:0,owner:run.issuer,cursor:'0',transferCount:0,sponsored:0,primaryMatch:ZERO_KEY,latestMatch:ZERO_KEY,refundFace:'0',sponsorRefundKey:ZERO_KEY,requestHash:ZERO_HASH,lockStartCursor:'0',lockStartSlot:'0',lockDeadlineSlot:'0',terminalOpHash:ZERO_HASH,responseHash:ZERO_HASH,terminalSlot:'0',terminalReason:0,state:0};const unitAddress=deriveUnitPda({...run,unitId:unit.unitId}).address;
 const raw=(address,value,lamports='1000')=>({address,owner:run.program,lamports,executable:false,data:encodeAccount(value),dataHash:sha256(encodeAccount(value)),missing:false});
 const programBytes=Buffer.alloc(80);Buffer.from([127,69,76,70]).copy(programBytes);
 const rpcAccount=raw=>raw.missing?null:{owner:raw.owner,lamports:Number(raw.lamports),executable:raw.executable,data:[raw.data.toString('base64'),'base64'],rentEpoch:18446744073709551615};
 return {run,market,series:{...series,address:seriesAddress},unit:{...unit,address:unitAddress},content,raw,rpcAccount,programBytes,defaults};
}
const accountValue=value=>{const {address,...fields}=value;return fields;};
function fakeRPC(f,overrides={}){
 const calls=[];const fetchImpl=async(endpoint,options)=>{const request=JSON.parse(options.body);calls.push(request);assert.equal(endpoint,'http://127.0.0.1:8899');assert.equal(options.redirect,'error');let result;
 if(request.method==='getGenesisHash')result=key(50);
 else if(request.method==='getMultipleAccounts')result={context:{slot:100},value:request.params[0].map(address=>address===f.run.program?{owner:BPF_LOADER,lamports:1000,executable:true,data:[f.programBytes.toString('base64'),'base64'],rentEpoch:18446744073709551615}:address===f.run.market?f.rpcAccount(f.raw(address,f.market)):null)};
 else if(request.method==='getSlot')result=100;else throw Error('unexpected fixture method');
 if(overrides[request.method])result=overrides[request.method](request,result);
 return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});};
 return {rpc:createLocalRpc({endpoint:'http://127.0.0.1:8899',run:f.run,programBytes:f.programBytes,fetchImpl}),calls,fetchImpl};
}
test('RPC accepts only canonical literal loopback endpoint and never environment/config aliases',()=>{
 for(const endpoint of ['http://localhost:8899','https://127.0.0.1:8899','http://127.0.0.1:8899/','http://127.0.0.1:8899?x=1','http://user@127.0.0.1:8899','http://127.0.0.1:65536','http://127.0.0.1:00080','http://0.0.0.0:8899'])assert.throws(()=>localEndpoint(endpoint),{code:'RUN_MISMATCH'});
 assert.equal(localEndpoint('http://127.0.0.1:8899'),'http://127.0.0.1:8899');
});
test('raw JSON rentEpoch u64 sentinel is excluded from authority without rounding claims',async()=>{
 const f=fixture();const raw='{"owner":"'+ZERO_KEY+'","lamports":1000,"executable":false,"data":["","base64"],"rentEpoch":18446744073709551615}';
 const decoded=decodeRpcAccount(f.run.buyerA,JSON.parse(raw));assert.equal(decoded.lamports,'1000');assert.equal(Object.hasOwn(decoded,'rentEpoch'),false);
 const {rpc,calls}=fakeRPC(f);const identity=await rpc.inspectRun();assert.equal(identity.representation.programHash,sha256(f.programBytes));assert.equal(calls.filter(c=>c.method==='sendTransaction').length,0);
});
test('inspectRun rejects wrong genesis, loader, executable, bytes and market authorities',async()=>{
 const f=fixture();await assert.rejects(fakeRPC(f,{getGenesisHash:()=>key(99)}).rpc.inspectRun(),{code:'RUN_MISMATCH'});
 for(const mutate of [v=>v.value[0].owner=ZERO_KEY,v=>v.value[0].executable=false,v=>v.value[0].data=[Buffer.alloc(80).toString('base64'),'base64'],v=>v.value[1].data=[encodeAccount({...f.market,gateway:f.run.buyerA}).toString('base64'),'base64']])await assert.rejects(fakeRPC(f,{getMultipleAccounts:(_r,v)=>{mutate(v);return v;}}).rpc.inspectRun(),{code:'RUN_MISMATCH'});
});
test('upgradeable loader requires declared canonical ProgramData and explicit Some(zero) representation',async()=>{
 const f=fixture(),programData=findProgramAddress([Buffer.alloc(32,51)],UPGRADEABLE_LOADER).address;const pd=Buffer.alloc(45+f.programBytes.length+12);pd.writeUInt32LE(3);pd.writeBigUInt64LE(10n,4);pd[12]=1;f.programBytes.copy(pd,45);
 const program=Buffer.alloc(36);program.writeUInt32LE(2);Buffer.from((await import('../../packages/machine-market/native/codec.mjs')).publicKeyBytes(programData)).copy(program,4);
 const fixtureFetch=async(_url,options)=>{const request=JSON.parse(options.body);const result=request.method==='getGenesisHash'?key(50):{context:{slot:100},value:request.params[0].map(address=>address===f.run.program?{owner:UPGRADEABLE_LOADER,lamports:1000,executable:true,data:[program.toString('base64'),'base64']}:address===programData?{owner:UPGRADEABLE_LOADER,lamports:1000,executable:false,data:[pd.toString('base64'),'base64']}:f.rpcAccount(f.raw(f.run.market,f.market)))};return new Response(JSON.stringify({jsonrpc:'2.0',id:request.id,result}),{headers:{'content-type':'application/json'}});};
 const config={endpoint:'http://127.0.0.1:8899',run:f.run,programBytes:f.programBytes,fetchImpl:fixtureFetch,programDeployment:{loader:UPGRADEABLE_LOADER,programData,upgradeAuthority:ZERO_KEY}};
 assert.equal((await createLocalRpc(config).inspectRun()).representation.upgradeAuthority,ZERO_KEY);
 await assert.rejects(createLocalRpc({...config,programDeployment:undefined}).inspectRun(),{code:'RUN_MISMATCH'});
 await assert.rejects(createLocalRpc({...config,programDeployment:{...config.programDeployment,upgradeAuthority:null}}).inspectRun(),{code:'RUN_MISMATCH'});
 pd[pd.length-1]=1;await assert.rejects(createLocalRpc(config).inspectRun(),{code:'RUN_MISMATCH'});
});
test('RPC bounds streamed responses, accepts finalized coherent context only, and redacts failures',async()=>{
 const f=fixture();await assert.rejects(fakeRPC(f,{getMultipleAccounts:(_r,v)=>({...v,context:{slot:1}})}).rpc.accounts([f.run.market],{minContextSlot:'2'}),{code:'RUN_MISMATCH'});
 const bad=createLocalRpc({endpoint:'http://127.0.0.1:8899',run:f.run,programBytes:f.programBytes,fetchImpl:async()=>{throw Error('/private/key.json secret');}});await assert.rejects(bad.slot(),error=>error.message==='PENDING_SETTLEMENT');
 const huge=createLocalRpc({endpoint:'http://127.0.0.1:8899',run:f.run,programBytes:f.programBytes,maxResponseBytes:1024,fetchImpl:async()=>new Response('x'.repeat(1025),{headers:{'content-type':'application/json'}})});await assert.rejects(huge.slot(),{code:'CAPACITY'});
 await assert.rejects(fakeRPC(f).rpc.accounts([f.run.market,f.run.market]),{code:'INVALID_INPUT'});
});
test('native account decoding checks owner, exact PDA, immutable series hash and layout',()=>{
 const f=fixture(),raw=f.raw(f.series.address,accountValue(f.series));assert.equal(validateNativeAccount(raw,f.run).termsHash,f.series.termsHash);
 for(const value of [{...raw,owner:ZERO_KEY},{...raw,address:f.run.buyerA},{...raw,data:raw.data.subarray(1)}])assert.throws(()=>validateNativeAccount(value,f.run));
});
test('failed primary with IssuerOpen zero-face and absent receipt/nullifiers is no economic proof',()=>{
 const f=fixture();const i={...goldenVectors().vectors.find(v=>v.family==='instruction'&&v.name==='Fund').input,fundingKind:0,expectedCursor:'0',minRemainingAfter:0,expectedRefundFace:'0'};
 const accounts={market:f.run.market,series:f.series.address,unit:f.unit.address,payer:f.run.buyerA,beneficiary:f.run.buyerA,seller:f.run.issuer,matcher:f.run.matcher,collector:f.run.collector,match:deriveMatchPda({...f.run,matchId:i.matchId}).address,buyUse:deriveOrderUsePda({...f.run,actor:f.run.buyerA,nonce:i.buyNonce}).address,sellUse:deriveOrderUsePda({...f.run,actor:f.run.issuer,nonce:i.sellNonce}).address};
 const raws=[f.raw(f.run.market,f.market),f.raw(f.series.address,accountValue(f.series)),f.raw(f.unit.address,accountValue(f.unit)),...['match','buyUse','sellUse'].map(role=>({address:accounts[role],missing:true}))];assert.equal(nativeProof({id:i.operationId,instruction:i,accounts},raws,f.run),null);
});
test('canonical delivery separates sponsor packet and never changes independent source bytes',()=>{
 const f=fixture();const unit={...f.unit,state:2,owner:f.run.buyerA,requestHash:hex(13),cursor:'2',lockStartCursor:'1',lockStartSlot:'100',lockDeadlineSlot:'250'};
 const direct=prepareDeliveryResponse({run:f.run,unit,series:f.series,content:f.content});const packet=canonicalSponsorPacket({brand:'Fixture',note:'Untrusted sponsor instructions are data.'});
 const sponsored=prepareDeliveryResponse({run:f.run,unit:{...unit,sponsored:1},series:f.series,content:f.content,sponsorPacket:packet.bytes.toString(),campaignId:hex(14),packetHash:packet.packetHash});
 assert.equal(direct.response.content,sponsored.response.content);assert.equal(sponsored.response.sponsored.disclosure,'Sponsored');assert.notEqual(direct.responseHash,sponsored.responseHash);
 assert.throws(()=>prepareDeliveryResponse({run:f.run,unit,series:f.series,content:'altered'}),{code:'INCOMPATIBLE'});assert.throws(()=>canonicalSponsorPacket('{ "x":1}'),{code:'INVALID_INPUT'});assert.throws(()=>canonicalSponsorPacket({x:'a'.repeat(2049)}),{code:'CAPACITY'});
});
async function request(handler,{url='/api/trading/health',method='GET',headers={},body}={}){
 const data=body===undefined?[]:[Buffer.from(typeof body==='string'?body:JSON.stringify(body))];const req=Readable.from(data);req.method=method;req.url=url;req.headers={host:'127.0.0.1:8799',...headers};req.rawHeaders=Object.entries(req.headers).flat();let status,text;
 const res={headersSent:false,destroyed:false,writeHead(s,h){status=s;this.headersSent=true;},end(bytes){text=Buffer.from(bytes).toString();},destroy(){this.destroyed=true;}};await handler(req,res);return {status,value:JSON.parse(text)};
}
test('W6 HTTP fixed authority/origin/input/operator guards and read-only health need no sockets',async()=>{
 let reads=0,mutations=0;const service={health(){reads++;return {mode:'local-solana-validator'};},authorizeOperator(){throw Object.assign(Error('INVALID_AUTH'),{});},orders(){mutations++;return {};}};const handler=createTradingHandler({service,origin:'http://127.0.0.1:8799'});
 assert.equal((await request(handler)).status,200);assert.equal(reads,1);assert.equal(mutations,0);
 for(const headers of [{host:'localhost:8799'},{origin:'null'},{origin:'http://127.0.0.1:8798'},{'sec-fetch-site':'cross-site'},{forwarded:'host=x'}])assert.equal((await request(handler,{headers})).value.code,'INVALID_AUTH');
 for(const [body,headers]of [['{',{'content-type':'application/json'}],['{}',{}],['x'.repeat(8193),{'content-type':'application/json'}]])assert.ok([400,503].includes((await request(handler,{url:'/api/trading/orders',method:'POST',body,headers})).status));
 assert.equal(mutations,0);assert.equal((await request(handler,{url:'/api/trading/../../.env'})).status,400);
 assert.equal((await request(handler,{url:'/api/trading/transactions/send',method:'POST',body:{},headers:{'content-type':'application/json'}})).status,400);
});
for(const loss of ['none','response','request'])test('real core outbox/service durable sign-send-reconcile, loss='+loss,async t=>{
 const {generateKeyPairSync,sign}=await import('node:crypto');const {mkdtemp,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const path=await import('node:path');const {DatabaseSync}=await import('node:sqlite');
 const {createOutbox}=await import('../../packages/machine-market/native/outbox.mjs');const {parseTransaction}=await import('../../packages/machine-market/native/transaction.mjs');const {createNativeService}=await import('../../packages/machine-market/native/service.mjs');
 const keys=generateKeyPairSync('ed25519'),operating=base58Encode(keys.publicKey.export({format:'der',type:'spki'}).subarray(-32)),f=fixture(operating);
 const directory=await mkdtemp(path.join(tmpdir(),'axp-phase2-transport-'));t.after(()=>rm(directory,{recursive:true,force:true}));const filename=path.join(directory,'outbox.sqlite');
 const outbox=createOutbox({filename,run:f.run});t.after(()=>outbox.close());let transaction=null,created=false,fee=5000,rent=1000,signCalls=0,sendCalls=0,observedSendIntent=false;
 const signer=message=>{signCalls++;const observer=new DatabaseSync(filename,{readOnly:true});try{const row=observer.prepare('SELECT state FROM native_outbox').get();assert.equal(row.state,'Signing');assert.equal(observer.prepare('SELECT COUNT(*) AS n FROM native_fences').get().n,1);}finally{observer.close();}return sign(null,message,keys.privateKey);};
 const account=address=>address===f.run.program?{owner:BPF_LOADER,lamports:1000000,executable:true,data:[f.programBytes.toString('base64'),'base64'],rentEpoch:18446744073709551615}:address===f.run.market?(created?f.rpcAccount(f.raw(address,f.market,String(rent))):null):address===operating?{owner:ZERO_KEY,lamports:1000000000-(created?fee+rent:0),executable:false,data:['','base64'],rentEpoch:18446744073709551615}:null;
 const fetchImpl=async(_url,options)=>{const r=JSON.parse(options.body);let result;
  switch(r.method){case'getGenesisHash':result=key(50);break;case'getMultipleAccounts':result={context:{slot:100},value:r.params[0].map(account)};break;case'getLatestBlockhash':result={context:{slot:100},value:{blockhash:key(55),lastValidBlockHeight:200}};break;case'getFeeForMessage':result={context:{slot:100},value:fee};break;case'getMinimumBalanceForRentExemption':result=rent;break;case'getSlot':case'getBlockHeight':result=100;break;case'isBlockhashValid':result={context:{slot:100},value:true};break;
   case'sendTransaction':{sendCalls++;transaction=r.params[0];const parsed=parseTransaction(transaction);const op=outbox.get(parsed.instruction.operationId);assert.equal(op.state,'Submitted');assert.equal(op.attempt.transaction,transaction);observedSendIntent=true;if(loss==='request'&&sendCalls===1)throw Error('fixture request loss');created=true;if(loss==='response'&&sendCalls===1)throw Error('fixture response loss');result=parsed.signature;break;}
   case'getTransaction':{if(!created){result=null;break;}const parsed=parseTransaction(transaction);const pre=parsed.accountKeys.map(k=>k===operating?1000000000:k===f.run.market?0:1000000),post=[...pre];post[parsed.accountKeys.indexOf(operating)]-=fee+rent;post[parsed.accountKeys.indexOf(f.run.market)]+=rent;result={slot:100,version:'legacy',transaction:[transaction,'base64'],meta:{err:null,fee,preBalances:pre,postBalances:post,computeUnitsConsumed:10000}};break;}
   default:throw Error('Unexpected fixture RPC method');}
  return new Response(JSON.stringify({jsonrpc:'2.0',id:r.id,result}),{headers:{'content-type':'application/json'}});
 };
 const rpc=createLocalRpc({endpoint:'http://127.0.0.1:8899',run:f.run,programBytes:f.programBytes,fetchImpl});const service=createNativeService({run:f.run,rpc,store:{native:outbox},signers:new Map([[operating,signer]]),operatorToken:'local-fixture-operator-token-32-bytes'});
 const instruction={type:'Init',operationId:operationId({domain:domainHash(f.run),type:'Init',marketNonce:f.run.marketNonce}),marketNonce:f.run.marketNonce,genesis:f.run.genesis,matcher:f.run.matcher,gateway:f.run.gateway,collector:f.run.collector,issuer:f.run.issuer,buyerA:f.run.buyerA,buyerB:f.run.buyerB,sponsor:f.run.sponsor};
 const prepared=await service.prepare({instruction,accounts:{initializer:operating,market:f.run.market}});assert.equal(prepared.state,'Prepared');assert.equal(signCalls,0);assert.equal(sendCalls,0);
 let result;if(loss==='none')result=await service.executeOperation(prepared.id);else{await assert.rejects(service.executeOperation(prepared.id),{code:'PENDING_SETTLEMENT'});assert.equal(outbox.get(prepared.id).state,'Unknown');assert.equal((await service.executeOperation(prepared.id)).state,'Unknown');assert.equal(signCalls,1);assert.equal(sendCalls,1);result=loss==='request'?await service.resend(prepared.id):await service.reconcile(prepared.id);}assert.equal(result.state,'ResolvedSuccess');assert.equal(signCalls,1);assert.equal(sendCalls,loss==='request'?2:1);assert.equal(observedSendIntent,true);assert.equal(outbox.get(prepared.id).attempt.signature.length>80,true);
 assert.equal((await service.executeOperation(prepared.id)).state,'ResolvedSuccess');assert.equal(signCalls,1);assert.equal(sendCalls,loss==='request'?2:1);
});
function fundedFixture(){
 const f=fixture();const i={...goldenVectors().vectors.find(v=>v.family==='instruction'&&v.name==='Fund').input,fundingKind:0,expectedCursor:'0',expectedRefundFace:'0',minRemainingAfter:0};
 const a={market:f.run.market,series:f.series.address,unit:f.unit.address,payer:f.run.buyerA,beneficiary:f.run.buyerA,seller:f.run.issuer,matcher:f.run.matcher,collector:f.run.collector,match:deriveMatchPda({...f.run,matchId:i.matchId}).address,buyUse:deriveOrderUsePda({...f.run,actor:f.run.buyerA,nonce:i.buyNonce}).address,sellUse:deriveOrderUsePda({...f.run,actor:f.run.issuer,nonce:i.sellNonce}).address};
 const semanticKeys=[a.market,a.series,a.unit,a.payer,a.beneficiary,a.seller,a.matcher,a.collector,a.buyUse,a.sellUse,ZERO_KEY];const termsHash=fundTermsHash(i,semanticKeys);
 const m={...f.defaults('Match'),market:f.run.market,matchId:i.matchId,unit:a.unit,series:a.series,expectedCursor:'0',fundedCursor:'1',payer:a.payer,beneficiary:a.beneficiary,seller:a.seller,buyNonce:i.buyNonce,sellNonce:i.sellNonce,buyAuthHash:i.buyAuthHash,sellAuthHash:i.sellAuthHash,gross:i.gross,fee:'100',tradeKind:0,packetHash:ZERO_HASH,campaignId:ZERO_HASH,fundTermsHash:termsHash,fundedSlot:'90',terminalOpHash:ZERO_HASH,terminalSlot:'0',rentReserve:'1000',primaryClaimFace:i.gross,terminalRecipient:ZERO_KEY,previousMatch:ZERO_KEY};
 const u={...accountValue(f.unit),state:1,owner:a.beneficiary,cursor:'1',primaryMatch:a.match,latestMatch:a.match,refundFace:i.gross};
 const use=(actor,nonce,authHash)=>({...f.defaults('OrderUse'),market:f.run.market,actor,nonce,authHash,match:a.match,consumedSlot:'90'});
 const raws=[f.raw(f.run.market,f.market),f.raw(a.series,accountValue(f.series)),f.raw(a.unit,u),f.raw(a.match,m,'11000'),f.raw(a.buyUse,use(a.beneficiary,i.buyNonce,i.buyAuthHash)),f.raw(a.sellUse,use(a.seller,i.sellNonce,i.sellAuthHash))];
 return {f,i,a,m,u,raws,op:{id:i.operationId,instruction:i,accounts:a,semanticKeys,termsHash:'generic-outbox-hash-is-not-economic-hash'}};
}
test('immutable primary receipt plus both OrderUses proves original funding after later resale/terminal state',()=>{
 const {f,i,a,m,u,raws,op}=fundedFixture();const initial=nativeProof(op,raws,f.run);assert.equal(initial.receipt.termsHash,m.fundTermsHash);
 const later={...u,owner:f.run.buyerB,cursor:'2',transferCount:1,latestMatch:deriveMatchPda({...f.run,matchId:hex(99)}).address};const laterRaw=raws.map(r=>r.address===a.unit?f.raw(a.unit,later):r);assert.equal(nativeProof(op,laterRaw,f.run).unit.owner,f.run.buyerB);
 const terminalOperation=hex(88),terminal={...u,state:3,cursor:'3',requestHash:hex(44),lockStartCursor:'1',lockStartSlot:'100',lockDeadlineSlot:'250',terminalOpHash:terminalOperation,responseHash:hex(45),terminalSlot:'120',terminalReason:1};
 const terminalMatch={...m,state:2,terminalOpHash:terminalOperation,terminalSlot:'120',terminalRecipient:f.run.issuer};const terminalRaw=raws.map(r=>r.address===a.unit?f.raw(a.unit,terminal):r.address===a.match?f.raw(a.match,terminalMatch):r);
 assert.equal(nativeProof(op,terminalRaw,f.run).receipt.state,'PrimarySettled');
 const wrong=raws.map(r=>r.address===a.buyUse?{address:r.address,missing:true}:r);assert.throws(()=>nativeProof(op,wrong,f.run),{code:'RUN_MISMATCH'});
});
test('unique-key transaction deltas separate primary escrow, immediate secondary cash, fee and rent',()=>{
 const {f,i,a,m,op}=fundedFixture();const keys=[...new Set([f.run.matcher,a.payer,a.beneficiary,a.seller,a.collector,a.market,a.series,a.unit,a.match,a.buyUse,a.sellUse,ZERO_KEY,f.run.program])];
 const balances=(changes)=>{const pre=keys.map(k=>[a.match,a.buyUse,a.sellUse].includes(k)?0:1000000);const post=pre.map((v,index)=>v+(changes[keys[index]]??0));return {err:null,fee:5000,preBalances:pre,postBalances:post};};
 const primaryChanges={[a.payer]:-10000,[a.match]:11000,[a.buyUse]:1000,[a.sellUse]:1000,[f.run.matcher]:-8000};
 const primary=transactionEffects(op,{keys},balances(primaryChanges),{effect:true,match:m},f.run);assert.equal(primary.rent,'3000');assert.equal(primary.economicReplay,false);
 const secondary={...op,instruction:{...i,fundingKind:1},accounts:{...a,payer:f.run.buyerB,beneficiary:f.run.buyerB,seller:f.run.buyerA}};
 const secondaryKeys=[...new Set([...keys,f.run.buyerB])];const pre=secondaryKeys.map(k=>[a.match,a.buyUse,a.sellUse].includes(k)?0:1000000);const changes={[f.run.buyerB]:-10000,[f.run.buyerA]:9900,[f.run.collector]:100,[a.match]:1000,[a.buyUse]:1000,[a.sellUse]:1000,[f.run.matcher]:-8000};
 const result=transactionEffects(secondary,{keys:secondaryKeys},{err:null,fee:5000,preBalances:pre,postBalances:pre.map((v,index)=>v+(changes[secondaryKeys[index]]??0))},{effect:true,match:m},f.run);assert.equal(result.rent,'3000');assert.equal(result.deltas.find(v=>v.key===f.run.buyerA).delta,'9900');
 const bad=balances(primaryChanges);bad.postBalances[keys.indexOf(a.payer)]++;assert.throws(()=>transactionEffects(op,{keys},bad,{effect:true,match:m},f.run),{code:'RUN_MISMATCH'});
});
test('separately signed exact native receipt replay earns no repeated principal or market fee',()=>{
 const {f,op,a,m}=fundedFixture();const keys=[...new Set([f.run.matcher,...Object.values(a),f.run.program,ZERO_KEY])];const pre=keys.map(()=>1000000),post=[...pre];post[0]-=5000;
 const replay=transactionEffects(op,{keys},{err:null,fee:5000,preBalances:pre,postBalances:post},{effect:true,match:m},f.run);assert.equal(replay.economicReplay,true);assert.equal(replay.rent,'0');assert.equal(replay.deltas.find(v=>v.key===a.payer).delta,'0');
 const registration={instruction:{type:'RegisterUnit'},accounts:{unit:a.unit}};const registered=transactionEffects(registration,{keys},{err:null,fee:5000,preBalances:pre,postBalances:post},{effect:true},f.run);assert.equal(registered.economicReplay,true);
});
test('direct owner Start fee is aggregated once when owner is fee payer',()=>{
 const f=fixture(),keys=[f.run.buyerA,f.run.market,f.series.address,f.unit.address,f.run.program],pre=keys.map(()=>1000000),post=[995000,...pre.slice(1)];
 const result=transactionEffects({instruction:{type:'StartDelivery'},accounts:{owner:f.run.buyerA}},{keys},{err:null,fee:5000,preBalances:pre,postBalances:post},{effect:true},f.run);assert.equal(result.deltas[0].delta,'-5000');assert.equal(result.rent,'0');
});
test('gateway private response commit precedes finalize admission and execution; source failure has no bytes',async()=>{
 const {f,a,m,u}=fundedFixture();const locked={...u,state:2,cursor:'2',owner:f.run.buyerA,requestHash:hex(44),lockStartCursor:'1',lockStartSlot:'100',lockDeadlineSlot:'250'};
 const rows=[f.raw(f.run.market,f.market),f.raw(a.unit,locked),f.raw(a.series,accountValue(f.series)),f.raw(a.match,m,'11000')];const byKey=new Map(rows.map(r=>[r.address,r]));const order=[];let saved=null,source=f.content;
 const rpc={inspectRun:async()=>({}),accounts:async keys=>({contextSlot:'110',accounts:keys.map(k=>byKey.get(k))}),slot:async()=>'110'};
 const repository={getSeriesSource:()=>source,getSponsorPacket:()=>null};const privateStore={readPrivateResponse(){return saved;},preparePrivateResponse(value){order.push('durable-response');const bytes=Buffer.from(JSON.stringify(value.response,Object.keys(value.response).sort()));saved={...value,responseBytes:bytes};return {deliveryId:value.response.deliveryId,responseHash:sha256(bytes)};}};
 const coordinator=createDeliveryCoordinator({run:f.run,rpc,repository,privateStore,admitOperation(value){order.push('admit-'+value.type);if(value.type==='FinalizeDelivery')assert.ok(saved.responseBytes);return {id:value.id};},executeOperation(id){order.push('execute');return {id};}});
 await coordinator.process({unit:a.unit,requestHash:locked.requestHash,idempotencyKey:'response'});assert.deepEqual(order,['durable-response','admit-FinalizeDelivery','execute']);
 saved=null;source='tampered';order.length=0;await coordinator.process({unit:a.unit,requestHash:locked.requestHash,idempotencyKey:'failure'});assert.deepEqual(order,['admit-RefundFailure','execute']);assert.equal(saved,null);
});
