import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {randomUUID,createPublicKey} from 'node:crypto';
import {ContractError,canonical,hash,baseUnits,validateCampaign,validateOpportunity,validateDecision,computeBid,verifyReceipt} from '../contracts/index.mjs';

export class Exchange {
  constructor({dbPath=':memory:',runId='demo',mode='synthetic',now=Date.now,networkState=null}={}) {
    if(mode!=='synthetic'&&(!['sandbox','devnet'].includes(mode)||typeof networkState!=='function'))throw new ContractError('network_adapter_required');
    this.runId=runId;this.mode=mode;this.now=now;this.networkState=networkState;
    if(dbPath!==':memory:')mkdirSync(dirname(dbPath),{recursive:true,mode:0o700});
    this.db=new DatabaseSync(dbPath);this.db.exec('PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;');
    for(const table of ['runs','publishers','channels','campaigns','campaign_versions','opportunities','awards','charges','receipt_records'])this.db.exec(`CREATE TABLE IF NOT EXISTS ${table}(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))`);
    this.db.exec('CREATE TABLE IF NOT EXISTS requests(run TEXT NOT NULL,route TEXT NOT NULL,key TEXT NOT NULL,body_hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(run,route,key)); CREATE TABLE IF NOT EXISTS events(seq INTEGER PRIMARY KEY AUTOINCREMENT,run TEXT NOT NULL,type TEXT NOT NULL,at INTEGER NOT NULL,data TEXT NOT NULL);');
    const existing=this.get('runs',runId);if(existing&&existing.mode!==mode)throw new ContractError('mode_conflict');
    if(!existing)this.put('runs',runId,{runId,mode,schemaVersion:'axp.runtime.v1',createdAt:this.now()});
  }
  get(table,id){const r=this.db.prepare(`SELECT data FROM ${table} WHERE run=? AND id=?`).get(this.runId,id);return r?JSON.parse(r.data):null;}
  all(table){return this.db.prepare(`SELECT data FROM ${table} WHERE run=? ORDER BY id`).all(this.runId).map(r=>JSON.parse(r.data));}
  put(table,id,data){this.db.prepare(`INSERT INTO ${table}(run,id,data) VALUES(?,?,?) ON CONFLICT(run,id) DO UPDATE SET data=excluded.data`).run(this.runId,id,canonical(data));return data;}
  event(type,data){this.db.prepare('INSERT INTO events(run,type,at,data) VALUES(?,?,?,?)').run(this.runId,type,this.now(),canonical(data));}
  tx(fn){this.db.exec('BEGIN IMMEDIATE');try{const r=fn();this.db.exec('COMMIT');return r;}catch(e){this.db.exec('ROLLBACK');throw e;}}
  require(table,id){const r=this.get(table,id);if(!r)throw new ContractError('not_found',id,404);return r;}
  registerPublisher(p){
    if(!p.publisherId||!p.publisherKeyId||!p.payee)throw new ContractError('invalid_publisher');
    const key=createPublicKey(p.publicKeyPEM);if(key.asymmetricKeyType!=='ed25519')throw new ContractError('invalid_publisher_key');
    return this.tx(()=>{const old=this.get('publishers',p.publisherId);if(old&&hash(old)!==hash(p))throw new ContractError('publisher_conflict',undefined,409);return this.put('publishers',p.publisherId,p);});
  }
  createChannel(c){
    if(c.mode!==this.mode||!c.channelId||!c.advertiserId||(c.mode!=='synthetic'&&!this.networkState))throw new ContractError('network_adapter_required');
    const pub=this.require('publishers',c.publisherId);if(c.payee!==pub.payee)throw new ContractError('payee_mismatch');
    baseUnits(c.depositBaseUnits);
    return this.tx(()=>{const old=this.get('channels',c.channelId);if(old){for(const k of ['advertiserId','publisherId','payee','depositBaseUnits','mode'])if(old[k]!==c[k])throw new ContractError('channel_conflict',undefined,409);return old;}
      const channel={...c,status:c.mode==='synthetic'?'open':'pending_open',authorizedBaseUnits:'0',settledBaseUnits:'0',refundBaseUnits:'0',txSignature:null};this.put('channels',c.channelId,channel);this.event(c.mode==='synthetic'?'synthetic_channel_opened':'channel_configuration_registered',{channelId:c.channelId,depositBaseUnits:c.depositBaseUnits});return channel;});
  }
  // Trusted backend projection, never an HTTP signing/funding action.
  syncNetworkChannel(id) {if(this.mode==='synthetic'||!this.networkState)throw new ContractError('network_adapter_required');return this.tx(()=>{const c=this.require('channels',id),s=this.networkState(id);if(!s)return c;if(s.channelId!==id||s.runId!==this.runId||s.mode!==this.mode)throw new ContractError('channel_binding');
    if(s.openStatus!=='finalized')return c;
    const status=s.phase==='finalized'?'finalized':['draining','closing'].includes(s.phase)?'draining':'open';
    Object.assign(c,{status,depositBaseUnits:s.depositBaseUnits,authorizedBaseUnits:s.authorizedBaseUnits,settledBaseUnits:s.settledBaseUnits,refundBaseUnits:s.refundBaseUnits,protocolChannelId:s.protocolChannelId,termsHash:s.termsHash,closeStatus:s.closeStatus});
    this.put('channels',id,c);return c;});}
  drainNetworkChannel(id) {if(this.mode==='synthetic')throw new ContractError('network_adapter_required');return this.tx(()=>{const c=this.require('channels',id);if(c.status==='open'){c.status='draining';this.put('channels',id,c);}return c;});}
  createCampaign(c){validateCampaign(c);return this.tx(()=>{
    const channel=this.require('channels',c.channelId);if(channel.advertiserId!==c.advertiserId)throw new ContractError('channel_binding');
    const version=this.get('campaign_versions',c.campaignVersionId);if(version&&hash(version)!==hash(c))throw new ContractError('immutable_version_conflict',undefined,409);
    const old=this.get('campaigns',c.campaignId);if(old){if(old.advertiserId!==c.advertiserId||old.channelId!==c.channelId)throw new ContractError('campaign_binding');
      if(old.campaignVersionId===c.campaignVersionId)return old;
      const {accepted,reserved}=this.totals({campaignId:c.campaignId});if(baseUnits(c.budgetCapBaseUnits)<accepted+reserved)throw new ContractError('cap_below_obligations');}
    this.put('campaign_versions',c.campaignVersionId,c);this.put('campaigns',c.campaignId,c);this.event('campaign_created',{campaignId:c.campaignId,campaignVersionId:c.campaignVersionId});return c;
  });}
  pauseCampaign(id){return this.tx(()=>{const c=this.require('campaigns',id);c.status='paused';this.put('campaigns',id,c);this.event('campaign_paused',{campaignId:id});return c;});}
  createOpportunity(input,{idempotencyKey}={}){validateOpportunity(input);if(!idempotencyKey)throw new ContractError('idempotency_required');return this.tx(()=>{
    this.require('publishers',input.publisherId);const bodyHash=hash(input),route='createOpportunity';
    const req=this.db.prepare('SELECT body_hash,result FROM requests WHERE run=? AND route=? AND key=?').get(this.runId,route,idempotencyKey);
    if(req){if(req.body_hash!==bodyHash)throw new ContractError('idempotency_conflict',undefined,409);return this.require('opportunities',req.result);}
    const business=hash([input.publisherId,input.randomSessionId,input.turnId]);const id=`opp-${business.slice(0,24)}`;const old=this.get('opportunities',id);
    if(old&&old.bodyHash!==bodyHash)throw new ContractError('idempotency_conflict',undefined,409);
    const o=old??{...input,id,runId:this.runId,mode:this.mode,bodyHash,status:'collecting',createdAt:this.now(),outcome:null};
    if(!old){this.put('opportunities',id,o);this.event('opportunity_created',{opportunityId:id,coarseIntent:o.coarseIntent});}
    this.db.prepare('INSERT INTO requests VALUES(?,?,?,?,?)').run(this.runId,route,idempotencyKey,bodyHash,id);return o;
  });}
  totals({campaignId,channelId}={}){
    const matching=a=>(!campaignId||a.campaignId===campaignId)&&(!channelId||a.channelId===channelId);
    const accepted=this.all('charges').filter(matching).reduce((n,c)=>n+baseUnits(c.amountBaseUnits),0n);
    const reserved=this.all('awards').filter(a=>a.status==='reserved'&&matching(a)).reduce((n,a)=>n+baseUnits(a.priceBaseUnits),0n);return {accepted,reserved};
  }
  available(c){const ct=this.totals({campaignId:c.campaignId}),ch=this.require('channels',c.channelId),t=this.totals({channelId:c.channelId});return {campaign:(baseUnits(c.budgetCapBaseUnits)-ct.accepted-ct.reserved).toString(),channel:(baseUnits(ch.depositBaseUnits)-t.accepted-t.reserved).toString()};}
  reason(c,o,{ignoreFunding=false}={}){
    if(c.status!=='active')return 'campaign_paused';if(!c.allowedIntents.includes(o.coarseIntent)||c.destination!==o.destination)return 'policy_excluded';
    if(o.taskConstraints.some(k=>!c.declaredConstraints.includes(k)))return 'missing_constraint';
    const ch=this.require('channels',c.channelId);if(ch.publisherId!==o.publisherId||(!ignoreFunding&&ch.status!=='open'))return 'channel_unavailable';
    if(baseUnits(c.maxBidBaseUnits)<baseUnits(o.floorBaseUnits))return 'below_floor';
    const counts=this.all('awards').filter(a=>a.campaignId===c.campaignId&&a.randomSessionId===o.randomSessionId&&['reserved','delivered'].includes(a.status)).length;
    if(counts>=2)return 'frequency_cap';const av=this.available(c);if(baseUnits(av.campaign)<baseUnits(o.floorBaseUnits)||(!ignoreFunding&&baseUnits(av.channel)<baseUnits(o.floorBaseUnits)))return 'budget_unavailable';return null;
  }
  decisionCandidates(id) {const o=this.require('opportunities',id),eligible=[],excluded=[];for(const c of this.all('campaigns')){const reason=this.reason(c,o,{ignoreFunding:this.mode!=='synthetic'});if(reason)excluded.push({campaignId:c.campaignId,reason});else eligible.push(c);}return {eligible,excluded,financialEligibilityCheckedAtAuction:true};}
  eligibleCampaigns(id){const o=this.require('opportunities',id),eligible=[],excluded=[];for(const c of this.all('campaigns')){const reason=this.reason(c,o);if(reason)excluded.push({campaignId:c.campaignId,reason});else eligible.push(c);}return {eligible,excluded};}
  runAuction(id,decisions){return this.tx(()=>{
    this.expireInside();const o=this.require('opportunities',id);if(o.outcome)return o.outcome;
    if(o.expiresAt<=this.now()){o.status='expired';o.outcome={status:'expired',bids:[],rejections:[]};this.put('opportunities',id,o);return o.outcome;}
    if(!Array.isArray(decisions))throw new ContractError('invalid_decisions');const bids=[],rejections=[],seen=new Set();
    const {excluded}=this.eligibleCampaigns(id);rejections.push(...excluded);
    for(const d of decisions){const c=this.all('campaigns').find(c=>c.campaignVersionId===d.campaignVersionId);
      if(!c){rejections.push({campaignVersionId:d.campaignVersionId??'unknown',reason:'version_invalid'});continue;}
      if(seen.has(c.campaignId))throw new ContractError('duplicate_decision');seen.add(c.campaignId);
      const reason=this.reason(c,o);if(reason)continue;
      try{validateDecision(d,c,o,this.now(),o.expiresAt);}catch(e){rejections.push({campaignId:c.campaignId,reason:e.code??'decision_invalid'});continue;}
      this.event('buyer_decision',{opportunityId:id,decision:d});const av=this.available(c),bid=computeBid(d,c,av.campaign,av.channel,o.floorBaseUnits);
      if(bid.status!=='bid'){rejections.push({campaignId:c.campaignId,reason:bid.reason});continue;}
      bids.push({...bid,id:`bid-${randomUUID()}`,opportunityId:id,campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,advertiserId:c.advertiserId,creativeVersionId:d.creativeVersionId,agentRunId:d.agentRunId});
    }
    bids.sort((a,b)=>{const x=baseUnits(a.amountBaseUnits),y=baseUnits(b.amountBaseUnits);return x===y?a.campaignId.localeCompare(b.campaignId):x>y?-1:1;});
    let award=null;for(const bid of bids){const c=this.require('campaigns',bid.campaignId),reason=this.reason(c,o);if(reason){rejections.push({campaignId:c.campaignId,reason});continue;}
      const cr=c.creatives.find(cr=>cr.creativeVersionId===bid.creativeVersionId),channel=this.require('channels',c.channelId),cap=randomUUID();
      award={id:`award-${randomUUID()}`,runId:this.runId,mode:this.mode,opportunityId:id,campaignId:c.campaignId,campaignVersionId:c.campaignVersionId,advertiserId:c.advertiserId,publisherId:o.publisherId,randomSessionId:o.randomSessionId,channelId:c.channelId,creativeVersionId:cr.creativeVersionId,creativeHash:hash(cr),creative:cr,priceBaseUnits:bid.amountBaseUnits,payee:channel.payee,winningBidId:bid.id,status:'reserved',expiresAt:o.expiresAt,renderTokenHash:hash(cap),createdAt:this.now()};
      this.put('awards',award.id,award);this.event('award_reserved',{awardId:award.id,opportunityId:id,priceBaseUnits:award.priceBaseUnits,campaignId:c.campaignId});break;
    }
    const outcome={status:award?'awarded':'no_fill',...(award?{award}:{}),bids,rejections};o.status=outcome.status;o.outcome=outcome;this.put('opportunities',id,o);return outcome;
  });}
  acceptDelivery({receipt,signature}){return this.tx(()=>{
    const a=this.require('awards',receipt.awardId),p=this.require('publishers',a.publisherId);
    if(!verifyReceipt(receipt,signature,p.publicKeyPEM)||receipt.runId!==this.runId||receipt.mode!==this.mode||receipt.publisherId!==p.publisherId||receipt.publisherKeyId!==p.publisherKeyId||receipt.opportunityId!==a.opportunityId||receipt.creativeHash!==a.creativeHash)throw new ContractError('receipt_invalid');
    const expectedAck=hash({awardId:a.id,creativeHash:a.creativeHash,domInserted:true,sponsoredLabelPresent:true});
    if(receipt.renderAcknowledgementHash!==expectedAck)throw new ContractError('receipt_invalid');
    const chargeId=`charge-${a.id}`,old=this.get('charges',chargeId);if(old){if(old.receiptHash!==hash(receipt))throw new ContractError('receipt_conflict',undefined,409);if(!this.get('receipt_records',chargeId))this.put('receipt_records',chargeId,{chargeId,receipt,signature,receiptHash:hash(receipt),recordedOnReplay:true});return {delivery:old.delivery,charge:old,replayed:true};}
    const ch=this.require('channels',a.channelId),at=this.now();if(!['open','draining'].includes(ch.status)||a.status!=='reserved'||at>=a.expiresAt)throw new ContractError('award_expired',undefined,409);
    const sequence=this.all('charges').filter(c=>c.channelId===a.channelId).length+1;
    const delivery={id:`delivery-${a.id}`,awardId:a.id,status:'accepted',receivedAt:at,receiptHash:hash(receipt)};
    const charge={id:chargeId,runId:this.runId,mode:this.mode,awardId:a.id,deliveryId:delivery.id,campaignId:a.campaignId,campaignVersionId:a.campaignVersionId,channelId:a.channelId,amountBaseUnits:a.priceBaseUnits,acceptedAt:at,sequence,status:'accepted',receiptHash:hash(receipt),delivery};
    a.status='delivered';this.put('awards',a.id,a);this.put('charges',chargeId,charge);this.put('receipt_records',chargeId,{chargeId,receipt,signature,receiptHash:hash(receipt),recordedOnReplay:false});this.event('delivery_accepted',{awardId:a.id,deliveryId:delivery.id});this.event('charge_accepted',{chargeId,channelId:a.channelId,amountBaseUnits:charge.amountBaseUnits});return {delivery,charge,replayed:false};
  });}
  failAward(id){return this.tx(()=>{const a=this.require('awards',id);if(a.status==='delivered')throw new ContractError('already_delivered',undefined,409);if(a.status==='reserved'){a.status='failed';this.put('awards',id,a);this.event('render_failed',{awardId:id});}return a;});}
  expireInside(){for(const a of this.all('awards'))if(a.status==='reserved'&&this.now()>=a.expiresAt){a.status='expired';this.put('awards',a.id,a);this.event('award_expired',{awardId:a.id});}}
  expireAwards(){return this.tx(()=>{this.expireInside();return this.all('awards');});}
  authorizeSynthetic(id){return this.tx(()=>{const ch=this.require('channels',id);if(ch.mode!=='synthetic')throw new ContractError('network_adapter_required');if(!['open','draining'].includes(ch.status))return ch;
    const charges=this.all('charges').filter(c=>c.channelId===id).sort((a,b)=>a.sequence-b.sequence);
    let total=0n;for(const c of charges){total+=baseUnits(c.amountBaseUnits);if(c.status==='accepted'){c.status='authorized';this.put('charges',c.id,c);this.event('synthetic_voucher_authorized',{channelId:id,chargeId:c.id,cumulativeAmountBaseUnits:total.toString()});}}
    if(total>baseUnits(ch.depositBaseUnits))throw new ContractError('cap_exceeded');ch.authorizedBaseUnits=total.toString();this.put('channels',id,ch);return ch;
  });}
  closeSynthetic(id){const result=this.tx(()=>{this.expireInside();const ch=this.require('channels',id);if(ch.status==='finalized')return ch;
    if(ch.mode!=='synthetic')throw new ContractError('network_adapter_required');ch.status='draining';this.put('channels',id,ch);
    if(this.all('awards').some(a=>a.channelId===id&&a.status==='reserved'))return {blocked:'close_not_drained'};
    const total=this.totals({channelId:id}).accepted;
    if(total!==baseUnits(ch.authorizedBaseUnits))return {blocked:'authorization_pending'};
    ch.status='finalized';ch.settledBaseUnits=total.toString();ch.refundBaseUnits=(baseUnits(ch.depositBaseUnits)-total).toString();ch.txSignature=null;
    this.put('channels',id,ch);for(const c of this.all('charges').filter(c=>c.channelId===id)){c.status='settled';this.put('charges',c.id,c);}
    this.event('synthetic_settlement',{channelId:id,settledBaseUnits:ch.settledBaseUnits,refundBaseUnits:ch.refundBaseUnits,txSignature:null});return ch;
  });if(result.blocked)throw new ContractError(result.blocked,undefined,409);return result;}
  report(){const awards=this.all('awards').map(({renderTokenHash,...a})=>a);const opportunities=this.all('opportunities').map(({outcome,...o})=>({...o,outcome:outcome?{...outcome,...(outcome.award?{award:awards.find(a=>a.id===outcome.award.id)}:{})}:null}));
    return {runId:this.runId,mode:this.mode,schemaVersion:'axp.runtime.v1',campaigns:this.all('campaigns'),channels:this.all('channels'),opportunities,awards,charges:this.all('charges'),events:this.db.prepare('SELECT seq,type,at,data FROM events WHERE run=? ORDER BY seq').all(this.runId).map(e=>({...e,data:JSON.parse(e.data)}))};}
  close(){this.db.close();}
}
