import {hash,ContractError,baseUnits} from '../contracts/index.mjs';
export const ENDPOINT='https://mcp-qa.hashkeymerchant.com/';
export const TOOLS=Object.freeze(['get_chain_config','create_order','get_order','prepare_payment','finalize_payment','estimate_fee','submit_payment','query_payment']);
export const LIMITS=Object.freeze({payments:3,principal:'3000000',perPayment:'1000000',fees:'3000000'});
export const check=(ok,code,status=409)=>{if(!ok)throw new ContractError(code,code,status);};
export const address=v=>typeof v==='string'&&/^0x[0-9a-fA-F]{40}$/.test(v)&&!/^0x0{40}$/i.test(v);
export const sameAddress=(a,b)=>address(a)&&address(b)&&a.toLowerCase()===b.toLowerCase();
export const txHash=v=>typeof v==='string'&&/^0x[0-9a-fA-F]{64}$/.test(v);
export function validateConfig(c){
 check(c?.network==='hsk-testnet'&&c.chainId===133&&c.decimals===6&&address(c.token)&&['eip3009','permit2'].includes(c.protocol),'hsp_configuration_invalid');
 check(typeof c.merchantName==='string'&&c.merchantName.trim().length>0&&c.merchantName.length<=100&&address(c.payer)&&address(c.payee)&&!sameAddress(c.payer,c.payee),'hsp_identity_invalid');
 check(typeof c.networkValue==='string'&&c.networkValue&&typeof c.coin==='string'&&c.coin,'hsp_configuration_invalid');
 if(c.protocol==='permit2')check(address(c.permit2)&&address(c.spender),'hsp_configuration_invalid');
 return Object.freeze({...c,configHash:hash(c)});
}
export function usd(raw){const n=baseUnits(raw);return `${n/1000000n}.${String(n%1000000n).padStart(6,'0')}`;}
export function schemaFingerprint(tools){return hash(TOOLS.map(name=>{const t=tools.find(t=>t.name===name);check(t?.inputSchema,'hsp_tool_missing',503);return {name,inputSchema:t.inputSchema,outputSchema:t.outputSchema??null};}));}
