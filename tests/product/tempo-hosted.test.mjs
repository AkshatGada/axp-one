// Actual Tempo worker + encrypted hosted CAS, with an offline native transport.
// These assert persistence and economic authority, never claim network execution.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createHash,randomBytes} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {Readable} from 'node:stream';
import {unpackDirectory} from '../../packages/hosted/vault.mjs';
import {createHostedProductAPI,productStateKey} from '../../packages/product/hosted.mjs';
import {createTempoProductPayments,TEMPO_NETWORK} from '../../packages/product/tempo-payments.mjs';
import {PRESETS} from '../../packages/product/service.mjs';
import {jevResponse} from '../ml/fixtures.mjs';

const ids={payer:`0x${'11'.repeat(20)}`,payee:`0x${'22'.repeat(20)}`};
const digest=value=>createHash('sha256').update(value).digest('hex');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
function temporary(t){const dir=mkdtempSync(join(tmpdir(),'axp-tempo-hosted-test-'));t.after(()=>rmSync(dir,{recursive:true,force:true}));return dir;}
async function request(api,path,{body,headers={}}={}){
 const method=body===undefined?'GET':'POST',req=Object.assign(Readable.from(body===undefined?[]:[JSON.stringify(body)]),{url:`/api/product${path}`,method,headers:{host:'demo.example','content-type':'application/json',...headers}});
 const res={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};await api.handler(req,res);return res;
}
function rows(dir,file,table){const db=new DatabaseSync(join(dir,file),{readOnly:true});try{return db.prepare(`SELECT * FROM ${table}`).all().map(row=>JSON.parse(row.body??row.data));}finally{db.close();}}
async function fixture(t,controls={}){
 const values=new Map(),root=temporary(t),key=randomBytes(32),calls=[],chain=new Map();let api,csrf,clock=Date.parse('2026-10-11T12:00:00Z');
 const kv={kind:'fixture',beforeCAS:null,get:async k=>values.get(k)??null,async compareAndSet(k,expected,value){if(this.beforeCAS)await this.beforeCAS({k,expected,value});if((values.get(k)??null)!==expected)return false;values.set(k,value);return true;}};
 function decode(text){const row=JSON.parse(text),dir=temporary(t);unpackDirectory(row.snapshot,dir,key,{aad:'axp.hosted-product-state.v1:demo:financial'});return {row,dir,channels:rows(dir,'tempo-payments.sqlite','tempo_channels')};}
 const snapshot=async()=>decode(await kv.get(productStateKey('demo')));
 const savedOperation=async plan=>(await snapshot()).channels.flatMap(c=>c.operations).find(op=>op.id===plan.id);
 const native={
  async inspect(){calls.push('inspect');return {compatible:true,chainId:TEMPO_NETWORK.chainId,token:TEMPO_NETWORK.token,decimals:6};},
  async prepare({kind,terms,channel,cumulativeAmountBaseUnits,operationId}){calls.push(`prepare:${kind}`);if(controls.prepare)await controls.prepare(kind);return {id:operationId,kind,descriptor:{offlineFixture:true},protocolChannelId:`0x${digest(terms.channelId)}`,request:{nonceKey:'expiring',nonce:0},signer:kind==='open'?ids.payer:ids.payee,validBefore:Math.floor(clock/1000)+25,cumulativeAmountBaseUnits,priorSettledBaseUnits:channel.settledBaseUnits,estimatedFeeAttoUSD:'1000'};},
  async sign({plan}){calls.push(`sign:${plan.kind}`);assert.equal((await savedOperation(plan)).status,'signing');return {wire:`0x${Buffer.from(plan.id).toString('hex')}`,transactionHash:`0x${digest(plan.id)}`,estimatedFeeAttoUSD:'1000'};},
  async submit(input){const persisted=await savedOperation(input.plan);assert.equal(persisted.status,'submitting');assert.deepEqual(persisted.signed,input.signed);assert.equal(persisted.attempt.transactionHash,input.signed.transactionHash);
   // The real transport performs async simulation, then fences immediately
   // before sending exact bytes. The fixture preserves that ordering.
   if(controls.beforeBroadcast)await controls.beforeBroadcast(input);assert.equal(typeof input.beforeBroadcast,'function');await input.beforeBroadcast();calls.push(`submit:${input.plan.kind}`);
   const target=BigInt(input.plan.cumulativeAmountBaseUnits),prior=BigInt(input.plan.priorSettledBaseUnits),receipt={status:'finalized',finality:'finalized',transactionHash:input.signed.transactionHash,protocolChannelId:input.plan.protocolChannelId,depositBaseUnits:input.terms.depositBaseUnits,settledBaseUnits:String(target),publisherDeltaBaseUnits:String(target-prior),refundBaseUnits:input.plan.kind==='close'?String(BigInt(input.terms.depositBaseUnits)-target):'0',feeAttoUSD:'100',blockNumber:String(chain.size+1)};
   chain.set(input.signed.transactionHash,receipt);if(controls.loseAck===input.plan.kind){controls.loseAck=null;throw Object.assign(Error('offline acknowledgement lost'),{code:'tempo_fixture_ack_lost'});}return receipt;
  },
  async lookup({signed}){calls.push('lookup');return chain.get(signed.transactionHash)??{status:'unknown',transactionHash:signed.transactionHash};},
  async signVoucher({terms,protocolChannelId,cumulativeAmountBaseUnits}){calls.push('voucher');if(cumulativeAmountBaseUnits!=='0'){const saved=(await snapshot()).channels.find(c=>c.terms.channelId===terms.channelId);assert.equal(saved.intents.at(-1).status,'signing');assert.equal(saved.intents.at(-1).cumulativeAmountBaseUnits,cumulativeAmountBaseUnits);}return {channelId:protocolChannelId,cumulativeAmountBaseUnits,signature:`offline:${cumulativeAmountBaseUnits}`};},
  verifyVoucher:({voucher})=>voucher.signature===`offline:${voucher.cumulativeAmountBaseUnits}`,
 };
 const solanaFactory=()=>({identities:{payer:'offline-sol-payer',payee:'offline-sol-payee'},status:()=>({mode:'devnet',network:'solana-devnet',ready:true,signingEnabled:true,payer:'offline-sol-payer',payee:'offline-sol-payee'}),projection:()=>null,evidence:()=>null,sync(){},dispose(){}});
 const start=()=>createHostedProductAPI({root,kv,now:()=>clock,retriever:{},config:{AXP_PRODUCT_ENABLED:'1',AXP_STATE_KEY:key.toString('base64'),AXP_PRODUCT_FINANCIAL_MODE:'devnet',AXP_PRODUCT_DEVNET_SIGN:'1',AXP_PRODUCT_TEMPO_ENABLED:'1',AXP_PRODUCT_TEMPO_SIGN:'1'},serviceOptions:{tempoFactory:createTempoProductPayments,tempoOptions:{identities:ids,transportFactory:async()=>native,lock:false},paymentOptions:{identities:{payer:'offline-sol-payer',payee:'offline-sol-payee'},solanaFactory},transport:async packet=>{calls.push('jev');return jevResponse(packet,3,3);}}});
 api=await start();const boot=await request(api,'/bootstrap');assert.equal(boot.status,200);csrf=boot.body.csrf;
 const post=(path,body,headers={})=>request(api,path,{body,headers:{'x-axp-csrf':csrf,...headers}});assert.equal((await post('/account',{name:'Offline Tempo hosted workspace',websiteURL:'https://example.test/'})).status,200);
 const {id,label,exampleQuestion,...draft}=PRESETS[0];draft.settlementNetwork='tempo-testnet';
 return {get api(){return api;},kv,key,calls,native,decode,snapshot,post,clock:()=>clock,advance:ms=>{clock+=ms;},async restart(){api=await start();},async draft(){const r=await post('/campaigns',draft);assert.equal(r.status,200);assert.equal((await post(`/campaigns/${r.body.campaign.id}/approve`,{})).status,200);return r.body.campaign;},async launch(){const c=await this.draft(),r=await post(`/campaigns/${c.id}/launch`,{});assert.equal(r.status,200);return r.body.campaign;},ad:turn=>post('/demo/chat',{question:exampleQuestion,sessionId:'tempo-hosted',turnId:turn,settlementNetwork:'tempo-testnet'}),render:ad=>post(`/demo/awards/${ad.award.id}/render`,{creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true},{'x-axp-delivery-token':ad.deliveryToken})};
}

test('actual Tempo worker survives hosted cold starts, unknown payout recovery, read-only GETs and final refund',async t=>{
 const controls={},f=await fixture(t,controls),campaign=await f.launch();assert.equal(campaign.status,'active');const first=await f.ad('first');assert.equal(first.body.status,'awarded');const delivered=await f.render(first.body);assert.equal(delivered.body.authorization.status,'authorized');
 controls.loseAck='payout';const payout=await f.post(`/campaigns/${campaign.id}/payout`,{});assert.equal(payout.body.paymentOperation.status,'unknown');const signedHash=payout.body.campaign.payment.transactions.at(-1).transactionHash;
 await f.restart();const before=await f.kv.get(productStateKey('demo')),count=f.calls.length;const reports=await Promise.all(['/bootstrap','/state','/publisher/config'].map(path=>request(f.api,path)));assert.deepEqual(reports.map(r=>r.status),[200,200,200]);assert.equal(f.calls.length,count);assert.equal(await f.kv.get(productStateKey('demo')),before);assert.equal(reports[1].body.campaigns[0].payment.reconciliationRequired,true);
 const recovered=await f.post(`/campaigns/${campaign.id}/reconcile`,{});assert.equal(recovered.body.paymentOperation.status,'reconciled');assert.equal(recovered.body.campaign.settledBaseUnits,first.body.award.priceBaseUnits);assert.equal(recovered.body.campaign.payment.transactions.at(-1).transactionHash,signedHash);assert.equal(f.calls.filter(c=>c==='sign:payout').length,1);assert.equal(f.calls.filter(c=>c==='submit:payout').length,1);assert.equal(f.calls.filter(c=>c==='lookup').length,1);
 const second=await f.ad('second');await f.render(second.body);const closed=await f.post(`/campaigns/${campaign.id}/close`,{});assert.equal(closed.body.campaign.status,'settled');const total=BigInt(first.body.award.priceBaseUnits)+BigInt(second.body.award.priceBaseUnits);assert.equal(closed.body.campaign.settledBaseUnits,String(total));assert.equal(BigInt(closed.body.campaign.refundBaseUnits)+total,BigInt(campaign.depositBaseUnits));
 await f.restart();const signed=f.calls.filter(c=>c.startsWith('sign:')||c==='voucher'||c.startsWith('submit:')).length;assert.equal((await f.render(first.body)).body.replayed,true);assert.equal((await f.post(`/campaigns/${campaign.id}/close`,{})).body.replayed,true);assert.equal(f.calls.filter(c=>c.startsWith('sign:')||c==='voucher'||c.startsWith('submit:')).length,signed);
 const saved=await f.snapshot();assert.equal(saved.channels[0].intents.length,2);assert.equal(saved.channels[0].operations.length,3);assert.equal(rows(saved.dir,'exchange.sqlite','charges').length,2);assert.equal(saved.row.lease,null);
});

test('actual Tempo worker loses hosted lease before broadcast: zero sends and no stale snapshot overwrite',async t=>{
 const entered=deferred(),release=deferred(),f=await fixture(t,{beforeBroadcast:async()=>{entered.resolve();await release.promise;}}),campaign=await f.draft();
 const stale=f.post(`/campaigns/${campaign.id}/launch`,{});await entered.promise;assert.equal(f.calls.filter(c=>c==='sign:open').length,1);assert.equal(f.calls.filter(c=>c==='submit:open').length,0);
 f.advance(240001);await f.api.financialWorkspace.withState(({dir})=>writeFileSync(join(dir,'successor-proof'),'new-owner'));const successor=await f.kv.get(productStateKey('demo'));release.resolve();const result=await stale;assert.equal(result.status,503);assert.equal(result.body.error,'product_lease_lost');assert.equal(await f.kv.get(productStateKey('demo')),successor);assert.equal(f.calls.filter(c=>c==='submit:open').length,0);
 const saved=await f.snapshot();assert.equal(readFileSync(join(saved.dir,'successor-proof'),'utf8'),'new-owner');assert.equal(saved.channels[0].operations[0].status,'submitting');assert.ok(saved.channels[0].operations[0].signed.wire);assert.equal(saved.channels[0].operations[0].attempt.transactionHash,saved.channels[0].operations[0].signed.transactionHash);assert.equal(saved.channels[0].operations[0].receipt,null);assert.equal(saved.row.lease,null);
});

test('actual Tempo worker hosted concurrent mutations admit one lease owner while GETs stay read-only',async t=>{
 const entered=deferred(),release=deferred(),f=await fixture(t,{prepare:async kind=>{if(kind==='open'){entered.resolve();await release.promise;}}}),campaign=await f.draft();
 const launch=f.post(`/campaigns/${campaign.id}/launch`,{});await entered.promise;const held=await f.kv.get(productStateKey('demo'));assert.ok(JSON.parse(held).lease);
 const [duplicate,edit,report]=await Promise.all([f.post(`/campaigns/${campaign.id}/launch`,{}),f.post('/account',{name:'losing writer',websiteURL:'https://example.test/'}),request(f.api,'/state')]);assert.deepEqual([duplicate.status,edit.status,report.status],[429,429,200]);assert.equal(duplicate.body.error,'product_busy_retry');assert.equal(edit.body.error,'product_busy_retry');assert.equal(await f.kv.get(productStateKey('demo')),held);assert.equal(f.calls.filter(c=>c.startsWith('sign:')||c.startsWith('submit:')).length,0);
 release.resolve();assert.equal((await launch).body.campaign.status,'active');assert.equal(f.calls.filter(c=>c==='prepare:open').length,1);assert.equal(f.calls.filter(c=>c==='sign:open').length,1);assert.equal(f.calls.filter(c=>c==='submit:open').length,1);assert.equal((await f.snapshot()).channels.length,1);
});
