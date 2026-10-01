import {mkdirSync,readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {generateKeyPairSync,createPrivateKey,createPublicKey,randomUUID} from 'node:crypto';
import {Exchange} from '../../packages/exchange/index.mjs';
import {campaignFixtures} from '../../packages/contracts/fixtures.mjs';
import {ContractError,hash,signReceipt} from '../../packages/contracts/index.mjs';
import {sanitizedOpportunity,ruleBuyer} from '../../packages/dsp/rules.mjs';
import {codexBuyer,organicAnswer} from '../../packages/dsp/codex.mjs';
import {RuleDecisionEngine} from '../../packages/ml/index.mjs';
import {makeDecisionRequest,runDecisionEngine} from '../../packages/dsp/decision-engine.mjs';

export function createSession({stateDir='local-state/demo',runId='local-demo',now=Date.now,campaigns=campaignFixtures(),opportunityFactory=sanitizedOpportunity,providers={},mode='synthetic',networkState=null,publisherPayee=null}={}) {
  const dir=resolve(stateDir);mkdirSync(dir,{recursive:true,mode:0o700});
  // Publisher receipt identity only. This is NOT a Solana wallet or payment key.
  const keyPath=join(dir,'publisher-receipt.pem');
  if(!existsSync(keyPath))writeFileSync(keyPath,generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}),{mode:0o600,flag:'wx'});
  const privateKey=createPrivateKey(readFileSync(keyPath));
  const exchange=new Exchange({dbPath:join(dir,'exchange.sqlite'),runId,now,mode,networkState});
  exchange.db.exec('CREATE TABLE IF NOT EXISTS demo_turns(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
  exchange.db.exec('CREATE TABLE IF NOT EXISTS demo_organic_recoveries(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
  const publisherId='owned-travel-app',publisherKeyId='local-publisher-v1',payee=publisherPayee??'synthetic:owned-travel-publisher';
  exchange.registerPublisher({publisherId,publisherKeyId,payee,publicKeyPEM:createPublicKey(privateKey).export({type:'spki',format:'pem'})});
  for(const c of campaigns){
    if(!exchange.get('channels',c.channelId))exchange.createChannel({channelId:c.channelId,advertiserId:c.advertiserId,publisherId,payee,depositBaseUnits:mode==='synthetic'?c.budgetCapBaseUnits:'0',mode});
    if(mode!=='synthetic')exchange.syncNetworkChannel(c.channelId);
    if(!exchange.get('campaigns',c.campaignId))exchange.createCampaign(c);
  }
  let active=0,closed=false;
  const publicOutcome=outcome=>{if(!outcome.award)return outcome;const current=exchange.get('awards',outcome.award.id)??outcome.award;const {renderTokenHash,...award}=current;return {...outcome,award};};
  const publicResult=result=>{const recovery=exchange.get('demo_organic_recoveries',result.opportunityId);return {...result,outcome:publicOutcome(result.outcome),...(recovery?{originalOrganic:result.organic,organic:recovery.organic,organicRecovery:recovery}: {})};};
  async function turn({prompt,engine='rules',turnId=randomUUID(),randomSessionId='demo-session'},{buyer,answer}={}) {
    if(closed)throw new ContractError('session_closed',undefined,409);
    if(!['rules','ml-rules','codex',...Object.keys(providers)].includes(engine))throw new ContractError('engine_unavailable');
    const provider=providers[engine];
    if(typeof turnId!=='string'||turnId.length>100||!turnId)throw new ContractError('invalid_turn');
    const turnKey=hash([randomSessionId,turnId]);
    const inputHash=hash({prompt,engine,randomSessionId,turnId});
    const prior=exchange.get('demo_turns',turnKey);
    exchange.expireAwards();
    if(prior){if(prior.inputHash!==inputHash)throw new ContractError('idempotency_conflict',undefined,409);return {...publicResult(prior.result),replayed:true};}
    // Do not store or send the raw conversation to buyers. Only coarse declarations.
    const input=opportunityFactory(prompt,{turnId,now:now(),randomSessionId});
    const businessId=`opp-${hash([publisherId,randomSessionId,turnId]).slice(0,24)}`;
    const existing=exchange.get('opportunities',businessId);
    if(existing){input.expiresAt=existing.expiresAt;}
    const opportunity=exchange.createOpportunity(input,{idempotencyKey:turnKey});
    if(existing?.outcome) return {runId,mode,engine,opportunityId:opportunity.id,outcome:publicOutcome(existing.outcome),organic:{status:'unavailable',source:'recovery',text:'Existing auction outcome recovered; no new model call.'},attempts:[],replayed:true};
    if(existing)throw new ContractError('turn_pending',undefined,409);
    active++;
    try {
      provider?.beforeTurn?.(exchange,opportunity);
      const organicPromise=(async()=>{
        if(answer)return answer(input);
        if(provider?.answer){
          try{return await provider.answer(input,exchange,opportunity);}
          catch(e){return {status:'unavailable',source:'actual-model',text:'Organic model unavailable; no model answer fabricated.',reason:e.code??'agent_execution_failed'};}
        }
        if(engine==='codex'){
          try{const r=await organicAnswer(JSON.stringify(input));return {status:'completed',source:'actual-model',text:r.value.answer,provenance:r.provenance};}
          catch(e){return {status:'unavailable',source:'actual-model',text:'Organic model unavailable; no model answer fabricated.',reason:e.code??'agent_execution_failed'};}
        }
        return {status:'completed',source:'deterministic-reference',text:'Reference response, not an LLM answer: compare cancellation terms, total cost and distance to Marina Bay before booking. These fictional ads do not establish rates or availability.'};
      })();
      const {eligible,excluded}=exchange.decisionCandidates(opportunity.id);
      const attempts=await Promise.all(eligible.map(async c=>{
        const started=performance.now();
        try{
          let decision;
          if(buyer)decision=await buyer(c,opportunity);
          else if(provider?.buyer)decision=await provider.buyer(c,opportunity,exchange);
          else if(engine==='rules')decision=ruleBuyer(c,opportunity);
          else if(engine==='ml-rules'){
            const request=makeDecisionRequest(c,opportunity,{runId,now:now()});
            decision=await runDecisionEngine(new RuleDecisionEngine({now}),request);
          }else decision=await codexBuyer(c,opportunity);
          return {campaignId:c.campaignId,status:'completed',decision,elapsedMs:performance.now()-started};
        }catch(e){const result={campaignId:c.campaignId,status:'unavailable',reason:e.code??'agent_execution_failed',elapsedMs:performance.now()-started};exchange.event('buyer_unavailable',{opportunityId:opportunity.id,...result});return result;}
      }));
      const outcome=publicOutcome(exchange.runAuction(opportunity.id,attempts.filter(a=>a.decision).map(a=>a.decision)));
      const result={runId,mode,engine,opportunityId:opportunity.id,organic:await organicPromise,eligibility:{eligible:eligible.map(c=>c.campaignId),excluded,financialEligibilityCheckedAtAuction:true},attempts,outcome,replayed:false};
      exchange.put('demo_turns',turnKey,{inputHash,result});
      return result;
    }finally{active--;}
  }
  function acknowledge(awardId,{domInserted,sponsoredLabelPresent,creativeHash}) {
    const award=exchange.require('awards',awardId);
    if(domInserted!==true||sponsoredLabelPresent!==true||creativeHash!==award.creativeHash)throw new ContractError('render_ack_invalid');
    const receipt={schemaVersion:'publisher-receipt.v1',runId,mode,publisherId,publisherKeyId,awardId,opportunityId:award.opportunityId,creativeHash,nonce:`render-${awardId}`,renderAcknowledgementHash:hash({awardId,creativeHash,domInserted:true,sponsoredLabelPresent:true})};
    return exchange.acceptDelivery({receipt,signature:signReceipt(receipt,privateKey)});
  }
  async function recoverOrganic({turnId,randomSessionId}) {
    if(closed)throw new ContractError('session_closed',undefined,409);
    const record=exchange.require('demo_turns',hash([randomSessionId,turnId])),result=record.result;
    if(exchange.get('demo_organic_recoveries',result.opportunityId))return {...publicResult(result),replayed:true};
    if(result.organic.status!=='unavailable'||!providers[result.engine]?.answer)throw new ContractError('organic_recovery_not_required');
    const o=exchange.require('opportunities',result.opportunityId);active++;
    try{
      const organic=await providers[result.engine].answer(o,exchange,o);
      if(organic.status!=='completed')throw new ContractError('organic_recovery_unavailable');
      const recovery={opportunityId:o.id,organic,recoveredAt:now(),noAuctionOrCharge:true};
      exchange.put('demo_organic_recoveries',o.id,recovery);exchange.event('organic_answer_recovered',{opportunityId:o.id,source:organic.source,provenance:organic.provenance});
      return {...publicResult(result),replayed:true};
    }finally{active--;}
  }
  return {exchange,turn,acknowledge,recoverOrganic,results:()=>exchange.all('demo_turns').map(t=>publicResult(t.result)),get active(){return active;},close(){if(active)throw new ContractError('turn_pending',undefined,409);closed=true;exchange.close();}};
}
