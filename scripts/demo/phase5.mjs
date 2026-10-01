import {createReplayServer} from '../../packages/replay/server.mjs';
const port=Number(process.env.AXP_REPLAY_PORT??8790);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('replay_port_invalid');
const server=createReplayServer();server.listen(port,'127.0.0.1',()=>console.log(`AXP recorded evidence replay: http://127.0.0.1:${port}/\nOriginal network: SANDBOX. Read-only; no credentials, database, models or wallet operations.`));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{server.close();server.closeAllConnections();});
