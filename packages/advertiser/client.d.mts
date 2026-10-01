import type {RuntimeState,Campaign,TurnResult,RenderAcknowledgement,DeliveryResult,Channel,Award,JsonObject} from '../client/index.mjs';
export type Capability='travel_booking'|'expense_management'|'policy_enforcement'|'agent_identity'|'authentication'|'hotel_erp'|'expert_shortlist';
export interface AccountInput {accountName:string;brandName:string;websiteURL:string;}
export interface Account extends AccountInput {accountId:string;fictional:true;identityVerification:'not_performed_demo_only';mode:'synthetic';}
export interface DraftInput {draftId?:string;name:string;brandName:string;websiteURL:string;productDescription:string;approvedText:string;contextHints:string[];declaredCapabilities:Capability[];evidenceIds:string[];maxBidBaseUnits:string;budgetCapBaseUnits:string;depositBaseUnits:string;approved:boolean;}
export interface Draft extends DraftInput {draftId:string;updatedAt:number;launchedCampaignId:string|null;}
export interface EvidenceRecord {id:string;promptId:number;promptText:string;creativeId:number;mappingId:number;advertiser:string;creativeText:string|null;hint:null|{id:number;text:string;tier:string;modelVersion:string;reconstructionAuc:number|null;semantics:string;};source:JsonObject;}
export interface EvidenceSearch {schemaVersion:'advertiser-evidence-search.v1';method:'lexical_catalogue_search';sourceMode:string;contentHash:string;query:string;totalMatches:number;records:EvidenceRecord[];limitations:string[];}
export interface SimulationState extends RuntimeState {mode:'synthetic';presentation:'fresh_deterministic_simulation';account:Account|null;drafts:Draft[];campaignDetails:Array<Draft&{campaignId:string;evidenceContentHash:string;fictional:true;decisionEngine:string;}>;summaries:Array<{campaignId:string;status:string;acceptedBaseUnits:string;reservedBaseUnits:string;availableBaseUnits:string;authorizedBaseUnits:string;settledBaseUnits:string;refundBaseUnits:string;deliveries:number;}>;limitations:string[];}
export interface Bootstrap {csrf:string;runId:string;mode:'synthetic';presentation:'fresh_deterministic_simulation';capabilities:Capability[];presets:Array<Pick<DraftInput,'name'|'brandName'|'websiteURL'|'productDescription'|'approvedText'|'contextHints'|'declaredCapabilities'>&{id:string}>;evidence:JsonObject;routesVersion:'advertiser-simulation.v1';}
export interface AdvertiserClient {
  bootstrap():Promise<Bootstrap>;state():Promise<SimulationState>;evidence(query?:string):Promise<EvidenceSearch>;
  saveAccount(body:AccountInput):Promise<Account>;saveDraft(body:DraftInput):Promise<Draft>;
  preview(body:{draftId:string;prompt:string}):Promise<JsonObject>;
  compare(body:({draftId:string;campaignId?:never}|{campaignId:string;draftId?:never})&{prompt:string}):Promise<JsonObject>;
  launch(draftId:string):Promise<{campaign:Campaign;replayed:boolean}>;
  campaignStatus(body:{campaignId:string;status:'active'|'paused'}):Promise<Campaign>;
  turn(body:{prompt:string;turnId:string;randomSessionId:string}):Promise<TurnResult>;
  acknowledgeRender(awardId:string,body:RenderAcknowledgement):Promise<DeliveryResult>;
  failAward(awardId:string):Promise<Award>;authorize(channelId:string):Promise<Channel>;close(channelId:string):Promise<Channel>;
}
export declare function createAdvertiserClient(options:{baseURL:string;fetch?:typeof globalThis.fetch}):AdvertiserClient;
