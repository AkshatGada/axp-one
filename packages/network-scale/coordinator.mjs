import {join,resolve} from 'node:path';
import {existsSync,readFileSync,statfsSync,writeFileSync,mkdirSync} from 'node:fs';
import {createProductService} from '../product/service.mjs';
import {createProductOrganic} from '../product/organic.mjs';
import {createJevHttpTransport} from '../ml/engines/jev-http.mjs';
import {createNativeTransport} from '../payments/sdk-transport.mjs';
import {walletIdentities,createProductDevnetRPC,inspectProductDevnet} from '../product/native.mjs';
import {loadEvidence} from '../v2/evidence.mjs';
import {hash,ContractError} from '../contracts/index.mjs';
import {BENCHMARK_PROFILE as P,questionFor,campaignFor} from './profile.mjs';
import {RunJournal} from './budget.mjs';
import {exportRun} from './export.mjs';
const fail=code=>{throw new ContractError(code,code,409);};
const code=e=>/^[a-z_0-9]+$/.test(e?.code??'')?e.code:'benchmark_operation_failed';
export async function benchmarkPreflight({stateDir,walletPath,rpcURL,now=Date.now}){
  mkdirSync(stateDir,{recursive:true,mode:0o700});const disk=statfsSync(stateDir);if(disk.bavail*disk.bsize<50*1024**3)fail('50gib_disk_floor');
  const identities=walletIdentities(walletPath),rpc=createProductDevnetRPC(rpcURL),native=await inspectProductDevnet({...identities,depositBaseUnits:P.depositBaseUnits,simulate:true,rpc});
  if(BigInt(native.balances.payerBaseUnits)<BigInt(P.aggregateDepositBaseUnits)||BigInt(native.balances.payerLamports)<BigInt(P.aggregateFeeRentLamports))fail('benchmark_aggregate_funding_insufficient');
  const retriever=loadEvidence();if(!retriever)fail('benchmark_context_evidence_unavailable');
  return {...native,identities,observedAt:new Date(now()).toISOString(),diskFloorPassed:true,providersCalled:0,signaturesCreated:0};
}
export function createBenchmarkCoordinator({stateDir,runId='network-scale-2026-10-07-v1',sourceCommit,apiKey,organicApiKey,walletPath,rpcURL,
  signingEnabled=false,now=Date.now,execution='actual-api-model/native-devnet',serviceFactory=createProductService,jevFactory,organicFactory,retriever=loadEvidence(),paymentOptions={}}={}){
  if((jevFactory||organicFactory||serviceFactory!==createProductService||Object.keys(paymentOptions).length)&&execution!=='offline-fixture')fail('benchmark_fixture_mode_required');
  const directory=resolve(stateDir),journal=new RunJournal({path:join(directory,'coordinator.sqlite'),runId,sourceCommit,now,execution});
  const workers=[],rpc=createProductDevnetRPC(rpcURL);let nativeTail=Promise.resolve(),activeTurns=0,peakTurns=journal.get('meta','publisherPeak')?.value??0,disposed=false;
  const serial=fn=>{const next=nativeTail.catch(()=>{}).then(fn);nativeTail=next;return next;};
  const nativeStates=()=>workers.flatMap(w=>w.service.paymentWorker?.store.list().map(s=>({workerId:w.id,state:s}))??[]);
  function checkpoint(workerId,reason){
    if(!/^native_before_(signOpen|signClose|prepareVoucher)$/.test(reason)){journal.event('checkpoint',{workerId,typeDetail:reason});return;}
    const states=nativeStates();let fees=0n,accepted=0n,reserved=0n;
    for(const w of workers){for(const c of w.service.exchange.all('channels')){const t=w.service.exchange.totals({channelId:c.channelId});accepted+=t.accepted;reserved+=t.reserved;}}
    for(const {state:s,workerId:id} of states){let channelFees=0n;for(const kind of ['open','close']){const fee=BigInt(s[kind]?.signed?.estimatedFeeAndRentLamports??s[kind]?.plan?.estimatedFeeAndRentLamports??'0');channelFees+=fee>5000000n?fee:5000000n;}fees+=channelFees;journal.reserveNativeFee(`${id}:${s.channelId}`,channelFees.toString());}
    if(accepted+reserved>BigInt(P.aggregateChargeBaseUnits)||fees>BigInt(P.aggregateFeeRentLamports))fail('native_global_liability_cap');
    if(/^native_before_(signOpen|signClose|prepareVoucher)$/.test(reason)){
      for(const x of states){if(x.workerId===workerId)continue;const s=x.state;if(!['prepared','finalized','failed'].includes(s.open.status)||(s.close&&!['prepared','finalized','failed'].includes(s.close.status))||s.intents.some(i=>i.status!=='authorized'))fail('global_native_reconciliation_required');}
    }
    journal.event('checkpoint',{workerId,typeDetail:reason});
  }
  for(let i=0;i<P.workers;i++){
    const id=`worker-${String(i+1).padStart(2,'0')}`,workerDir=join(directory,id);
    // Fresh official one-attempt transport per call, branded only from its factory.
    const official=jevFactory?null:createJevHttpTransport({apiKey,maxCalls:1});
    const jevSource=jevFactory?jevFactory(i):inheritActual((packet,options)=>createJevHttpTransport({apiKey,maxCalls:1})(packet,options),official);
    const jev=journal.wrap('jev',jevSource);
    const organic=journal.wrap('deepseek',organicFactory?organicFactory(i):createProductOrganic({apiKey:organicApiKey,now}));
    const service=serviceFactory({stateDir:workerDir,runId:`${runId}-${id}`,publisherKey:undefined,apiKey,organicApiKey,transport:jev,organicTransport:organic,
      retriever,dailyModelCap:P.jevDailyCap,benchmarkProfile:P,financialMode:'devnet',signingEnabled,walletPath,now,
      checkpoint:reason=>checkpoint(id,reason),paymentOptions:{preflight:options=>inspectProductDevnet({...options,rpc}),transportFactory:options=>createNativeTransport({...options,rpcURL}),...paymentOptions}});
    workers.push({id,index:i,stateDir:workerDir,service});
  }
  function workerFor(id){const w=workers.find(w=>w.id===id);if(!w)fail('benchmark_worker_unknown');return w;}
  function turnFor(id){const t=journal.get('turn',id);if(!t)fail('benchmark_turn_unknown');return t;}
  function openedCount(){return workers.reduce((sum,w)=>sum+w.service.state().campaigns.filter(c=>c.payment?.openStatus==='finalized').length,0);}
  async function open(target){
    if(![16,64,128].includes(target))fail('benchmark_stage_invalid');journal.canAdmit();
    const previous=target===64?16:target===128?64:null;if(previous&&!journal.get('stage',String(previous))?.passed)fail('benchmark_previous_stage_not_verified');
    journal.update({status:'opening',startedAt:journal.get('meta','run').startedAt??journal.stamp()});
    for(const w of workers.slice(0,target/8)){
      if(!w.service.state().account)w.service.saveAccount({name:`Fictional benchmark ${w.id}`,websiteURL:'https://benchmark.example/'});
      for(let i=0;i<8;i++){
        journal.canAdmit();
        const input=campaignFor(w.index,i);let c=w.service.state().campaigns.find(c=>c.brandName===input.brandName);
        if(!c){c=w.service.saveCampaign(input).campaign;w.service.approve(c.id);}
        const admissionId=`${w.id}:${c.channelId??`${c.id}-channel`}`;journal.reserveNative(admissionId);
        if(c.payment?.openStatus==='finalized')continue;
        // An existing frozen/prepared operation requires reconciliation, never a new signature.
        if(c.status!=='draft'||w.service.paymentWorker.store.get(`${c.id}-channel`)){journal.event('native_open_requires_lookup',{workerId:w.id,campaignId:c.id});fail('benchmark_open_requires_reconciliation');}
        const result=await serial(()=>w.service.launch(c.id));journal.event('native_open',{workerId:w.id,campaignId:c.id,channelId:result.campaign.payment?.channelId??`${c.id}-channel`,status:result.campaign.payment?.openStatus??'blocked',reason:result.paymentOperation?.reason??result.paymentOperation?.reasonCode??null});
        if(result.campaign.payment?.openStatus!=='finalized'){journal.update({status:'partial',haltReason:'native_open_not_finalized'});fail('native_open_not_finalized');}
      }
    }
    journal.update({status:'ready',fundedAdvertisers:openedCount(),stageAdvertisers:target});return {status:'ready',fundedAdvertisers:openedCount()};
  }
  function allocate(){
    journal.canAdmit();
    if(disposed||journal.get('meta','run').haltReason||!['ready','running'].includes(journal.get('meta','run').status))fail('benchmark_not_running');
    const available=workers.filter(w=>w.service.state().campaigns.filter(c=>c.status==='active').length===8);
    const counts=new Map(available.map(w=>[w.id,journal.all('turn').filter(t=>t.workerId===w.id).length]));
    const w=available.filter(w=>counts.get(w.id)<64).sort((a,b)=>counts.get(a.id)-counts.get(b.id)||a.index-b.index)[0];if(!w)return null;
    const index=counts.get(w.id),turnId=`turn-${String(index+1).padStart(3,'0')}`,id=`${w.id}-${turnId}`;
    const row={id,workerId:w.id,index,turnId,question:questionFor(w.index,index),sessionId:`${runId}-${w.id}-${turnId}`,status:'allocated',allocatedAt:journal.stamp()};
    journal.tx(()=>{journal.put('turn',id,row);journal.event('turn_allocated',{workerId:w.id,turnId:id});});return {id,workerId:w.id,turnId,question:row.question};
  }
  async function turn(id){
    const t=turnFor(id);if(t.status!=='allocated'){if(t.result)return {...t.result,replayed:true};fail('benchmark_turn_uncertain');}
    if(journal.get('meta','run').haltReason)fail('benchmark_halted');const w=workerFor(t.workerId),start=now();
    journal.tx(()=>{journal.put('turn',id,{...t,status:'pending',startedAt:journal.stamp()});journal.update({status:'running'});journal.event('turn_started',{workerId:w.id,turnId:id});});
    activeTurns++;peakTurns=Math.max(peakTurns,activeTurns);journal.put('meta','publisherPeak',{value:peakTurns});
    try{
      const body={question:t.question,sessionId:t.sessionId,turnId:t.turnId};
      const [answer,opportunity]=await Promise.allSettled([w.service.answer(body),w.service.opportunity(body)]);
      const result={id,workerId:w.id,question:t.question,answer:answer.status==='fulfilled'?answer.value:null,answerError:answer.status==='rejected'?code(answer.reason):null,
        opportunity:opportunity.status==='fulfilled'?opportunity.value:null,opportunityError:opportunity.status==='rejected'?code(opportunity.reason):null};
      const elapsedMs=now()-start,status=result.answerError||result.opportunityError?'error':result.opportunity.status==='no_fill'?'no_fill':'awaiting_render';
      journal.tx(()=>{journal.put('turn',id,{...t,status,startedAt:new Date(start).toISOString(),completedAt:journal.stamp(),elapsedMs,result});journal.event('turn_completed',{workerId:w.id,turnId:id,status,elapsedMs});});
      const budget=journal.providerTotals('jev'),organicBudget=journal.providerTotals('deepseek');if(budget.terminalUnknownAttempts||organicBudget.terminalUnknownAttempts)journal.update({haltReason:'provider_usage_or_outcome_unknown',status:'partial'});
      return result;
    }finally{activeTurns--;}
  }
  async function render(id,observation){
    const t=turnFor(id),result=t.result,w=workerFor(t.workerId),award=result?.opportunity?.award;
    if(!award)fail('benchmark_no_award');const admissionId=`${w.id}:${award.id}`;
    // Persist liability before the reused service can accept any receipt/charge.
    journal.reserveCharge(admissionId,award.priceBaseUnits);
    const accepted=await serial(()=>w.service.render(award.id,observation,result.opportunity.deliveryToken));
    journal.tx(()=>{journal.put('charge',admissionId,{...journal.get('charge',admissionId),status:accepted.status,chargeId:accepted.charge.id});journal.put('turn',id,{...t,status:'accepted',renderedAt:t.renderedAt??journal.stamp(),render:t.render??{chargeId:accepted.charge.id,receiptHash:accepted.receiptHash,replayed:false,observation:{...observation},observedAt:journal.stamp()}});journal.event('render_accepted',{workerId:w.id,turnId:id,campaignId:award.campaignId,channelId:award.channelId,chargeId:accepted.charge.id,amountBaseUnits:accepted.charge.amountBaseUnits,replayed:accepted.replayed});journal.event('voucher_authorization',{workerId:w.id,turnId:id,campaignId:award.campaignId,channelId:award.channelId,chargeId:accepted.charge.id,status:accepted.authorization?.status??null,replayed:accepted.replayed});});return {status:accepted.status,chargeId:accepted.charge.id,replayed:accepted.replayed};
  }
  function verifyStage(target){
    const turns=journal.all('turn'),errors=turns.filter(t=>['error','pending'].includes(t.status)),uncertain=nativeStates().some(({state:s})=>s.open.status!=='finalized'||s.intents.some(i=>i.status!=='authorized'));
    const passed=openedCount()>=target&&turns.filter(t=>['accepted','no_fill'].includes(t.status)).length>=Math.max(16,target)&&errors.length===0&&!uncertain&&!journal.get('meta','run').haltReason;
    journal.put('stage',String(target),{target,passed,at:journal.stamp(),turns:turns.length});if(!passed)fail('benchmark_stage_not_verified');return {passed,target};
  }
  async function drain(){
    journal.update({status:'draining'});
    // Persisted terms/underlying campaigns enumerate even interrupted outer launches.
    for(const w of workers){for(const a of w.service.exchange.all('awards'))if(a.status==='reserved')w.service.exchange.failAward(a.id);
      for(const c of w.service.exchange.all('campaigns')){w.service.exchange.pauseCampaign(c.campaignId);w.service.exchange.drainNetworkChannel(c.channelId);if(w.service.paymentWorker.store.get(c.channelId))await serial(()=>w.service.paymentWorker.drain(c.channelId));}}
    journal.event('drain_completed');return {status:'draining'};
  }
  async function settle(){
    await drain();let blocked=0;
    for(const w of workers)for(const c of w.service.exchange.all('campaigns'))if(w.service.paymentWorker.store.get(c.channelId))await serial(()=>w.service.campaignAction(c.campaignId,'reconcile'));
    for(const w of workers)for(const c of w.service.exchange.all('campaigns')){
      const s=w.service.paymentWorker.store.get(c.channelId);if(!s){blocked++;journal.event('native_unprepared',{workerId:w.id,channelId:c.channelId});continue;}
      const state=w.service.paymentWorker.store.get(c.channelId);if(state.open.status!=='finalized'){blocked++;continue;}
      const r=await serial(()=>w.service.campaignAction(c.campaignId,'settle'));if(r.campaign.payment?.closeStatus!=='finalized')blocked++;
      journal.event('native_close',{workerId:w.id,campaignId:c.campaignId,channelId:c.channelId,status:r.campaign.payment?.closeStatus??'blocked'});
    }
    const completed=blocked===0&&openedCount()===128&&journal.all('turn').length===1024&&journal.all('turn').every(t=>['accepted','no_fill'].includes(t.status))&&!journal.get('meta','run').haltReason;
    journal.update({status:completed?'completed':'partial',completedAt:journal.stamp(),settlementBlocked:blocked});return {status:completed?'completed':'partial',blocked};
  }
  async function replay(){const before={jev:journal.providerTotals('jev').attempts,deepseek:journal.providerTotals('deepseek').attempts,charges:journal.all('charge').length};let turns=0,renders=0;
    for(const t of journal.all('turn').filter(t=>t.result)){const result=await turn(t.id);if(!result.replayed)fail('benchmark_replay_not_deduplicated');turns++;if(t.render){await render(t.id,{creativeHash:t.result.opportunity.award.creativeHash,domInserted:true,sponsoredLabelPresent:true});renders++;}}
    const after={jev:journal.providerTotals('jev').attempts,deepseek:journal.providerTotals('deepseek').attempts,charges:journal.all('charge').length};if(hash(before)!==hash(after))fail('benchmark_replay_side_effect');journal.put('meta','replayProof',{at:journal.stamp(),turns,renders,before,after,status:'passed'});return {status:'passed',turns,renders};}
  return {journal,workers,open,allocate,turn,render,verifyStage,drain,settle,replay,checkpoint,export:()=>exportRun({journal,workers}),close:()=>{disposed=true;workers.forEach(w=>w.service.close());journal.close();}};
}
import {inheritProviderExecution as inheritActual} from '../product/provider-provenance.mjs';
