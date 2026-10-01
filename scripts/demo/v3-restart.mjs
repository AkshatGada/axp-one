// Local saved-outcome replay only. Never enables a provider or imports a signer.
import {resolve,join} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {hash} from '../../packages/contracts/index.mjs';
const root=resolve(import.meta.dirname,'../..'),options={stateDir:join(root,'local-state/v3'),retriever:loadEvidence(),payee:JSON.parse(readFileSync(join(root,'artifacts/phase4/feasibility-sandbox.json'))).network.payee};
let service=createV3Service(options);
try{
 const before=service.state();if(before.turns.length!==4||before.turns.some(t=>t.status!=='completed')||before.exchange.charges.length!==3||before.payments.length!==2||before.payments.some(p=>p.closeStatus!=='finalized'))throw Error('connected_acceptance_required');
 const beforeHash=hash(before);service.close();service=createV3Service(options);
 for(const t of before.turns)await service.runTurn({scenarioId:t.scenario.id,financialMode:'sandbox'});
 const duplicateReceipts=service.exchange.all('receipt_records').map(({receipt,signature})=>{const result=service.exchange.acceptDelivery({receipt,signature});if(result.replayed!==true)throw Error('duplicate_created_new_delivery');return {chargeId:result.charge.id,replayed:true};});
 if(duplicateReceipts.length!==3)throw Error('duplicate_receipt_count');
 const after=service.state(),afterHash=hash(after);if(beforeHash!==afterHash)throw Error('restart_state_changed');
 const evidence={schemaVersion:'axp.v3-restart.v1',runId:before.runId,beforeHash,afterHash,newCalls:after.model.admittedCalls-before.model.admittedCalls,newCharges:after.exchange.charges.length-before.exchange.charges.length,newSignatures:0,newBroadcasts:0,
  duplicateReceipts,method:'Restart without provider authorization; replay four completed turns and three original signed publisher receipts using saved outcomes. No payment transport or signer instantiated.',at:new Date().toISOString()};
 mkdirSync(join(root,'artifacts/v3'),{recursive:true});writeFileSync(join(root,'artifacts/v3/restart.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
}finally{service.close();}
