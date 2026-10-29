// This child intentionally dies after FULL commit; it never receives a private key.
import {readFileSync} from 'node:fs';
import {createDevnetPlan} from '../../../packages/machine-market/devnet/plan.mjs';
import {createDevnetJournal} from '../../../packages/machine-market/devnet/journal.mjs';
const input=JSON.parse(readFileSync(process.argv[2])),plan=createDevnetPlan({manifest:input.manifest,elf:Buffer.from(input.elf,'base64'),content:Buffer.from(input.content,'base64'),allowFixture:true}),journal=createDevnetJournal({filename:input.filename,plan,measureResources:()=>({freeBytes:100000000000,totalTaskBytes:9000000000,appBytes:1000})});
if(input.mode==='authorization')journal.signAuthorization('D0:fund:0:ask',()=>process.kill(process.pid,'SIGKILL'));
else journal.sign('buffer:create',{expectedVersion:journal.get('buffer:create').version,afterFence:()=>process.kill(process.pid,'SIGKILL'),signExact:()=>{throw Error('SIGNER_MUST_NOT_RUN');}});
process.exitCode=99;
