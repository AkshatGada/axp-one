import {resolve} from 'node:path';
import {createV2Server} from '../../apps/backend/v2.mjs';
import {jevApiKey} from '../../packages/config/local.mjs';
const root=resolve(import.meta.dirname,'../..'),replay=process.argv.includes('--replay');
const port=Number(process.env.AXP_V2_PORT??8793);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw Error('invalid_loopback_port');
const liveEnabled=!replay&&process.env.AXP_V2_ENABLE_MODELS==='1';
// Existing local provider key, server-side only; never sent in bootstrap or logs.
let apiKey;
if(liveEnabled)apiKey=jevApiKey();
const server=createV2Server({stateDir:resolve(root,'local-state/v2-wallet'),apiKey,liveEnabled,replayDirectory:replay?resolve(root,'artifacts/v2/replay'):null});
server.listen(port,'127.0.0.1',()=>console.log(`AXP V2: http://127.0.0.1:${port}\n${replay?'Read-only recorded replay':liveEnabled?'Operator-enabled bounded actual Jev run':'Preview only; provider disabled'} · V2 accounting SYNTHETIC · no wallet access`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close();server.closeAllConnections();});
