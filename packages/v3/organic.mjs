import {hash,ContractError,strictObject} from '../contracts/index.mjs';
import {POLICY} from './config.mjs';
// codex-app-subagent: recorded run. codex-cli-exec: same model/effort via `codex exec`
// (ephemeral, read-only sandbox, user config ignored, web disabled, tool events rejected).
// deepseek-flash-api: DeepSeek chat completions, model deepseek-flash only, no tools.
const UUID=/^[a-f0-9-]{36}$/;
export const ORGANIC_ENGINES=Object.freeze({
 'codex-app-subagent':Object.freeze({model:'gpt-6.1-sol',effort:'low',agentId:UUID,execution:'actual-app-agent',attestation:'operator-recorded isolated app completion, not cryptographic context proof'}),
 'codex-cli-exec':Object.freeze({model:'gpt-6.1-sol',effort:'low',agentId:UUID,execution:'actual-cli-agent',attestation:'isolated ephemeral Codex CLI completion recorded by the terminal operator, not cryptographic context proof'}),
 'deepseek-flash-api':Object.freeze({model:'deepseek-flash',effort:'temperature-0.2',agentId:/^[\w-]{8,80}$/,execution:'actual-api-model',attestation:'DeepSeek API completion (single sponsor-free user message, no tools) recorded by the terminal operator, not cryptographic context proof'}),
});
const DEFAULT_ENGINE='codex-app-subagent';
export function organicPrompt(question){return `You are ONLY the independent organic answer for a wallet-selection demo. Do not use tools, files, web, memory, other sessions or research. You have no ads, sponsors, targeting evidence or campaign information. Give useful general wallet-selection guidance. Do not invent current prices, live product capabilities or a cheapest product. Discuss offline/hardware versus mobile/software tradeoffs when relevant. Return ONLY JSON with one field "answer" (string, at most 1600 characters). User task: ${question}`;}
export function createOrganicBridge({exchange,runId,now=Date.now,engine:runEngine=DEFAULT_ENGINE}){
 const RE=ORGANIC_ENGINES[runEngine];if(!RE)throw new ContractError('organic_engine_invalid');
 const ex=exchange;ex.db.exec('CREATE TABLE IF NOT EXISTS v3_organic(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
 function request({turnId,question}){
  const suppliedPrompt=organicPrompt(question),inputHash=hash(suppliedPrompt),old=ex.get('v3_organic',turnId);
  if(old){if(old.inputHash!==inputHash)throw new ContractError('organic_input_conflict',undefined,409);return old;}
  if(ex.all('v3_organic').length>=POLICY.maxOrganic)throw new ContractError('organic_allowance_exhausted',undefined,409);
  // The default (recorded) engine keeps the original record shape.
  const r={schemaVersion:'axp.v3-organic.v1',runId,turnId,question,inputHash,requestId:`organic-${hash([runId,turnId,inputHash]).slice(0,24)}`,suppliedPrompt,model:runEngine===DEFAULT_ENGINE?POLICY.organicModel:RE.model,effort:RE.effort,...(runEngine===DEFAULT_ENGINE?{}:{engine:runEngine}),status:'waiting',requestedAt:now(),advertiserMaterialReceived:false};
  ex.put('v3_organic',turnId,r);ex.event('v3_organic_requested',{turnId,requestId:r.requestId,inputHash});return r;
 }
 function complete(body){
  const fields=['turnId','requestId','inputHash','agentId','model','effort','answer','completedAt'];strictObject(body,[...fields,'engine','usage'],fields);
  const r=ex.require('v3_organic',body.turnId);
  for(const k of ['requestId','inputHash','model','effort'])if(body[k]!==r[k])throw new ContractError('organic_binding');
  // Optional bridge label; absent = the request's engine (recorded: app subagent).
  const engine=body.engine??r.engine??DEFAULT_ENGINE,E=ORGANIC_ENGINES[engine];
  if(!E||E.model!==r.model||E.effort!==r.effort||(r.engine&&engine!==r.engine))throw new ContractError('organic_completion_invalid');
  if(body.usage!==undefined){strictObject(body.usage,['inputTokens','outputTokens','cachedInputTokens'],['inputTokens','outputTokens']);if(Object.values(body.usage).some(n=>!Number.isSafeInteger(n)||n<0))throw new ContractError('organic_completion_invalid');}
  // Preserve a modest provider length overrun unchanged; never silently clip an actual answer.
  if(!E.agentId.test(body.agentId)||!Number.isFinite(Date.parse(body.completedAt))||typeof body.answer!=='string'||!body.answer.trim()||body.answer.length>2000)throw new ContractError('organic_completion_invalid');
  const completionHash=hash(body);if(r.status==='completed'){if(r.completionHash!==completionHash)throw new ContractError('organic_completion_conflict',undefined,409);return r;}
  const next={...r,status:'completed',answer:body.answer,completedAt:body.completedAt,agentId:body.agentId,completionHash,provenance:{engine,model:body.model,effort:body.effort,agentId:body.agentId,inputHash:r.inputHash,toolUse:'not_requested',requestedMaxCharacters:1600,actualCharacters:body.answer.length,lengthOverrun:body.answer.length>1600,attestation:E.attestation,execution:E.execution,...(body.usage?{usage:body.usage}:{})}};
  ex.put('v3_organic',body.turnId,next);ex.event('v3_organic_completed',{turnId:r.turnId,requestId:r.requestId,agentId:body.agentId,inputHash:r.inputHash});return next;
 }
 return {request,complete,engine:runEngine,get:id=>ex.get('v3_organic',id),list:()=>ex.all('v3_organic'),status:()=>({limit:POLICY.maxOrganic,admitted:ex.all('v3_organic').length,remaining:POLICY.maxOrganic-ex.all('v3_organic').length})};
}
