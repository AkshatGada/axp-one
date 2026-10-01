import {ContractError,strictObject} from '../../packages/contracts/index.mjs';
import {safeText} from '../../packages/ml/core.mjs';

// Reads are intentionally independent of auctions, charges and payment state.
// The source adapter receives no campaign credentials, budget or raw chat history.
export function createEvidenceService({corpus=null}={}) {
  const enabled=corpus!==null;
  async function lookup(input) {
    strictObject(input,['prompt'],['prompt']);
    try{safeText(input.prompt,2000);}catch{throw new ContractError('background_prompt_required');}
    if(!enabled)return {schemaVersion:'cached-corpus-result.v1',status:'source_unconfigured',matches:[],limitations:['Enable the read-only local ads corpus adapter; no fixture evidence substituted.']};
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
    try{
      const result=await corpus.lookup(input.prompt,{limit:5,signal:controller.signal});
      if(result?.schemaVersion!=='cached-corpus-result.v1'||!['ready','query_vector_unavailable'].includes(result.status)||result.provenance?.database!=='ads'||result.provenance?.readOnly!==true||!Array.isArray(result.matches)||result.matches.length>5)throw new ContractError('corpus_response_invalid');
      // Allow only vector-free public evidence, never a database-row passthrough.
      const matches=result.matches.map(m=>{
        safeText(m.promptText,2400);
        if(!Number.isFinite(m.similarity)||m.similarity < -1||m.similarity>1||!Array.isArray(m.mappings)||m.mappings.length>3)throw new ContractError('corpus_response_invalid');
        return {promptId:m.promptId,promptText:m.promptText,similarity:m.similarity,mappings:m.mappings.map(a=>{
          safeText(a.advertiser,160);safeText(a.creativeText,2400);
          let hint=null;
          if(a.hint){safeText(a.hint.text,2400);hint={id:a.hint.id,text:a.hint.text,tier:a.hint.tier,modelVersion:a.hint.modelVersion,reconstructionAuc:a.hint.reconstructionAuc??null,semantics:'inferred_targeting_not_advertiser_configuration'};}
          return {mappingId:a.mappingId,creativeId:a.creativeId,advertiser:a.advertiser,creativeText:a.creativeText,hint,semantics:'historical_observation_not_enrolled_axp_advertiser'};
        })};
      });
      const p=result.provenance;
      if(p.model!=='BAAI/bge-base-en-v1.5'||p.dimension!==768||p.revision!=='unrecorded'||(result.status==='query_vector_unavailable'&&matches.length))throw new ContractError('corpus_response_invalid');
      const sourceVectors=(p.sourceVectors??[]).map(v=>{
        if(!['prompt','ad','hint'].includes(v.kind)||!Number.isSafeInteger(v.entityId)||!Number.isSafeInteger(v.vectorId)||v.entityId<=0||v.vectorId<=0)throw new ContractError('corpus_response_invalid');
        return {kind:v.kind,entityId:v.entityId,vectorId:v.vectorId};
      });
      return {schemaVersion:result.schemaVersion,status:result.status,provenance:{database:'ads',readOnly:true,model:p.model,dimension:p.dimension,revision:p.revision,queryVectorId:p.queryVectorId??null,queryTextHash:p.queryTextHash,sourceVectors,embeddingCalls:0},matches,limitations:['Historical associations are not task-fit labels or conversion evidence.','Database vector artifact revision is unrecorded.','An uncached task is unavailable in this reuse-only mode; no new embeddings generated.']};
    }catch(e){if(e instanceof ContractError)throw e;throw new ContractError(controller.signal.aborted?'corpus_timeout':'corpus_unavailable',undefined,503);}
    finally{clearTimeout(timer);}
  }
  return {enabled,lookup};
}
