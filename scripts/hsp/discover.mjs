// Explicit read-only HSP discovery. No endpoint contact until allowlisting confirmed.
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {connectHsp} from '../../packages/hsp/mcp.mjs';
const out=resolve('local-state/hsk-hsp/discovery');mkdirSync(out,{recursive:true,mode:0o700});
const hsp=await connectHsp({allowlisted:process.env.AXP_HSP_QA_ALLOWLIST_CONFIRMED==='1'});
try{const configuration=await hsp.call('get_chain_config',{});writeFileSync(resolve(out,'schemas.json'),JSON.stringify({fingerprint:hsp.fingerprint,tools:hsp.tools,configuration},null,2),{mode:0o600});console.log('Captured live schemas and configuration in private local state. Review mappings before enabling live payments.');}finally{await hsp.close();}
