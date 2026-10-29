/** Exact finalized metadata and account proof. No signing or implicit submission. */
import {createNativeObserver} from '../native/observations.mjs';
import {publicKeyBytes} from '../native/codec.mjs';
import {hash} from './manifest.mjs';
import {LOADER,demand} from './legacy.mjs';
// stateName is optional derived display data (OrderUse has no enum); wire fields stay intact.
function wireProof(value){if(Array.isArray(value))return value.map(wireProof);if(value&&typeof value==='object'){const entries=[];for(const [k,v] of Object.entries(value)){if(v===undefined){demand(k==='stateName','MISSING_PROOF_FIELD');continue;}entries.push([k,wireProof(v)]);}return Object.fromEntries(entries);}return value;}
export async function verifyDevnetOperation({plan,rpc,operation,elf,transaction}){
 const o=operation,a=plan.get(o.id),tx=transaction===undefined?await rpc.transaction(o.attempt.signature):transaction;if(tx===null)return null;
 demand(tx.transaction?.[0]===o.attempt.transaction&&tx.transaction[1]==='base64'&&tx.meta&&Object.hasOwn(tx.meta,'err')&&Number.isSafeInteger(tx.slot),'EXACT_FINALIZED_TRANSACTION');
 const m=tx.meta,keys=o.accountKeys;demand(Array.isArray(m.preBalances)&&m.preBalances.length===keys.length&&m.postBalances.length===keys.length&&Number.isSafeInteger(m.fee)&&m.fee>=0&&m.fee<=50000&&Number.isSafeInteger(m.computeUnitsConsumed)&&m.computeUnitsConsumed<=((o.kind==='market'||o.kind==='probe')?200000:1400000),'TRANSACTION_LIMIT');
 const deltas=keys.map((address,j)=>({address,before:String(m.preBalances[j]),after:String(m.postBalances[j]),delta:(BigInt(m.postBalances[j])-BigInt(m.preBalances[j])).toString()}));demand(deltas.reduce((n,r)=>n+BigInt(r.delta),0n)===-BigInt(m.fee),'LAMPORT_CONSERVATION');let status=m.err===null?'success':'failure',rent='0',proof={};
 if(o.kind==='probe'){
  demand(deltas.every((r,j)=>BigInt(r.delta)===(j===0?-BigInt(m.fee):0n)),'PROBE_PRINCIPAL_CHANGED');
  const after=await rpc.accounts(keys,{minContextSlot:String(tx.slot)});demand(after.accounts.every((raw,j)=>(o.quote.before?.find(v=>v.address===keys[j])?.dataHash??null)===(raw.dataHash??null)),'PROBE_STATE_CHANGED');
  if(!(m.err?.InstructionError?.[0]===0&&m.err.InstructionError[1]?.Custom===o.expectedCustomError))status='unexpected';proof={expectedCustomError:o.expectedCustomError,actualError:m.err};
 }else if(o.kind==='market'){
  const native={...o,id:a.instruction.operationId,instruction:a.instruction,accounts:a.accounts,lastObservedSlot:o.watermark,attempt:{...o.attempt,message:o.message,blockhash:o.blockhash,lastValidBlockHeight:o.quote.lastValidBlockHeight,feeReserve:o.cost.fee,rentReserve:o.cost.rent}};
  const observed=await createNativeObserver({rpc:{...rpc,transaction:async()=>tx},run:plan.run}).observeFinalized(native);demand(observed.evidence==='transaction-finalized'&&observed.feeKnown&&['success','failure'].includes(observed.status),'NATIVE_EFFECT_REQUIRED');status=observed.status;rent=observed.operatingCost.rent;proof={effect:wireProof(observed.proof),accountDigests:observed.accounts.map(r=>({address:r.address,dataHash:r.dataHash,lamports:r.lamports})),economicReplay:observed.effects.economicReplay};
 }else if(m.err===null){
  const expected=new Map(keys.map((k,j)=>[k,j===0?-BigInt(m.fee):0n])),add=(k,v)=>expected.set(k,(expected.get(k)??0n)+BigInt(v));const i=plan.manifest.identities;
  if(o.kind==='buffer-create'){
   const view=await rpc.accounts([i.buffer],{minContextSlot:String(tx.slot)}),b=view.accounts[0];demand(!b.missing&&b.owner===LOADER&&!b.executable&&b.data.length===37+elf.length&&b.data.readUInt32LE(0)===1&&b.data[4]===1&&b.data.subarray(5,37).equals(publicKeyBytes(i.payer)),'BUFFER_IDENTITY');demand(b.lamports===o.cost.rent,'BUFFER_RENT');rent=o.cost.rent;add(i.payer,-BigInt(rent));add(i.buffer,rent);
  }else if(o.kind==='write'){
   const b=(await rpc.accounts([i.buffer],{minContextSlot:String(tx.slot)})).accounts[0];demand(!b.missing&&b.owner===LOADER&&b.data.readUInt32LE(0)===1&&b.data[4]===1&&b.data.subarray(5,37).equals(publicKeyBytes(i.payer))&&b.data.subarray(37+a.offset,37+a.offset+a.length).equals(elf.subarray(a.offset,a.offset+a.length)),'WRITE_READBACK');proof={offset:a.offset,length:a.length,chunkHash:hash(elf.subarray(a.offset,a.offset+a.length))};
  }else if(o.kind==='deploy'){
   const verified=await rpc.inspectRun({requireMarket:false});demand(verified.representation.loader===LOADER&&verified.representation.programData===plan.programData&&verified.representation.upgradeAuthority===i.payer&&verified.representation.programHash===plan.manifest.elf.sha256,'DEPLOY_IDENTITY');
   const bufferIndex=keys.indexOf(i.buffer),pdIndex=keys.indexOf(plan.programData);demand(m.postBalances[bufferIndex]===0&&m.preBalances[pdIndex]===0&&m.preBalances[bufferIndex]===m.postBalances[pdIndex],'BUFFER_RECYCLE');rent=o.cost.rent;add(i.payer,-BigInt(rent));add(i.program,rent);add(i.buffer,-BigInt(m.preBalances[bufferIndex]));add(plan.programData,BigInt(m.postBalances[pdIndex]));proof={loader:LOADER,elfHash:verified.representation.programHash,programData:plan.programData,upgradeAuthority:i.payer,bufferRecycledLamports:String(m.preBalances[bufferIndex])};
  }else if(o.kind==='fixture-fund'){
   add(i.payer,-BigInt(a.amount));add(i[a.role],a.amount);
  }else if(o.kind==='fixture-sweep'){
   const source=i[a.role],j=keys.indexOf(source),amount=BigInt(o.quote.sweepBalance)-BigInt(o.quote.fee);demand(BigInt(m.preBalances[j])===BigInt(o.quote.sweepBalance)&&m.postBalances[j]===0&&BigInt(m.fee)===BigInt(o.quote.fee),'SWEEP_EXACT_BALANCE');add(source,-amount);add(i.payer,amount);proof={returnedLamports:amount.toString()};
  }else if(o.kind==='buffer-close'){
   const j=keys.indexOf(i.buffer),amount=BigInt(m.preBalances[j]);demand(m.postBalances[j]===0,'BUFFER_CLOSE');add(i.buffer,-amount);add(i.payer,amount);proof={returnedLamports:amount.toString()};
  }else demand(false,'UNDECLARED_ACTION');
  demand(deltas.every(r=>BigInt(r.delta)===(expected.get(r.address)??0n)),'EXACT_ACCOUNT_DELTA');
 }else demand(deltas.every((r,j)=>BigInt(r.delta)===(j===0?-BigInt(m.fee):0n)),'FAILED_TRANSACTION_CHANGED_BALANCE');
 const minimum=BigInt(o.watermark)>BigInt(tx.slot)?o.watermark:String(tx.slot),observed=await rpc.accounts([o.feePayer],{minContextSlot:minimum});
 return {status,contextSlot:observed.contextSlot,transactionHash:o.attempt.transactionHash,fee:String(m.fee),rent,evidence:{schema:'axp.market.devnet.operation-evidence.v1',authority:plan.manifest.provenance==='ephemeral-offline-fixture'?'injected-offline-rpc':'public-devnet-rpc',signature:o.attempt.signature,transactionHash:o.attempt.transactionHash,transaction:o.attempt.transaction,slot:String(tx.slot),feeLamports:String(m.fee),rentLamports:rent,transactionBytes:Buffer.from(o.attempt.transaction,'base64').length,computeUnits:m.computeUnitsConsumed,error:m.err,proof,deltas}};
}
