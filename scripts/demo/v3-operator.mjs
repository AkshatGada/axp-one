import {resolve} from 'node:path';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createV3Service} from '../../packages/v3/service.mjs';
import {loadEvidence} from '../../packages/v2/evidence.mjs';
import {sanitized} from '../../packages/v2/bundle.mjs';
import {jevApiKey} from '../../packages/config/local.mjs';
const root=resolve(import.meta.dirname,'../..'),directory=resolve(root,'local-state/v3'),liveEnabled=process.env.AXP_V3_ENABLE_MODELS==='1';
let apiKey;if(liveEnabled)apiKey=jevApiKey();
const service=createV3Service({stateDir:directory,retriever:loadEvidence(),apiKey,liveEnabled,payee:JSON.parse(readFileSync(resolve(root,'artifacts/phase4/feasibility-sandbox.json'))).network.payee});
try{
 const command=process.argv[2],argument=process.argv[3];let result;
 if(command==='freeze')result=service.freeze();
 else if(command==='request')result=service.requestTurn({scenarioId:argument,financialMode:'sandbox'});
 else if(command==='run')result=await service.runTurn({scenarioId:argument,financialMode:'sandbox'});
 else if(command==='complete'){result=service.organic.complete(JSON.parse(readFileSync(resolve(argument),'utf8')));}
 else if(command==='requests')result=service.organic.list();
 else if(command==='state')result=service.state();
 else if(command==='snapshot'){const state=sanitized(service.state());mkdirSync(resolve(root,'artifacts/v3'),{recursive:true});writeFileSync(resolve(root,'artifacts/v3/state.json'),JSON.stringify(state,null,2));result={status:'saved',turns:state.turns.length,charges:state.exchange.charges.length};}
 else throw Error('command_invalid');
 console.log(JSON.stringify(result,null,2));
}finally{service.close();}
