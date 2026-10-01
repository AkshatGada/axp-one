import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createDemoServer} from '../../apps/backend/server.mjs';
import {createPhase4Runtime,PHASE4_RUN_ID} from '../../apps/backend/phase4.mjs';
import {SQLitePaymentStore} from '../../packages/payments/store.mjs';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {createAppOrganicBridge} from '../../packages/dsp/app-organic.mjs';
import {stateDir,loadTerms,projectNetworkState,paymentEvidence} from './phase4-payment.mjs';

// Browser process has neither wallet signing nor operator payment endpoints.
const terms=loadTerms(),store=new SQLitePaymentStore(join(stateDir,'payments.sqlite'));
const corpus=createCachedCorpus(),transport=createJevHttpTransport({apiKey:process.env.TYPESAFE_API_KEY,maxCalls:6});
const runtime=await createPhase4Runtime({terms,corpus,transport,answerRunner:createAppOrganicBridge({directory:join(stateDir,'app-answers')}),organicRuntime:'app-bridge'});
const server=createDemoServer({stateDir,runId:PHASE4_RUN_ID,corpus,sessionOptions:{...runtime.sessionOptions,mode:terms.mode,publisherPayee:terms.payee,networkState:id=>projectNetworkState(store,id)},demoMetadata:runtime.metadata,networkReport:()=>paymentEvidence(store)});
server.listen(8789,'127.0.0.1',()=>console.log('AXP Phase 4: http://127.0.0.1:8789/ — actual models, official Solana test sandbox; signing only via operator terminal.'));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close();server.closeAllConnections();store.close();});
