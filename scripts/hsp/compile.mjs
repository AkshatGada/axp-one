import {mkdirSync,writeFileSync} from 'node:fs';
import {compileRegistry} from '../../packages/hsp/evm.mjs';
const artifact=await compileRegistry();mkdirSync('local-state/hsk-hsp/contract',{recursive:true,mode:0o700});writeFileSync('local-state/hsk-hsp/contract/registry.json',JSON.stringify(artifact,null,2));console.log(JSON.stringify({compiler:artifact.compiler,sourceHash:artifact.sourceHash,compiled:true,deployed:false}));
