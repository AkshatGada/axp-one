// Offline adapter stubs: exercise product authority/routing, never network proof.
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {Readable} from 'node:stream';
import {createProductService,PRESETS} from '../../packages/product/service.mjs';
import {createProductAPI} from '../../packages/product/api.mjs';
import {createHostedProductAPI} from '../../packages/product/hosted.mjs';
import {hash} from '../../packages/contracts/index.mjs';
import {jevResponse} from '../ml/fixtures.mjs';
const TOKEN='0x20c0000000000000000000000000000000000000';
function fixture(t,options={}){
 const stateDir=mkdtempSync(join(tmpdir(),'axp-tempo-routing-')),calls=[],models=[];let service;
 const factory=network=>({exchange,signingEnabled})=>{
  exchange.db.exec('CREATE TABLE IF NOT EXISTS product_tempo_fixture(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
  const ids={payer:`offline-${network}-payer`,payee:`offline-${network}-payee`};
  const get=id=>exchange.get('product_tempo_fixture',id),put=p=>exchange.put('product_tempo_fixture',p.channelId,p);
  const sync=id=>{if(get(id))exchange.syncNetworkChannel(id);};
  const authorize=async id=>{const p=get(id),charges=exchange.all('charges').filter(c=>c.channelId===id);for(const c of charges)if(!p.vouchers.some(v=>v.chargeId===c.id)){const prior=BigInt(p.authorizedBaseUnits);p.authorizedBaseUnits=String(prior+BigInt(c.amountBaseUnits));p.vouchers.push({chargeId:c.id,status:'authorized',sequence:c.sequence,incrementBaseUnits:c.amountBaseUnits,cumulativeAmountBaseUnits:p.authorizedBaseUnits});calls.push(`${network}:voucher`);}p.acceptedBaseUnits=String(exchange.totals({channelId:id}).accepted);put(p);sync(id);return {status:'authorized'};};
  return {identities:ids,status:()=>({mode:'devnet',network,ready:signingEnabled,signingEnabled,...ids,...(network==='tempo-testnet'?{token:TOKEN,chainId:42431,tokenSymbol:'PathUSD',decimals:6}:{})}),
   async freeze(c){if(!get(c.channelId)){const ch=exchange.require('channels',c.channelId);put({channelId:c.channelId,runId:exchange.runId,mode:'devnet',network,...ids,...(ch.token?{token:ch.token}:{}),phase:'pending_open',openStatus:'prepared',closeStatus:null,protocolChannelId:`offline-${c.channelId}`,termsHash:'offline-fixture',depositBaseUnits:ch.depositBaseUnits,confirmedDepositBaseUnits:'0',acceptedBaseUnits:'0',authorizedBaseUnits:'0',settledBaseUnits:'0',refundBaseUnits:'0',vouchers:[],transactions:[]});}return {status:'frozen'};},
   async open(id){const p=get(id);if(p.openStatus!=='finalized'){calls.push(`${network}:open`);p.openStatus='finalized';p.phase='open';p.confirmedDepositBaseUnits=p.depositBaseUnits;put(p);}sync(id);return {status:'finalized'};},
   async drain(id){const p=get(id);p.phase='draining';put(p);sync(id);return {status:'draining'};},authorize,
   async payout(id){const p=get(id);if(p.settledBaseUnits!==p.authorizedBaseUnits){calls.push(`${network}:payout`);p.settledBaseUnits=p.authorizedBaseUnits;put(p);}sync(id);return {status:'finalized'};},
   async close(id){const p=get(id);if(p.closeStatus!=='finalized'){calls.push(`${network}:close`);p.closeStatus='finalized';p.phase='finalized';p.settledBaseUnits=p.authorizedBaseUnits;p.refundBaseUnits=String(BigInt(p.depositBaseUnits)-BigInt(p.authorizedBaseUnits));put(p);}sync(id);return {status:'finalized'};},
   async reconcile(id){sync(id);return {status:'reconciled'};},projection:get,evidence:id=>{const p=get(id);return p?{...p,canPayout:p.phase==='open',canClose:p.phase==='open',canSettle:p.phase==='open'}:null;},sync,dispose(){},
  };
 };
 const start=extra=>service=createProductService({stateDir,financialMode:'devnet',signingEnabled:true,publisherKey:'offline-publisher',tempoEnabled:true,tempoSigningEnabled:true,transport:async packet=>{models.push(packet.state.campaign.campaignId);return jevResponse(packet,3,3);},paymentOptions:{solanaFactory:factory('solana-devnet')},tempoFactory:factory('tempo-testnet'),...options,...extra});
 start();service.saveAccount({name:'Offline mixed-rail workspace',websiteURL:'https://example.test/'});
 t.after(()=>{service.close();rmSync(stateDir,{recursive:true,force:true});});
 return {get service(){return service;},calls,models,stateDir,start(extra){service.close();return start(extra);},async campaign(network){const {id,label,exampleQuestion,...draft}=PRESETS[0];if(network)draft.settlementNetwork=network;const c=service.saveCampaign(draft).campaign;service.approve(c.id);return (await service.launch(c.id)).campaign;},ad(network,turn='one'){return service.opportunity({question:PRESETS[0].exampleQuestion,sessionId:'offline',turnId:turn,...(network?{settlementNetwork:network}:{})});},render(ad){return service.render(ad.award.id,{creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true},ad.deliveryToken);}};
}

test('mixed campaigns filter settlement rails before Jev and preserve legacy publisher identity',async t=>{
 const f=fixture(t),publisher=f.service.exchange.require('publishers','axp-demo-publisher'),sol=await f.campaign(),tempo=await f.campaign('tempo-testnet');
 const ad=await f.ad('tempo-testnet');assert.equal(ad.award.campaignId,tempo.id);assert.equal(ad.award.payee,'offline-tempo-testnet-payee');assert.equal(ad.award.token,TOKEN);assert.equal(ad.award.settlementNetwork,'tempo-testnet');assert.deepEqual(f.models,[tempo.id]);assert.equal(ad.trace.candidates.find(c=>c.campaignId===sol.id).reason,'settlement_network_mismatch');
 const second=await f.ad(undefined,'two');assert.equal(second.award.campaignId,sol.id);assert.deepEqual(f.models,[tempo.id,sol.id]);assert.deepEqual(f.service.exchange.require('publishers','axp-demo-publisher'),publisher);
 assert.equal(f.service.exchange.all('publisher_settlement_routes').length,2);
});

test('Tempo receipts deduplicate vouchers, periodic payout stays active, close refunds only unused deposit',async t=>{
 const f=fixture(t),tempo=await f.campaign('tempo-testnet'),ad=await f.ad('tempo-testnet');
 const [first,replay]=await Promise.all([f.render(ad),f.render(ad)]);assert.equal(first.charge.id,replay.charge.id);assert.equal(f.calls.filter(c=>c==='tempo-testnet:voucher').length,1);assert.equal(first.receipt.mode,'devnet');assert.equal(first.receipt.schemaVersion,'publisher-receipt.v1');assert.equal('settlementNetwork' in first.receipt,false);
 const paid=await f.service.campaignAction(tempo.id,'payout');assert.equal(paid.campaign.status,'active');assert.equal(paid.campaign.settledBaseUnits,ad.award.priceBaseUnits);assert.equal(paid.campaign.refundBaseUnits,'0');
 await f.service.campaignAction(tempo.id,'payout');assert.equal(f.calls.filter(c=>c==='tempo-testnet:payout').length,1);
 const again=await f.ad('tempo-testnet','two');await f.render(again);const total=String(BigInt(ad.award.priceBaseUnits)+BigInt(again.award.priceBaseUnits));
 const state=f.service.state();assert.equal(state.summary.spendBaseUnits,'0');assert.equal(state.summary.bySettlementNetwork['tempo-testnet'].spendBaseUnits,total);assert.equal(state.summary.bySettlementNetwork['tempo-testnet'].settledBaseUnits,ad.award.priceBaseUnits);
 const closed=await f.service.campaignAction(tempo.id,'close');assert.equal(closed.campaign.status,'settled');assert.equal(closed.campaign.settledBaseUnits,total);assert.equal(BigInt(closed.campaign.refundBaseUnits)+BigInt(total),BigInt(tempo.depositBaseUnits));await f.service.campaignAction(tempo.id,'settle');assert.equal(f.calls.filter(c=>c==='tempo-testnet:close').length,1);
});

test('legacy approval hash, omitted-network request identity and receipt survive cold restart',async t=>{
 const f=fixture(t);const {id,label,exampleQuestion,...input}=PRESETS[0];const c=f.service.saveCampaign(input).campaign;f.service.approve(c.id);const stored=f.service.exchange.require('product_campaigns',c.id);assert.equal(stored.approvedContentHash,hash(Object.fromEntries(['name','brandName','websiteURL','productDescription','approvedText','contextHints','declaredCapabilities','maxBidBaseUnits','budgetCapBaseUnits','depositBaseUnits'].map(k=>[k,stored[k]]))));
 await f.service.launch(c.id);const ad=await f.ad();const receipt=await f.render(ad),calls=f.calls.length,publisher=f.service.exchange.require('publishers','axp-demo-publisher'),key=readFileSync(join(f.stateDir,'publisher-receipt.pem'),'utf8');f.start({tempoEnabled:false});assert.deepEqual(f.service.exchange.require('publishers','axp-demo-publisher'),publisher);assert.equal(readFileSync(join(f.stateDir,'publisher-receipt.pem'),'utf8'),key);
 assert.equal((await f.ad('solana-devnet')).award.id,ad.award.id);const replay=await f.render(ad);assert.equal(replay.receiptHash,receipt.receiptHash);assert.equal(replay.signature,receipt.signature);assert.equal(f.calls.length,calls);
 assert.equal(f.service.payments().networks['tempo-testnet'].reason,'tempo_disabled');
});

test('strict networks, approved terms and payee/asset bindings cannot be supplied by browser',async t=>{
 const f=fixture(t);for(const value of [null,'tempo-mainnet','solana','',5]){assert.throws(()=>f.service.saveCampaign({settlementNetwork:value}),e=>e.code==='settlement_network_invalid');await assert.rejects(f.service.opportunity({question:PRESETS[0].exampleQuestion,sessionId:'invalid',turnId:'network',settlementNetwork:value}),e=>e.code==='settlement_network_invalid');}
 const c=await f.campaign('tempo-testnet');assert.throws(()=>f.service.saveCampaign({id:c.id,settlementNetwork:'solana-devnet'}),e=>e.code==='launched_campaign_immutable');const ad=await f.ad('tempo-testnet');assert.throws(()=>f.service.exchange.createChannel({...f.service.exchange.require('channels',ad.award.channelId),payee:'browser-payee'}),e=>e.code==='payee_mismatch');assert.throws(()=>f.service.exchange.createChannel({...f.service.exchange.require('channels',ad.award.channelId),token:'wrong-token'}),e=>e.code==='asset_mismatch');
 await assert.rejects(f.service.render(ad.award.id,{creativeHash:ad.award.creativeHash,domInserted:true,sponsoredLabelPresent:true,settlementNetwork:'solana-devnet'},ad.deliveryToken),e=>e.code==='unknown_field');
 f.service.exchange.tx(()=>f.service.exchange.put('awards',ad.award.id,{...f.service.exchange.require('awards',ad.award.id),token:'wrong-token'}));await assert.rejects(f.render(ad),e=>e.code==='channel_binding');assert.equal(f.service.exchange.all('charges').length,0);
});

test('disabled or invalid Tempo never initializes its worker or blocks Solana reads/actions',async t=>{
 let constructions=0;const f=fixture(t,{tempoEnabled:false,tempoFactory:()=>{constructions++;throw Error('must not initialize');}});const c=await f.campaign();assert.equal(constructions,0);assert.equal((await f.ad()).award.campaignId,c.id);await assert.rejects(f.ad('tempo-testnet'),e=>e.code==='tempo_disabled');assert.equal(f.models.length,1);await assert.rejects(f.service.campaignAction(c.id,'payout'),e=>e.code==='payout_unsupported');
 f.start({tempoEnabled:true,tempoFactory:()=>{throw Object.assign(Error('invalid wallet'),{code:'tempo_wallet_invalid'});}});assert.equal(f.service.payments().ready,true);assert.equal(f.service.payments().networks['tempo-testnet'].reason,'tempo_wallet_invalid');assert.equal(f.service.state().campaigns.length,1);await assert.rejects(f.ad('tempo-testnet','two'),e=>e.code==='tempo_wallet_invalid');assert.equal(f.models.length,1);
});

async function request(api,path,body,csrf){const req=Object.assign(Readable.from(body===undefined?[]:[Buffer.from(JSON.stringify(body))]),{url:`/api/product${path}`,method:body===undefined?'GET':'POST',headers:{host:'example.test','content-type':'application/json',...(csrf?{'x-axp-csrf':csrf}:{})}}),res={writeHead(status){this.status=status;},end(body){this.body=JSON.parse(body);}};await api.handler(req,res);return res;}
test('payout and close API actions retain CSRF, empty-body and receipt-controlled authority',async t=>{
 const f=fixture(t),c=await f.campaign('tempo-testnet'),api=createProductAPI({service:f.service,csrf:'offline-csrf'});assert.equal((await request(api,`/campaigns/${c.id}/payout`,{},undefined)).status,403);assert.equal((await request(api,`/campaigns/${c.id}/close`,{amountBaseUnits:'1'},'offline-csrf')).body.error,'empty_body_required');assert.equal((await request(api,`/campaigns/${c.id}/close`,{},'offline-csrf')).body.campaign.status,'settled');
 const bootstrap=await request(api,'/bootstrap');assert.equal(bootstrap.body.payments.networks['tempo-testnet'].network,'tempo-testnet');assert.equal((await request(api,'/publisher/config')).body.settlementNetwork,'solana-devnet');
});

test('hosted missing Tempo wallet reports only Tempo unavailable while Solana bootstrap remains available',async t=>{
 const values=new Map(),kv={kind:'fixture',get:async k=>values.get(k)??null,compareAndSet:async(k,b,v)=>{if((values.get(k)??null)!==b)return false;values.set(k,v);return true;}},root=mkdtempSync(join(tmpdir(),'axp-hosted-tempo-offline-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const api=await createHostedProductAPI({root,kv,config:{AXP_PRODUCT_ENABLED:'1',AXP_STATE_KEY:Buffer.alloc(32,7).toString('base64'),AXP_PRODUCT_FINANCIAL_MODE:'devnet',AXP_PRODUCT_TEMPO_ENABLED:'1',AXP_PRODUCT_TEMPO_SIGN:'1',VERCEL:'1'},retriever:{},serviceOptions:{paymentOptions:{identities:{payer:'offline-sol-payer',payee:'offline-sol-payee'},lock:false}}});
 const health=await request(api,'/health');assert.equal(health.body.enabled,true);assert.equal(health.body.configured.tempo.wallet,false);const boot=await request(api,'/bootstrap');assert.equal(boot.status,200);assert.equal(boot.body.payments.networks['tempo-testnet'].ready,false);
});

test('disabled Tempo preserves existing funded projections, frozen routes and all accepted obligations',async t=>{
 const f=fixture(t),c=await f.campaign('tempo-testnet'),ad=await f.ad('tempo-testnet');await f.render(ad);const before=f.service.state(),route=f.service.exchange.settlementRoute('axp-demo-publisher','tempo-testnet'),channel=f.service.exchange.require('channels',ad.award.channelId),charges=f.service.exchange.all('charges'),count=f.calls.length;
 f.start({tempoEnabled:false});const after=f.service.state(),view=after.campaigns.find(x=>x.id===c.id);assert.equal(view.payment.reason,'tempo_disabled');assert.equal(view.payment.canPayout,false);assert.equal(view.payment.payee,route.payee);assert.deepEqual(f.service.exchange.require('channels',ad.award.channelId),channel);assert.deepEqual(f.service.exchange.all('charges'),charges);assert.deepEqual(after.summary,before.summary);assert.equal(f.calls.length,count);await assert.rejects(f.service.campaignAction(c.id,'close'),e=>e.code==='tempo_disabled');assert.deepEqual(f.service.exchange.require('channels',ad.award.channelId),channel);assert.equal(f.service.exchange.require('product_campaigns',c.id).status,'active');assert.deepEqual(f.service.exchange.settlementRoute('axp-demo-publisher','tempo-testnet'),route);
});

test('wrong-chain projections and publisher route replacements fail closed without changing frozen records',async t=>{
 const f=fixture(t),c=await f.campaign('tempo-testnet'),channel=f.service.exchange.require('channels',`${c.id}-channel`),route=f.service.exchange.settlementRoute('axp-demo-publisher','tempo-testnet');
 assert.throws(()=>f.service.exchange.registerPublisherSettlementRoute({...route,payee:'replacement-payee'}),e=>e.code==='publisher_route_conflict');assert.deepEqual(f.service.exchange.settlementRoute('axp-demo-publisher','tempo-testnet'),route);
 const projection=f.service.paymentWorker.projection(channel.channelId);f.service.exchange.networkState=()=>({...projection,network:'solana-devnet'});assert.throws(()=>f.service.exchange.syncNetworkChannel(channel.channelId),e=>e.code==='channel_binding');assert.deepEqual(f.service.exchange.require('channels',channel.channelId),channel);
});
