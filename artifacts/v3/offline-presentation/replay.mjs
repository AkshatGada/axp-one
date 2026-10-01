import {createV3Server} from './apps/backend/v3.mjs';
import {resolve} from 'node:path';
const port=Number(process.env.AXP_V3_PORT??8794);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_port');
const server=createV3Server({replayDirectory:resolve(import.meta.dirname,'artifacts/v3/replay')});
server.listen(port,'127.0.0.1',()=>console.log('AXP V3 recorded sandbox replay: http://127.0.0.1:'+port));
for(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{server.close();server.closeAllConnections();});
