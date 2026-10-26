/** Finalized raw-account and exact-transaction evidence; no reference-store relabeling. */
import {reject,decodeAccount,publicKeyBytes,ZERO_KEY,ZERO_HASH} from './codec.mjs';
import {deriveMarketPda,deriveSeriesPda,deriveUnitPda,deriveMatchPda,deriveOrderUsePda,unitId,seriesTermsHash,fundTermsHash,fee,sha256} from './domain.mjs';
import {natural,verifyPersistedTransaction} from './phase2-transport-utils.mjs';
import {validateMarketAccount} from './rpc.mjs';
const stateNames={Unit:['IssuerOpen','FundedOpen','DeliveryLocked','Consumed','Refunded','Expired'],Match:{1:'PrimaryEscrowed',2:'PrimarySettled',3:'PrimaryRefunded',4:'SecondarySettled'}};
export function validateNativeAccount(raw,run,{kind,expected={}}={}){
 if(raw?.missing)return null;if(!raw||raw.owner!==run.program||raw.executable)reject('RUN_MISMATCH');const value=decodeAccount(raw.data);if(value.market!==run.market||kind&&value.kind!==kind)reject('RUN_MISMATCH');let address;
 if(value.kind==='Market'){validateMarketAccount(raw,run);address=deriveMarketPda(run).address;}
 if(value.kind==='Series'){address=deriveSeriesPda({...run,seriesId:value.seriesId}).address;if(value.issuer!==run.issuer||value.termsHash!==seriesTermsHash(value))reject('RUN_MISMATCH');}
 if(value.kind==='Unit'){if(value.unitId!==unitId(value))reject('RUN_MISMATCH');address=deriveUnitPda({...run,unitId:value.unitId}).address;}
 if(value.kind==='Match'){address=deriveMatchPda({...run,matchId:value.matchId}).address;if(value.fee!==fee(value.gross)||value.primaryClaimFace==='0')reject('RUN_MISMATCH');}
 if(value.kind==='OrderUse')address=deriveOrderUsePda({...run,actor:value.actor,nonce:value.nonce}).address;
 if(address!==raw.address)reject('RUN_MISMATCH');for(const [key,expectedValue]of Object.entries(expected))if(value[key]!==expectedValue)reject('RUN_MISMATCH');
 return {...value,address:raw.address,lamports:raw.lamports,dataHash:raw.dataHash,stateName:stateNames[value.kind]?.[value.state]};
}
export function nativeProof(operation,accounts,run){
 const map=new Map(accounts.map(raw=>[raw.address,raw]));const read=(address,kind)=>{if(!address)reject('RUN_MISMATCH');const raw=map.get(address);if(!raw)reject('RUN_MISMATCH');return validateNativeAccount(raw,run,{kind});};
 const a=operation.accounts,i=operation.instruction;if(!a||!i||i.operationId!==operation.id)reject('RUN_MISMATCH');
 const market=read(run.market,'Market');if(i.type!=='Init'&&!market)reject('RUN_MISMATCH');
 if(i.type==='Init')return market?{effect:true,state:'Active',account:run.market}:null;
 const s=read(a.series,'Series');if(i.type==='IssueSeries'){
  if(!s)return null;for(const field of ['seriesId','resourceHash','versionHash','format','useBySlot','sponsoredPrice','cap','maxTransfers','transferable','contentBytes'])if(s[field]!==i[field])reject('RUN_MISMATCH');return {effect:true,state:'Active',account:a.series};
 }
 if(!s)reject('RUN_MISMATCH');const u=read(a.unit,'Unit');if(i.type==='RegisterUnit'){if(!u)return null;if(u.series!==a.series||u.serial!==i.serial||s.seriesId!==i.seriesId||s.issued<=u.serial)reject('RUN_MISMATCH');return {effect:true,state:u.stateName,unit:u};}
 if(!u)return null;if(u.series!==a.series)reject('RUN_MISMATCH');
 if(i.type==='Fund'){
  const m=read(a.match,'Match'),buy=read(a.buyUse,'OrderUse'),sell=read(a.sellUse,'OrderUse');if(!m&&!buy&&!sell)return null;if(!m||!buy||!sell)reject('RUN_MISMATCH');
  const expected={matchId:i.matchId,unit:a.unit,series:a.series,expectedCursor:i.expectedCursor,fundedCursor:(BigInt(i.expectedCursor)+1n).toString(),payer:a.payer,beneficiary:a.beneficiary,seller:a.seller,buyNonce:i.buyNonce,sellNonce:i.sellNonce,buyAuthHash:i.buyAuthHash,sellAuthHash:i.sellAuthHash,gross:i.gross,tradeKind:i.fundingKind,packetHash:i.packetHash,campaignId:i.campaignId,fundTermsHash:fundTermsHash(i,operation.semanticKeys??[a.market,a.series,a.unit,a.payer,a.beneficiary,a.seller,a.matcher,a.collector,a.buyUse,a.sellUse,i.fundingKind===1?a.primaryMatch:ZERO_KEY])};
  for(const [field,value]of Object.entries(expected))if(m[field]!==value)reject('RUN_MISMATCH');
  for(const [use,actor,nonce,authHash]of [[buy,a.beneficiary,i.buyNonce,i.buyAuthHash],[sell,a.seller,i.sellNonce,i.sellAuthHash]])if(use.actor!==actor||use.nonce!==nonce||use.authHash!==authHash||use.match!==a.match||use.consumedSlot!==m.fundedSlot)reject('RUN_MISMATCH');
  if(i.fundingKind===1?m.state!==4:![1,2,3].includes(m.state))reject('RUN_MISMATCH');
  if(u.refundFace==='0'||u.primaryMatch===ZERO_KEY)reject('RUN_MISMATCH');
  if(BigInt(u.cursor)<BigInt(m.fundedCursor)||u.refundFace!==m.primaryClaimFace||i.fundingKind!==1&&u.primaryMatch!==a.match)reject('RUN_MISMATCH');
  if(u.cursor===m.fundedCursor&&(u.owner!==a.beneficiary||u.latestMatch!==a.match))reject('RUN_MISMATCH');
  if(i.fundingKind===1){const primary=read(a.primaryMatch,'Match');if(!primary||![1,2,3].includes(primary.state)||primary.tradeKind===1||primary.gross!==m.primaryClaimFace||u.primaryMatch!==a.primaryMatch)reject('RUN_MISMATCH');}
  return {effect:true,state:m.stateName,receipt:{matchId:m.matchId,termsHash:m.fundTermsHash,state:m.stateName},unit:u,match:m,buyUse:buy,sellUse:sell};
 }
 if(i.type==='StartDelivery'){
  if(u.state===1)return null;
  if(![2,3,4].includes(u.state)||u.owner!==a.owner||u.requestHash!==i.requestHash||u.lockStartCursor!==i.expectedCursor||BigInt(u.lockDeadlineSlot)!==BigInt(u.lockStartSlot)+150n||BigInt(u.cursor)<BigInt(i.expectedCursor)+1n)reject('RUN_MISMATCH');
  return {effect:true,state:u.stateName,unit:u,requestHash:u.requestHash};
 }
 const primary=read(a.primaryMatch,'Match');if(!primary||primary.tradeKind===1||primary.unit!==a.unit||u.primaryMatch!==a.primaryMatch||primary.gross!==u.refundFace)reject('RUN_MISMATCH');
 if(![3,4,5].includes(u.state))return null;
 if(u.terminalOpHash!==primary.terminalOpHash||u.terminalSlot!==primary.terminalSlot)reject('RUN_MISMATCH');
 if(u.state===4&&primary.state!==3||[3,5].includes(u.state)&&primary.state!==2)reject('RUN_MISMATCH');
 if(i.type!=='ExpireUnused'&&(u.requestHash!==i.requestHash||BigInt(u.cursor)!==BigInt(i.expectedLockedCursor)+1n))reject('RUN_MISMATCH');
 const reason={FinalizeDelivery:1,RefundFailure:2,TimeoutRefund:3,ExpireUnused:4}[i.type];if(!reason)reject('RUN_MISMATCH');
 if(u.terminalOpHash!==operation.id){return {effect:false,superseded:true,state:u.stateName,unit:u,primaryMatch:primary,terminalOperationId:u.terminalOpHash};}
 if(u.terminalReason!==reason||i.type==='FinalizeDelivery'&&(u.state!==3||u.responseHash!==i.responseHash)||i.type==='ExpireUnused'&&(u.state!==5||BigInt(u.cursor)!==BigInt(i.expectedCursor)+1n)||['RefundFailure','TimeoutRefund'].includes(i.type)&&u.state!==4)reject('RUN_MISMATCH');
 const recipient=u.state===4?(u.sponsored?u.sponsorRefundKey:u.owner):s.issuer;
 if(primary.terminalRecipient!==recipient||u.state===4&&a.refundRecipient!==recipient||u.state!==4&&(a.issuer!==s.issuer||a.collector!==run.collector))reject('RUN_MISMATCH');
 return {effect:true,state:u.stateName,unit:u,primaryMatch:primary,terminalOperationId:u.terminalOpHash,recipient};
}

/** Validate UNIQUE-key exact transaction deltas, including fees/rent once. */
export function transactionEffects(operation,parsed,meta,proof,run){
 if(!meta||!Array.isArray(meta.preBalances)||!Array.isArray(meta.postBalances)||meta.preBalances.length!==parsed.keys.length||meta.postBalances.length!==parsed.keys.length||meta.loadedAddresses?.writable?.length||meta.loadedAddresses?.readonly?.length)reject('RUN_MISMATCH');
 const pre=meta.preBalances.map(v=>BigInt(natural(v))),post=meta.postBalances.map(v=>BigInt(natural(v))),networkFee=BigInt(natural(meta.fee));if(networkFee>100000n)reject('RUN_MISMATCH');
 const expected=new Map(parsed.keys.map(k=>[k,0n]));const add=(key,n)=>{if(!expected.has(key))reject('RUN_MISMATCH');expected.set(key,expected.get(key)+n);};add(parsed.keys[0],-networkFee);
 const a=operation.accounts,i=operation.instruction;let rent=0n,economicReplay=false;
 if(meta.err===null){
  if(!proof?.effect)reject('RUN_MISMATCH');
  const newAccounts=i.type==='Init'?[a.market]:i.type==='IssueSeries'?[a.series]:i.type==='RegisterUnit'?[a.unit]:i.type==='Fund'?[a.match,a.buyUse,a.sellUse]:[];
  if(newAccounts.length){const existing=newAccounts.map(address=>pre[parsed.keys.indexOf(address)]>0n);if(existing.some(Boolean)&&!existing.every(Boolean))reject('RUN_MISMATCH');economicReplay=existing.every(Boolean);}
  if(['FinalizeDelivery','ExpireUnused','RefundFailure','TimeoutRefund'].includes(i.type)){const index=parsed.keys.indexOf(a.primaryMatch);economicReplay=post[index]===pre[index];}
  if(!economicReplay){
  for(const address of newAccounts){const index=parsed.keys.indexOf(address);if(index<0||pre[index]!==0n)reject('RUN_MISMATCH');let value=post[index];if(i.type==='Fund'&&address===a.match&&i.fundingKind!==1)value-=BigInt(i.gross);if(value<=0n)reject('RUN_MISMATCH');if(i.type==='Fund'&&address===a.match&&value!==BigInt(proof.match.rentReserve))reject('RUN_MISMATCH');rent+=value;add(address,value);}
  if(rent) add(i.type==='Init'?a.initializer:run.matcher,-rent);
  if(i.type==='Fund'){
   const gross=BigInt(i.gross),f=BigInt(fee(i.gross));add(a.payer,-gross);if(i.fundingKind===1){add(a.seller,gross-f);add(a.collector,f);}else add(a.match,gross);
  }else if(['FinalizeDelivery','ExpireUnused','RefundFailure','TimeoutRefund'].includes(i.type)){
   const gross=BigInt(proof.primaryMatch.gross);add(a.primaryMatch,-gross);if(['FinalizeDelivery','ExpireUnused'].includes(i.type)){const f=BigInt(fee(gross.toString()));add(a.issuer,gross-f);add(a.collector,f);}else add(a.refundRecipient,gross);
  }
  }
 }
 const deltas=parsed.keys.map((key,index)=>({key,pre:pre[index].toString(),post:post[index].toString(),delta:(post[index]-pre[index]).toString()}));
 for(const value of deltas)if(BigInt(value.delta)!==expected.get(value.key))reject('RUN_MISMATCH');
 if(deltas.reduce((sum,v)=>sum+BigInt(v.delta),0n)!==-networkFee)reject('RUN_MISMATCH');
 return {fee:networkFee.toString(),rent:rent.toString(),feePayer:parsed.keys[0],economicReplay,deltas};
}

export function createNativeObserver({rpc,run}){
 return Object.freeze({
  async observeFinalized(operation){
   const parsed=verifyPersistedTransaction(operation,run);const transaction=await rpc.transaction(parsed.signature);let txSlot='0',meta=null;
   if(transaction!==null){
    if(!transaction||!Array.isArray(transaction.transaction)||transaction.transaction[1]!=='base64'||transaction.transaction[0]!==operation.attempt.transaction||transaction.version!==undefined&&transaction.version!=='legacy')reject('RUN_MISMATCH');
    txSlot=natural(transaction.slot);meta=transaction.meta;if(!meta||!Object.hasOwn(meta,'err'))reject('RUN_MISMATCH');if(meta.computeUnitsConsumed!==undefined&&BigInt(natural(meta.computeUnitsConsumed))>200000n)reject('CAPACITY');
   }
   const minimum=(BigInt(operation.lastObservedSlot??'0')>BigInt(txSlot)?operation.lastObservedSlot:txSlot)??'0';
   const addresses=[...new Set([run.market,operation.feePayer??run.matcher,...Object.values(operation.accounts)].filter(k=>k!==ZERO_KEY))];
   const view=await rpc.accounts(addresses,{minContextSlot:minimum});const proof=nativeProof(operation,view.accounts,run);
   const wallets=view.accounts.filter(a=>!a.missing&&a.owner===ZERO_KEY&&!a.executable&&a.data.length===0).map(a=>({key:a.address,balance:a.lamports}));
   let status='unknown',effects=null,evidence='account-state-only';
   if(meta){
    evidence='transaction-finalized';
    if(meta.err===null){if(!proof?.effect)reject('RUN_MISMATCH');status='success';effects=transactionEffects(operation,parsed,meta,proof,run);}
    else{if(proof?.effect)reject('RUN_MISMATCH');status=proof?.superseded?'superseded':'failure';effects=transactionEffects(operation,parsed,meta,null,run);}
   }else if(proof?.effect)status='success';else if(proof?.superseded)status='superseded';
   return {operationId:operation.id,contextSlot:view.contextSlot,status,evidence,nativeEvidence:true,signature:meta?parsed.signature:null,transactionSlot:meta?txSlot:null,computeUnitsConsumed:meta?.computeUnitsConsumed!==undefined?natural(meta.computeUnitsConsumed):null,feeKnown:!!effects,operatingCost:effects?{fee:effects.fee,rent:effects.rent}:null,effects,proof,wallets,accounts:view.accounts.map(a=>({address:a.address,missing:a.missing,dataHash:a.dataHash??null,lamports:a.lamports??'0',decoded:a.missing||a.owner!==run.program?null:validateNativeAccount(a,run)}))};
  },
 });
}
