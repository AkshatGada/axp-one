import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createSession} from '../../apps/backend/session.mjs';
import {createV3Payments,projectV3NetworkState} from '../../packages/v3/payments.mjs';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
const root=resolve(import.meta.dirname,'../..'),stateDir=join(root,'local-state/v3/acceptance'),runId='v3-wallet-acceptance';
const [command,id,operation]=process.argv.slice(2),signingEnabled=process.env.AXP_V3_OPERATOR_SIGN==='1';
const payee=JSON.parse(readFileSync(join(root,'artifacts/phase4/feasibility-sandbox.json'))).network.payee;
const projectionStore=new SQLitePaymentStore(join(stateDir,'payments.sqlite'));
const session=createSession({stateDir,runId,campaigns:[],mode:'sandbox',publisherPayee:payee,networkState:id=>projectV3NetworkState(projectionStore,id)}),ex=session.exchange;
const ledgerCharge=id=>{const c=ex.require('charges',id),v=ex.require('campaign_versions',c.campaignVersionId);return {...c,sequence:String(c.sequence),advertiserId:v.advertiserId,acceptedReceiptHash:c.receiptHash};};
const obligations=id=>{const t=ex.totals({channelId:id});return {reservedBaseUnits:t.reserved.toString(),acceptedBaseUnits:t.accepted.toString(),charges:ex.all('charges').filter(c=>c.channelId===id).sort((a,b)=>a.sequence-b.sequence).map(c=>ledgerCharge(c.id))};};
const payments=createV3Payments({stateDir,runId,getLedgerCharge:ledgerCharge,getLedgerObligations:obligations,signingEnabled,feasibilityPath:join(root,'artifacts/v3/feasibility.json')});
try{let result;if(command==='freeze')result=await payments.freeze({campaigns:ex.require('v3_meta','freeze').campaigns});else if(command==='open')result=await payments.open(id);else if(command==='authorize')result=await payments.authorize(id);else if(command==='close'){ex.drainNetworkChannel(id);result=await payments.close(id);}else if(command==='reconcile')result=await payments.reconcile(id,operation);else if(command==='status')result=payments.status();else throw Error('operator_command_invalid');
 const status=payments.status();mkdirSync(join(root,'artifacts/v3'),{recursive:true});writeFileSync(join(root,'artifacts/v3/payment-state.json'),JSON.stringify({...status,generatedAt:new Date().toISOString()},null,2));console.log(JSON.stringify({result,channels:status.channels},null,2));if(result?.status==='blocked')process.exitCode=2;
}finally{payments.dispose();session.close();projectionStore.close();}
