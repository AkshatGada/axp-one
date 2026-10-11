import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,join} from 'node:path';
import {createLab} from './exchange.mjs';

const root=fileURLToPath(new URL('../../',import.meta.url));
const stateDir=resolve(root,process.env.CLEANROOM_STATE_DIR??'local-state/sdk-cleanroom');
mkdirSync(stateDir,{recursive:true,mode:0o700});
const lab=createLab({stateDir});
const base=await lab.listen(Number(process.env.CLEANROOM_EXCHANGE_PORT??3470));
const child=spawn(process.execPath,['server.js'],{
  cwd:join(root,'experiments/sdk-cleanroom/app'),stdio:['ignore','inherit','inherit'],
  env:{PATH:process.env.PATH,LANG:process.env.LANG??'en_US.UTF-8',
    PORT:process.env.CLEANROOM_APP_PORT??'3471',AXP_EXCHANGE_URL:`${base}/api/product`,
    AXP_PUBLISHER_API_KEY:readFileSync(join(stateDir,'publisher-api-key'),'utf8').trim()}
});
console.log(`SDK clean-room: ${base}; chat http://127.0.0.1:${process.env.CLEANROOM_APP_PORT??3471}`);
console.log('Fixture decisions/answers; synthetic ledger; no paid providers or wallets.');
let stopping=false;
async function stop(code=0){
  if(stopping)return;stopping=true;
  if(child.exitCode===null)child.kill('SIGTERM');
  writeFileSync(join(stateDir,'evidence.json'),JSON.stringify(lab.evidence(),null,2)+'\n');
  await lab.close();process.exitCode=code;
}
child.once('error',()=>stop(1));child.once('exit',code=>stop(code??0));
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>stop());
