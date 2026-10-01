import {hash,ContractError,strictObject} from '../contracts/index.mjs';
import {POLICY} from './config.mjs';
export function organicPrompt(question){return `You are ONLY the independent organic answer for a wallet-selection demo. Do not use tools, files, web, memory, other sessions or research. You have no ads, sponsors, targeting evidence or campaign information. Give useful general wallet-selection guidance. Do not invent current prices, live product capabilities or a cheapest product. Discuss offline/hardware versus mobile/software tradeoffs when relevant. Return ONLY JSON with one field "answer" (string, at most 1600 characters). User task: ${question}`;}
export function createOrganicBridge({exchange,runId,now=Date.now}){
 const ex=exchange;ex.db.exec('CREATE TABLE IF NOT EXISTS v3_organic(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
 function request({turnId,question}){
  const suppliedPrompt=organicPrompt(question),inputHash=hash(suppliedPrompt),old=ex.get('v3_organic',turnId);
  if(old){if(old.inputHash!==inputHash)throw new ContractError('organic_input_conflict',undefined,409);return old;}
  if(ex.all('v3_organic').length>=POLICY.maxOrganic)throw new ContractError('organic_allowance_exhausted',undefined,409);
  const r={schemaVersion:'axp.v3-organic.v1',runId,turnId,question,inputHash,requestId:`organic-${hash([runId,turnId,inputHash]).slice(0,24)}`,suppliedPrompt,model:POLICY.organicModel,effort:'low',status:'waiting',requestedAt:now(),advertiserMaterialReceived:false};
  ex.put('v3_organic',turnId,r);ex.event('v3_organic_requested',{turnId,requestId:r.requestId,inputHash});return r;
 }
 function complete(body){
  const fields=['turnId','requestId','inputHash','agentId','model','effort','answer','completedAt'];strictObject(body,fields,fields);
  const r=ex.require('v3_organic',body.turnId);
  for(const k of ['requestId','inputHash','model','effort'])if(body[k]!==r[k])throw new ContractError('organic_binding');
  // Preserve a modest provider length overrun unchanged; never silently clip an actual answer.
  if(!/^[a-f0-9-]{36}$/.test(body.agentId)||body.model!=='gpt-6.1-sol'||body.effort!=='low'||!Number.isFinite(Date.parse(body.completedAt))||typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>2000)throw new ContractError('organic_completion_invalid');
  const completionHash=hash(body);if(r.status==='completed'){if(r.completionHash!==completionHash)throw new ContractError('organic_completion_conflict',undefined,409);return r;}
  const next={...r,status:'completed',answer:body.answer,completedAt:body.completedAt,agentId:body.agentId,completionHash,provenance:{engine:'codex-app-subagent',model:body.model,effort:body.effort,agentId:body.agentId,inputHash:r.inputHash,toolUse:'not_requested',requestedMaxCharacters:1600,actualCharacters:body.answer.length,lengthOverrun:body.answer.length>1600,attestation:'operator-recorded isolated app completion, not cryptographic context proof',execution:'actual-app-agent'}};
  ex.put('v3_organic',body.turnId,next);ex.event('v3_organic_completed',{turnId:r.turnId,requestId:r.requestId,agentId:body.agentId,inputHash:r.inputHash});return next;
 }
 return {request,complete,get:id=>ex.get('v3_organic',id),list:()=>ex.all('v3_organic'),status:()=>({limit:POLICY.maxOrganic,admitted:ex.all('v3_organic').length,remaining:POLICY.maxOrganic-ex.all('v3_organic').length})};
}
