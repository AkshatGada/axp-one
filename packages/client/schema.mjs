// Canonical frontend contract source. Generated OpenAPI/DTOs must not be edited.
export const ref = name => ({$ref: `#/components/schemas/${name}`});
const str = {type:'string'};
const bool = {type:'boolean'};
const num = {type:'number'};
const integer = {type:'integer'};
const nullable = schema => ({anyOf:[schema,{type:'null'}]});
const array = schema => ({type:'array',items:schema});
const enumeration = values => ({type:'string',enum:values});
const object = (properties={},required=Object.keys(properties),additionalProperties=false) => ({type:'object',properties,required,additionalProperties});
const strings = array(str);
const json = ref('JsonValue');
const record = {type:'object',additionalProperties:json};
const level = nullable({type:'integer',enum:[0,1,2,3]});

export const schemas = {
  JsonValue:{description:'Extensible JSON; no exact shape claimed.',anyOf:[{type:'null'},bool,num,str,array(ref('JsonValue')),{type:'object',additionalProperties:ref('JsonValue')}]},
  JsonObject:record,
  FinancialMode:enumeration(['synthetic','sandbox','devnet']),
  PresentationKind:enumeration(['recorded_evidence_replay']),
  SourceKind:enumeration(['recorded_run','synthetic_test']),
  AmountBaseUnits:{type:'string',pattern:'^(0|[1-9][0-9]*)$',description:'Unsigned decimal integer string, u64 maximum 18446744073709551615. Never float arithmetic.'},
  Error:object({error:str}),
  Creative:object({creativeVersionId:str,approvedText:str,destinationURL:str,fictional:bool,softFitTags:strings,evidenceFieldIds:strings},['creativeVersionId','approvedText','destinationURL','fictional']),
  Campaign:object({campaignId:str,campaignVersionId:str,advertiserId:str,status:enumeration(['active','paused']),allowedIntents:strings,destination:str,declaredConstraints:strings,creatives:array(ref('Creative')),softFitTags:strings,maxBidBaseUnits:ref('AmountBaseUnits'),budgetCapBaseUnits:ref('AmountBaseUnits'),channelId:str,policyVersion:str},['campaignId','campaignVersionId','advertiserId','status','allowedIntents','destination','declaredConstraints','creatives','maxBidBaseUnits','budgetCapBaseUnits','channelId']),
  Decision:object({schemaVersion:str,opportunityId:str,advertiserId:str,campaignVersionId:str,agentRunId:str,decision:enumeration(['bid','skip','abstain']),creativeVersionId:nullable(str),relevanceLevel:level,commercialIntentLevel:level,relevance:nullable(num),commercialIntent:nullable(num),conversionProbability:{type:'null'},evidenceFieldIds:strings,reasonCodes:strings,scoreSemantics:str,engineProvenance:ref('JsonObject')},['opportunityId','advertiserId','campaignVersionId','agentRunId','decision','creativeVersionId','relevanceLevel','commercialIntentLevel','conversionProbability','evidenceFieldIds','reasonCodes','engineProvenance']),
  Bid:object({id:str,status:{const:'bid'},opportunityId:str,campaignId:str,campaignVersionId:str,advertiserId:str,creativeVersionId:str,agentRunId:str,amountBaseUnits:ref('AmountBaseUnits'),bidPolicyVersion:str}),
  Award:object({id:str,runId:str,mode:ref('FinancialMode'),opportunityId:str,campaignId:str,campaignVersionId:str,advertiserId:str,publisherId:str,randomSessionId:str,channelId:str,creativeVersionId:str,creativeHash:str,creative:ref('Creative'),priceBaseUnits:ref('AmountBaseUnits'),payee:str,winningBidId:str,status:enumeration(['reserved','delivered','failed','expired']),expiresAt:integer,createdAt:integer,renderTokenHash:str},['id','runId','mode','opportunityId','campaignId','campaignVersionId','advertiserId','publisherId','randomSessionId','channelId','creativeVersionId','creativeHash','creative','priceBaseUnits','payee','winningBidId','status','expiresAt','createdAt']),
  Outcome:object({status:enumeration(['awarded','no_fill','expired']),award:ref('Award'),bids:array(ref('Bid')),rejections:array(ref('JsonObject'))},['status','bids','rejections']),
  Receipt:object({schemaVersion:str,runId:str,mode:ref('FinancialMode'),publisherId:str,publisherKeyId:str,awardId:str,opportunityId:str,creativeHash:str,nonce:str,renderAcknowledgementHash:str}),
  Delivery:object({id:str,awardId:str,status:{const:'accepted'},receivedAt:integer,receiptHash:str}),
  Charge:object({id:str,runId:str,mode:ref('FinancialMode'),awardId:str,deliveryId:str,campaignId:str,campaignVersionId:str,channelId:str,amountBaseUnits:ref('AmountBaseUnits'),acceptedAt:integer,sequence:integer,status:enumeration(['accepted','authorized','settled']),receiptHash:str,delivery:ref('Delivery')}),
  DeliveryResult:object({delivery:ref('Delivery'),charge:ref('Charge'),replayed:bool}),
  RenderAcknowledgement:object({domInserted:bool,sponsoredLabelPresent:bool,creativeHash:str}),
  Channel:object({channelId:str,advertiserId:str,publisherId:str,payee:str,mode:ref('FinancialMode'),status:enumeration(['pending_open','open','draining','finalized']),depositBaseUnits:ref('AmountBaseUnits'),authorizedBaseUnits:ref('AmountBaseUnits'),settledBaseUnits:ref('AmountBaseUnits'),refundBaseUnits:ref('AmountBaseUnits'),txSignature:nullable(str),protocolChannelId:str,termsHash:str,closeStatus:str},['channelId','advertiserId','publisherId','payee','mode','status','depositBaseUnits','authorizedBaseUnits','settledBaseUnits','refundBaseUnits','txSignature']),
  RuntimeEvent:object({seq:integer,type:str,at:integer,data:ref('JsonObject')}),
  RuntimeState:object({schemaVersion:{const:'axp.runtime.v1'},runId:str,mode:ref('FinancialMode'),campaigns:array(ref('Campaign')),channels:array(ref('Channel')),opportunities:array(ref('JsonObject')),awards:array(ref('Award')),charges:array(ref('Charge')),events:array(ref('RuntimeEvent')),payments:json},['schemaVersion','runId','mode','campaigns','channels','opportunities','awards','charges','events']),
  RuntimeBootstrap:object({csrf:str,runId:str,mode:ref('FinancialMode'),demo:nullable(ref('JsonObject')),evidenceSource:object({enabled:bool,database:nullable({const:'ads'}),readOnly:{const:true},embeddingGeneration:{const:false}}),engines:array(object({id:str,label:str})),limitations:strings}),
  Health:object({status:{const:'ok'},mode:ref('FinancialMode'),realPayments:bool}),
  TurnRequest:object({prompt:str,engine:str,turnId:str,randomSessionId:str},['prompt']),
  RecoveryRequest:object({turnId:str,randomSessionId:str}),
  TurnResult:object({runId:str,mode:ref('FinancialMode'),engine:str,opportunityId:str,organic:ref('JsonObject'),outcome:ref('Outcome'),attempts:array(object({campaignId:str,status:enumeration(['completed','unavailable']),decision:ref('Decision'),reason:str,elapsedMs:num},['campaignId','status','elapsedMs'])),eligibility:ref('JsonObject'),replayed:bool,originalOrganic:ref('JsonObject'),organicRecovery:ref('JsonObject')},['runId','mode','engine','opportunityId','organic','outcome','attempts','replayed']),
  RecordedResults:object({runId:str,mode:{const:'recorded_results_not_fresh_execution'},results:array(ref('TurnResult'))}),
  Cases:object({manifest:ref('JsonObject'),cases:array(ref('JsonObject')),liveEnabled:{const:false},sourceEnabled:bool}),
  CompareRequest:object({caseId:str}),
  LookupRequest:object({prompt:str}),
  EvidenceResult:object({schemaVersion:{const:'cached-corpus-result.v1'},status:enumeration(['ready','query_vector_unavailable','source_unconfigured']),matches:array(ref('JsonObject')),provenance:ref('JsonObject'),limitations:strings},['schemaVersion','status','matches','limitations']),
  ComparisonResult:object({schemaVersion:{const:'phase2-comparison.v1'},runId:str,mode:{const:'nonfinancial_comparison'},task:ref('JsonObject'),caseManifest:ref('JsonObject'),preparationElapsedMs:num,totalElapsedMs:num,preparationError:nullable(str),lookupEvents:array(ref('JsonObject')),profiles:array(ref('JsonObject')),attempts:array(ref('JsonObject')),providerUsage:json,limitations:strings}),
  EmptyRequest:object(),
  ResetResult:object({runId:str,mode:{const:'synthetic'},historyPreserved:{const:true}}),
  ReplayBootstrap:object({schemaVersion:{const:'axp.replay.v1'},presentationKind:ref('PresentationKind'),financialMode:{const:'sandbox'},runId:str,originalRecordedAt:str,readOnly:{const:true},bundleHash:str,steps:array(object({id:str,title:str}))}),
  ReplayRun:object({campaigns:json,turns:json,evidence:json,decisions:json,deliveries:json,payment:json,chain:json,restart:json,research:json,limitations:json},undefined,json),
  // The main replay bundle owns nested projection/event/fixtures schemas.
  ReplayEvent:ref('RuntimeEvent'),
  ReplayFixtures:json,
  FrontendFixture:object({schemaVersion:{const:'axp.frontend-fixture.v1'},id:str,sourceKind:ref('SourceKind'),financialMode:ref('FinancialMode'),description:str,source:nullable(ref('JsonObject')),response:json,limitations:strings}),
};

// Document implemented routes only. Runtime payment commands are documented,
// but deliberately absent from the browser client method registry.
export const operations = [
  ['GET','/health','health','Health'],
  ['GET','/v1/bootstrap','bootstrap','RuntimeBootstrap'],
  ['GET','/v1/state','state','RuntimeState'],
  ['GET','/v1/demo/results','results','RecordedResults'],
  ['GET','/v1/decisions/cases','decisionCases','Cases'],
  ['GET','/v1/decisions/recorded','recordedDecisions','JsonObject'],
  ['GET','/v1/events','runtimeEvents','RuntimeEvent',null,'runtime','sse'],
  ['POST','/v1/evidence/lookup','lookupEvidence','EvidenceResult','LookupRequest'],
  ['POST','/v1/decisions/compare','compareDecisions','ComparisonResult','CompareRequest'],
  ['POST','/v1/demo/turn','turn','TurnResult','TurnRequest'],
  ['POST','/v1/phase3/recover-organic','recoverOrganic','TurnResult','RecoveryRequest'],
  ['POST','/v1/demo/reset','reset','ResetResult','EmptyRequest'],
  ['POST','/v1/campaigns','createCampaign','Campaign','Campaign','runtime','json',201],
  ['POST','/v1/campaigns/{id}/pause','pauseCampaign','Campaign','EmptyRequest'],
  ['POST','/v1/awards/{id}/render','acknowledgeRender','DeliveryResult','RenderAcknowledgement'],
  ['POST','/v1/awards/{id}/fail','failAward','Award','EmptyRequest'],
  ['POST','/v1/synthetic-channels/{id}/authorize',null,'Channel','EmptyRequest'],
  ['POST','/v1/synthetic-channels/{id}/close',null,'Channel','EmptyRequest'],
  ['GET','/v1/replay/bootstrap','replayBootstrap','ReplayBootstrap',null,'replay'],
  ['GET','/v1/replay/run','replayRun','ReplayRun',null,'replay'],
  ['GET','/v1/replay/events','replayEvents','ReplayEvent',null,'replay','sse'],
  ['GET','/v1/replay/fixtures','replayFixtures','ReplayFixtures',null,'replay'],
].map(([method,path,name,response,request=null,surface='runtime',format='json',status=200])=>({method,path,name,response,request,surface,format,status}));

export function buildOpenAPI() {
  const paths={};
  for (const op of operations) {
    const parameters=[];
    if(op.path.includes('{id}'))parameters.push({name:'id',in:'path',required:true,schema:{type:'string'}});
    if(op.format==='sse')parameters.push({name:'Last-Event-ID',in:'header',required:false,schema:{type:'string'},description:op.surface==='runtime'?'Nonnegative safe-integer seq; invalid resets to 0. Run change emits reset.':'Original replay cursor; main replay server owns cursor validation. Finite chronological stream, no timers.'});
    const content=op.format==='sse'?{'text/event-stream':{schema:{type:'string'},'x-event-data-schema':ref(op.response)}}:{'application/json':{schema:ref(op.response)}};
    const responses={[op.status]:{description:'Success',content}};
    for(const code of [400,403,404,409,413,500,503])responses[code]={description:'Runtime-dependent error; body contains error code only.',content:{'application/json':{schema:ref('Error')}}};
    paths[op.path]??={};
    paths[op.path][op.method.toLowerCase()]={operationId:op.name??op.path.split('/').filter(Boolean).join('_'),tags:[op.surface],parameters,security:op.method==='POST'?[{LocalCSRF:[]}]:[],responses,'x-browser-client':op.name!==null,'x-surface':op.surface,...(op.request?{requestBody:{required:true,content:{'application/json':{schema:ref(op.request)}}}}:{})};
    if(op.surface==='replay')paths[op.path].post={operationId:`${op.name}RejectWrite`,summary:'Always refused: replay is read-only',tags:['replay'],security:[],responses:{405:{description:'recorded_replay_read_only',headers:{Allow:{schema:{const:'GET'}}},content:{'application/json':{schema:ref('Error')}}}},'x-browser-client':false};
    if(op.name==='runtimeEvents')paths[op.path].get.description='Live runtime polls every 500ms; Last-Event-ID resumes seq. Reset clears the cursor after run change.';
    if(op.name==='replayEvents')paths[op.path].get.description='Original exchange events, ascending seq with original timestamps. Invalid or negative Last-Event-ID resets to 0. Finite stream closes after all remaining events; no timers.';
    if(op.name==='state')paths[op.path].get.description='Runtime GET may synchronize network-channel projections into local state. Unlike replay, this runtime is not globally read-only.';
  }
  return {openapi:'3.1.0',info:{title:'AXP local reference runtime and Phase5 replay seam',version:'axp.frontend.v1',description:'apps/backend/server.mjs is implemented reference runtime. Replay paths are the approved main-owned seam, not a claim of server integration. No production auth, planned API routes or browser payment SDK. Amount/URL/decision cross-field business validation remains server-side.'},servers:[{url:'http://127.0.0.1:8788',description:'Reference runtime (Phase4 launcher may use 8789); replay port supplied by main launcher.'}],paths,components:{schemas,securitySchemes:{LocalCSRF:{type:'apiKey',in:'header',name:'x-axp-csrf',description:'Local operator token from /v1/bootstrap. Loopback Host and same-origin checks; no multi-tenant auth. Not payment authority.'}}}};
}
