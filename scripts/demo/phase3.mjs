import {createDemoServer} from '../../apps/backend/server.mjs';
import {createPhase3Runtime,PHASE3_RUN_ID} from '../../apps/backend/phase3.mjs';
import {createCachedCorpus} from '../../packages/ml/data_adapter/cached-corpus.mjs';
import {createJevHttpTransport} from '../../packages/ml/engines/jev-http.mjs';
import {createAppOrganicBridge} from '../../packages/dsp/app-organic.mjs';

// Run with node --env-file=.env.local scripts/demo/phase3.mjs. Credential remains
// in this server process; Codex adapter removes it from child environments.
if(process.argv.length>3||process.argv[2]&&process.argv[2]!=='--app-organic')throw new Error('phase3_no_extra_run_or_retry_options');
const corpus=createCachedCorpus();
const transport=createJevHttpTransport({apiKey:process.env.TYPESAFE_API_KEY,maxCalls:6});
const app=process.argv[2]==='--app-organic';
const runtime=await createPhase3Runtime({corpus,transport,...(app?{answerRunner:createAppOrganicBridge(),organicRuntime:'app-bridge'}:{})});
const server=createDemoServer({stateDir:'local-state/phase3',runId:PHASE3_RUN_ID,corpus,
  sessionOptions:runtime.sessionOptions,demoMetadata:runtime.metadata});
server.listen(8788,'127.0.0.1',()=>process.stdout.write(`AXP Phase 3: http://127.0.0.1:8788/\nActual Jev buyers + independent Codex answer via ${app?'operator-recorded app completion bridge':'bundled CLI'}; SYNTHETIC accounting; no token transfers.\nSix buyer attempts; two organic completions maximum. Original failed CLI attempt preserved; no automatic retries.\n`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close();server.closeAllConnections();});
