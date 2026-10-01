// One explicit user-approved sandbox faucet exception. No wallet/signature.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {V3_NETWORK} from '../../packages/payments/v3-feasibility.mjs';
const root=resolve(import.meta.dirname,'../..'),file=resolve(root,'artifacts/v3/sandbox-topup.json');
if(existsSync(file))throw Error('topup_attempt_already_recorded_do_not_repeat');
const original=JSON.parse(readFileSync(resolve(root,'artifacts/v3/feasibility.json')));
const rpc=async(method,params=[])=>{const r=await fetch(V3_NETWORK.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('rpc_unavailable');const b=await r.json();if(b.error)throw Error('rpc_error');return b.result;};
if(await rpc('getGenesisHash')!==V3_NETWORK.genesisHash)throw Error('genesis_mismatch');
const account=(await rpc('getAccountInfo',[original.accounts.payer,{encoding:'jsonParsed',commitment:'finalized'}])).value;
const info=account?.data?.parsed?.info;
if(account?.owner!==V3_NETWORK.tokenProgram||info?.owner!==V3_NETWORK.payer||info?.mint!==V3_NETWORK.mint||info?.tokenAmount?.amount!=='14000'||info.tokenAmount.decimals!==6)throw Error('changed_payer_balance_or_identity');
const record={schemaVersion:'axp.v3-sandbox-topup.v1',status:'admitted',admittedAt:new Date().toISOString(),network:V3_NETWORK,tokenAccount:original.accounts.payer,beforeBaseUnits:'14000',incrementBaseUnits:'26000',targetBaseUnits:'40000',solAddedLamports:'0',kind:'sandbox_faucet_not_settlement',authorization:'User approved exact 0.026 sandbox test USDC exception',signed:false,broadcast:false};
writeFileSync(file,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
try{await rpc('surfnet_setTokenAccount',[V3_NETWORK.payer,V3_NETWORK.mint,{amount:40000,state:'initialized'},V3_NETWORK.tokenProgram]);const after=await rpc('getTokenAccountBalance',[original.accounts.payer,{commitment:'finalized'}]);record.afterBaseUnits=after.value.amount;record.status=after.value.amount==='40000'?'confirmed':'unexpected_balance';record.completedAt=new Date().toISOString();}
catch(e){record.status='unknown';record.reasonCode=e.message;}
writeFileSync(file,JSON.stringify(record,null,2),{mode:0o600});console.log(JSON.stringify(record,null,2));if(record.status!=='confirmed')process.exitCode=2;
