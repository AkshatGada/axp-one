import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {ContractError,hash,strictObject} from '../contracts/index.mjs';

export const APP_ORGANIC_PROMPT='You are ONLY the independent organic answer for an owned-app software-selection demo. Do not use tools, files, web, memory, other sessions or research. You have no ads, sponsors or campaign information. Answer the supplied question with useful general evaluation criteria, not invented product capabilities/prices or live research. Return ONLY JSON with one field "answer" (string, at most 1200 characters). User task: Find a tool for corporate travel booking and automatic expense capture.';

// Operator-attested bridge from actual fresh app subagent completions. This is
// intentionally not represented as an unattended CLI or cryptographic attestation.
export function createAppOrganicBridge({directory='local-state/phase3/app-answers'}={}) {
  return async(_task,{turnId}={})=>{
    if(!['placement-one','placement-two'].includes(turnId))throw new ContractError('app_answer_turn_invalid');
    let record;try{record=JSON.parse(readFileSync(join(directory,`${turnId}.json`),'utf8'));}catch{throw new ContractError('app_answer_unavailable');}
    strictObject(record,['schemaVersion','turnId','agentId','model','effort','suppliedPromptHash','completedAt','answer'],['schemaVersion','turnId','agentId','model','effort','suppliedPromptHash','completedAt','answer']);
    if(record.schemaVersion!=='app-organic-completion.v1'||record.turnId!==turnId||record.model!=='gpt-6.1-sol'||record.effort!=='low'||record.suppliedPromptHash!==hash(APP_ORGANIC_PROMPT)||!/^[-a-f0-9]{36}$/.test(record.agentId)||!Number.isFinite(Date.parse(record.completedAt))||typeof record.answer!=='string'||!record.answer.trim()||record.answer.length>1200)throw new ContractError('app_answer_invalid');
    return {value:{answer:record.answer},provenance:{engine:'codex-app-subagent',model:record.model,effort:record.effort,
      runtime:'isolated-app-agent-operator-bridge',agentId:record.agentId,inputHash:record.suppliedPromptHash,
      completedAt:record.completedAt,status:'completed',toolUse:'not_requested',invocationScoped:true,
      attestation:'operator-recorded completion, not cryptographic context proof',delivery:'saved completion bridge'}};
  };
}
