/** Public synthetic interoperability examples. Never includes signing material. */
import { AUTH_SCHEMAS,INSTRUCTION_SCHEMAS,ACCOUNT_SCHEMAS,encodeAuthorization,encodeInstruction,encodeAccount,base58Encode,ZERO_KEY,ZERO_HASH,PACKET_SHA256 } from './codec.mjs';
export function goldenVectors() {
  const key=n=>base58Encode(Buffer.alloc(32,n)),hex=n=>Buffer.alloc(32,n).toString('hex');
  const defaults=fields=>Object.fromEntries(fields.map(([name,type],i)=>[name,type==='k'?key(i+1):type==='h'?hex(i+1):type==='8'?'1':type==='keys4'?[key(1),key(2),ZERO_KEY,ZERO_KEY]:1]));
  const vectors=[];
  for(const [kind,schema] of Object.entries(AUTH_SCHEMAS)) {
    const input={kind,domain:hex(42),actor:key(43),nonce:hex(44),...defaults(schema.fields)};
    if(kind==='BookOrder')Object.assign(input,{side:0,lane:0,refundFace:'0',exactUnit:ZERO_KEY,expectedCursor:'0',limit:'10000',validUntilSlot:'18446744073709551615',minRemainingAfter:3,tif:0,quantity:1});
    if(kind==='SponsorMandate')Object.assign(input,{eligibleCount:2,budget:'100000',perGrant:'10000',maxGrants:10,version:1});
    if(kind==='SponsoredConsent')Object.assign(input,{cursor:'0',campaignVersion:1,assessment:1,nontransferable:1});
    vectors.push({name:kind,family:'authorization',input,hex:encodeAuthorization(input).toString('hex')});
  }
  for(const [type,schema] of Object.entries(INSTRUCTION_SCHEMAS)) {
    const input={type,operationId:hex(42),...defaults(schema.fields)};
    if(type==='IssueSeries')Object.assign(input,{format:2,cap:64,maxTransfers:3,transferable:1,contentBytes:16384});
    if(type==='Fund')Object.assign(input,{gross:'10000',buyerLimit:'12000',sellerLimit:'10000',minRemainingAfter:2,fundingKind:1,expectedRefundFace:'6000',packetHash:ZERO_HASH,campaignId:ZERO_HASH});
    vectors.push({name:type,family:'instruction',input,hex:encodeInstruction(input).toString('hex')});
  }
  for(const [kind,schema] of Object.entries(ACCOUNT_SCHEMAS)) {
    const input={kind,state:1,market:key(42),...defaults(schema.fields)};
    if(kind==='Market')Object.assign(input,{feeBps:100,maxTransfers:3,maxSeries:16,maxUnits:64,maxMatches:256,issuedSeries:1,issuedUnits:1,fundedMatches:1,leaseSlots:'150',maxGross:'1000000000'});
    if(kind==='Series')Object.assign(input,{format:2,cap:64,issued:1,maxTransfers:3,transferable:1,contentBytes:16384});
    if(kind==='Unit')Object.assign(input,{cursor:'18446744073709551615',transferCount:3,sponsored:0,sponsorRefundKey:ZERO_KEY,requestHash:ZERO_HASH,lockStartCursor:'0',lockStartSlot:'0',lockDeadlineSlot:'0',terminalOpHash:ZERO_HASH,responseHash:ZERO_HASH,terminalSlot:'0',terminalReason:0});
    if(kind==='Match')Object.assign(input,{gross:'10000',fee:'100',tradeKind:0,packetHash:ZERO_HASH,campaignId:ZERO_HASH,terminalOpHash:ZERO_HASH,terminalSlot:'0',terminalRecipient:ZERO_KEY});
    vectors.push({name:kind,family:'account',input,hex:encodeAccount(input).toString('hex')});
  }
  return {schemaVersion:'axp.market.golden.v1',packetSha256:PACKET_SHA256,vectors};
}
