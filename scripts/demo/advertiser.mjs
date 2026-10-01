import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createAdvertiserServer} from '../../apps/backend/advertiser.mjs';
const repo=resolve(fileURLToPath(new URL('../..',import.meta.url)));
const port=Number(process.env.AXP_ADVERTISER_PORT??8792);
if(!Number.isSafeInteger(port)||port<1024||port>65535)throw new Error('invalid_loopback_port');
const server=createAdvertiserServer({stateDir:resolve(repo,'local-state/advertiser-simulation')});
server.listen(port,'127.0.0.1',()=>console.log(`AXP advertiser simulation: http://127.0.0.1:${port}\nFictional onboarding · deterministic decisions · synthetic accounting. No model or wallet access. V1 replay remains on8790.`));
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>{server.close();server.closeAllConnections();});
