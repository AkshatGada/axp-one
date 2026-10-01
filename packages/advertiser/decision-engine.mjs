import {hash,ContractError,computeBid,validateCampaign} from '../contracts/index.mjs';
import {validateEvidence} from './evidence.mjs';

export const POLICY=Object.freeze({version:'context-evidence-prior-v1',historyWeight:0.5,strongCoverage:0.5,moderateCoverage:0.2,minAffinity:0.15,minSharedFeatures:2,retrievalLimit:10,profileLimit:3});
const STOP=new Set('a an the and or for from of to in on at by with without is are be have has can could would should i we you my our your me us find best top compare comparing comparison tool tools platform platforms solution solutions software use using want need needs require requires must only please recommend'.split(' '));
const NORMAL={automated:'automat',automatic:'automat',automation:'automat',automating:'automat',automate:'automat',companies:'company',employees:'employee',expenses:'expense',receipts:'receipt',bookings:'booking',hotels:'hotel',teams:'team',agents:'agent',insights:'insight',shortlists:'shortlist'};
const words=text=>new Set((String(text).normalize('NFKC').toLowerCase().match(/[\p{L}\p{N}]+/gu)??[]).filter(t=>t.length>2&&!STOP.has(t)).map(t=>NORMAL[t]??t));
const joined=d=>[d?.productDescription??'',d?.approvedText??'',...(d?.contextHints??[])].join(' ');
const field=c=>({productDescription:'',approvedText:c.creatives[0].approvedText,contextHints:[]});
function topics(text){
  const t=text.toLowerCase(),s=new Set();
  if(/\b(book(?:ing|ings)?|reservations?)\b/.test(t))s.add('travel_booking');
  if(/\b(expenses?|receipts?)\b/.test(t))s.add('expense_management');
  if(/\b(policy|policies|approvals?)\b/.test(t))s.add('policy_enforcement');
  if(/\b(authentication|authenticate|oauth|identity)\b/.test(t)){s.add('authentication');s.add('agent_identity');}
  if(/\b(erp|property management|hotel management)\b/.test(t))s.add('hotel_erp');
  if(/\b(shortlists?|vendor selection)\b/.test(t))s.add('expert_shortlist');
  return s;
}
function index(catalogue){
  const unique=new Map(catalogue.records.map(r=>[r.promptId,words(r.promptText)])),df=new Map();
  for(const terms of unique.values())for(const term of terms)df.set(term,(df.get(term)??0)+1);
  const weight=t=>1+Math.log((unique.size+1)/((df.get(t)??0)+1));
  const coverage=(task,document)=>{const total=[...task].reduce((a,t)=>a+weight(t),0);return total?[...task].filter(t=>document.has(t)).reduce((a,t)=>a+weight(t),0)/total:0;};
  const affinity=(a,b)=>{const shared=[...a].filter(t=>b.has(t));const sum=s=>[...s].reduce((n,t)=>n+weight(t)**2,0);const den=Math.sqrt(sum(a)*sum(b));return {shared,score:den?shared.reduce((n,t)=>n+weight(t)**2,0)/den:0};};
  return {coverage,affinity,promptCount:unique.size};
}
const rounded=n=>Math.round(n*1000000)/1000000;

/** A small replaceable scorer, not an LLM or an inferred ChatGPT algorithm.
 * Runtime and nonfinancial comparison call this identical interface.
 */
export class EvidenceDecisionEngine {
  constructor({catalogue,useHistory=true}={}){validateEvidence(catalogue);this.catalogue=catalogue;this.useHistory=useHistory;this.index=index(catalogue);}
  scoreOpportunity({campaign:c,opportunity:o,draft=field(c),prompt}){
    validateCampaign(c);
    if(typeof prompt!=='string'||!prompt.trim()||prompt.length>2000||!Array.isArray(o.softPreferences)||!Array.isArray(o.taskConstraints))throw new ContractError('invalid_decision_input');
    const task=words(prompt),own=words(joined(draft)),matched=o.softPreferences.filter(x=>c.declaredConstraints.includes(x));
    const missing=o.taskConstraints.filter(x=>!c.declaredConstraints.includes(x));
    const ceiling=matched.length===0?0:matched.length===o.softPreferences.length?3:2;
    const intent=o.coarseIntent==='travel_tools'?2:0;
    const direct=this.index.coverage(task,own);
    const candidates=this.catalogue.records.map(r=>{
      const context=r.hint?.text??r.creativeText??'',document=words(`${r.promptText} ${context}`),ownMatch=this.index.affinity(own,words(context));
      const anchor=topics(context),topicMatch=matched.filter(x=>anchor.has(x));
      const taskShared=[...task].filter(t=>document.has(t));
      return {r,coverage:this.index.coverage(task,document),affinity:ownMatch.score,ownShared:ownMatch.shared,taskShared,topicMatch};
    }).filter(x=>x.taskShared.length>=POLICY.minSharedFeatures)
      .sort((a,b)=>b.coverage-a.coverage||a.r.mappingId-b.r.mappingId).slice(0,POLICY.retrievalLimit);
    const seen=new Set(),aligned=[];
    for(const x of candidates){
      if(!x.topicMatch.length||x.affinity<POLICY.minAffinity||x.ownShared.length<POLICY.minSharedFeatures)continue;
      const key=`${x.r.promptId}:${x.r.hint?.id??x.r.creativeId}`;if(seen.has(key))continue;seen.add(key);aligned.push(x);
    }
    aligned.sort((a,b)=>b.coverage-a.coverage||b.affinity-a.affinity||a.r.mappingId-b.r.mappingId);
    const profile=aligned.slice(0,POLICY.profileLimit),best=profile[0]?.coverage??null;
    const effective=this.useHistory&&best!==null?Math.max(direct,(1-POLICY.historyWeight)*direct+POLICY.historyWeight*best):direct;
    const band=effective>=POLICY.strongCoverage?3:effective>=POLICY.moderateCoverage?2:1;
    const level=missing.length?0:Math.min(ceiling,band),decision=level>=2&&intent>=2?'bid':'skip';
    const reason=missing.length?'missing_declared_requirement':ceiling===0?'offer_does_not_match_task':intent===0?'noncommercial_or_unsupported_task':level<2?'insufficient_relevance_support':'declared_fit_and_relevance_support';
    const active=this.useHistory?profile:[];
    const engine=this.useHistory?'context-evidence-decision-v1':'approved-text-decision-v1';
    return {schemaVersion:'agent-decision.v1',opportunityId:o.id,advertiserId:c.advertiserId,campaignVersionId:c.campaignVersionId,agentRunId:`sim-${hash([engine,o.id,c.campaignVersionId,this.catalogue.contentHash,hash(joined(draft))]).slice(0,24)}`,decision,creativeVersionId:c.creatives[0].creativeVersionId,relevanceLevel:level,commercialIntentLevel:intent,relevance:level/3,commercialIntent:intent/3,conversionProbability:null,evidenceFieldIds:['declaredConstraints'],reasonCodes:[reason,this.useHistory?(active.length?'historical_relevance_prior':'explicit_text_only_fallback'):'text_only_comparator'],scoreSemantics:'fit-intent-v1',engineProvenance:{engine,engineVersion:POLICY.version,mode:'deterministic_simulation',model:null,status:'completed',catalogueHash:this.catalogue.contentHash,policy:{...POLICY},features:'distinct-prompt-IDF-weighted-lexical-coverage',fitCeiling:ceiling,matchedCapabilities:matched,missingRequiredCapabilities:missing,textCoverage:rounded(direct),historyCoverage:this.useHistory&&best!==null?rounded(best):null,effectiveCoverage:rounded(effective),fallbackReason:this.useHistory&&!active.length?'no_aligned_historical_support':null,supportingHistoricalEvidenceIds:active.map(x=>x.r.id),contextHints:draft.contextHints??[],evidenceRole:'uncalibrated_relevance_prior_not_product_facts_or_conversion',retrieval:{method:'offline_lexical_prompt_and_hint',availableRecords:this.catalogue.records.length,distinctCorpusPrompts:this.index.promptCount,retrievedRecordIds:this.useHistory?candidates.map(x=>x.r.id):[],selected:active.map(x=>({id:x.r.id,mappingId:x.r.mappingId,source:x.r.source,promptId:x.r.promptId,promptText:x.r.promptText,creativeId:x.r.creativeId,creativeText:x.r.creativeText,advertiser:x.r.advertiser,hint:x.r.hint,sourceHash:x.r.source.sourceHash,coverage:rounded(x.coverage),affinity:rounded(x.affinity),sharedTaskFeatures:x.taskShared,sharedCampaignFeatures:x.ownShared,topicAnchors:x.topicMatch,attachedByOperator:(draft.evidenceIds??[]).includes(x.r.id)}))}}};
  }
}

/** Read-only counterfactual. Does not run the auction or create any obligation. */
export function compareDecisions({campaign,opportunity,draft,prompt,catalogue,availableCampaign=campaign.budgetCapBaseUnits,availableChannel=draft.depositBaseUnits}){
  const score=useHistory=>{const decision=new EvidenceDecisionEngine({catalogue,useHistory}).scoreOpportunity({campaign,opportunity,draft,prompt});return {decision,bid:computeBid(decision,campaign,availableCampaign,availableChannel,opportunity.floorBaseUnits)};};
  const baseline=score(false),history=score(true);
  const signature=x=>hash([x.decision.decision,x.decision.relevanceLevel,x.bid]);
  return {schemaVersion:'advertiser-evidence-comparison.v1',mode:'synthetic',presentation:'offline_decision_comparison',previewOnly:true,catalogueHash:catalogue.contentHash,baseline,history,changed:signature(baseline)!==signature(history),limitations:['Both arms are deterministic uncalibrated relevance heuristics, not live agents.','Historical appearance and inferred hints do not prove task fit or product capabilities.','A changed decision is not demonstrated targeting lift.','Text-only also shares the fixed corpus-derived IDF vocabulary; this isolates added historical packets, not all possible data influence.','No auction, reservation, delivery, charge, model call or payment is made.']};
}
