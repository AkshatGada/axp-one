/** Rights deadlines begin after verified deployment, never during upload. */
import {existsSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {demand} from './legacy.mjs';
export const DEADLINE_POLICY='after-deployment-v1';
export function makeApplicationSeal({manifestHash,program,deploymentSignature,deploymentSlot,sealedAtSlot}){
 demand(/^[a-f0-9]{64}$/.test(manifestHash)&&typeof program==='string'&&typeof deploymentSignature==='string','APPLICATION_SEAL');
 for(const slot of [deploymentSlot,sealedAtSlot])demand(typeof slot==='string'&&/^[1-9][0-9]*$/.test(slot),'APPLICATION_SEAL');
 demand(BigInt(sealedAtSlot)>=BigInt(deploymentSlot),'APPLICATION_SEAL');
 return Object.freeze({schema:'axp.market.devnet.application-deadlines.v1',manifestHash,program,deploymentSignature,deploymentSlot,sealedAtSlot,useBySlot:String(BigInt(sealedAtSlot)+6000n),readValidUntilSlot:String(BigInt(sealedAtSlot)+10000n)});
}
export function validateApplicationSeal(value,{manifestHash,program}){
 const expected=makeApplicationSeal({...value,manifestHash,program});
 demand(value&&Object.keys(value).length===Object.keys(expected).length&&Object.entries(expected).every(([k,v])=>value[k]===v),'APPLICATION_SEAL');return expected;
}
export function assertRunNotClosed(filename){
 if(!existsSync(filename))return;const db=new DatabaseSync(filename,{readOnly:true});
 try{const row=db.prepare('SELECT state FROM actions WHERE id=?').get('buffer:close-aborted');demand(row?.state!=='FinalizedSuccess','RUN_ALREADY_CLOSED');}finally{db.close();}
}
