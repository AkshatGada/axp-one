import {randomBytes} from 'node:crypto';
import {ContractError,hash} from '../contracts/index.mjs';

export const PUBLISHER_SCOPES=Object.freeze(['opportunities:write','opportunities:read','delivery:write','delivery:read']);
/** One publisher per isolated workspace. Only hashes enter the durable ledger. */
export function publisherCredentials({exchange,publisherId,initialKey,now=Date.now}) {
  exchange.db.exec('CREATE TABLE IF NOT EXISTS product_publisher_keys(run TEXT NOT NULL,id TEXT NOT NULL,data TEXT NOT NULL,PRIMARY KEY(run,id))');
  const validateScopes=scopes=>{
    if(!Array.isArray(scopes)||!scopes.length||new Set(scopes).size!==scopes.length||scopes.some(s=>!PUBLISHER_SCOPES.includes(s)))throw new ContractError('publisher_scopes_invalid');
    return [...scopes].sort();
  };
  function issue({label='publisher integration',scopes=PUBLISHER_SCOPES,key=randomBytes(32).toString('hex')}={}) {
    if(typeof label!=='string'||!label.trim()||label.length>120)throw new ContractError('publisher_label_invalid');
    const keyId=`pubkey-${hash(key).slice(0,24)}`,record={id:keyId,publisherId,label:label.trim(),keyHash:hash(key),scopes:validateScopes(scopes),createdAt:now(),revokedAt:null};
    if(exchange.get('product_publisher_keys',keyId))throw new ContractError('publisher_key_exists');
    exchange.tx(()=>exchange.put('product_publisher_keys',keyId,record));
    return {apiKey:key,keyId,publisherId,scopes:record.scopes};
  }
  if(!exchange.all('product_publisher_keys').length&&initialKey)issue({key:initialKey,label:'initial operator key'});
  function authenticate(key,scope) {
    if(typeof key!=='string'||!key)return false;
    const record=exchange.get('product_publisher_keys',`pubkey-${hash(key).slice(0,24)}`);
    return !!record&&record.keyHash===hash(key)&&record.publisherId===publisherId&&record.revokedAt===null&&(!scope||record.scopes.includes(scope));
  }
  function revoke(keyId) {
    const record=exchange.require('product_publisher_keys',keyId);
    if(record.publisherId!==publisherId)throw new ContractError('publisher_key_invalid');
    if(record.revokedAt===null){record.revokedAt=now();exchange.tx(()=>exchange.put('product_publisher_keys',keyId,record));}
    return {keyId,revoked:true};
  }
  function rotate(keyId,options={}) {
    const old=exchange.require('product_publisher_keys',keyId);
    if(old.publisherId!==publisherId||old.revokedAt!==null)throw new ContractError('publisher_key_invalid');
    // The outer SQLite transaction ensures no gap between issuance and revocation.
    let result;
    exchange.db.exec('BEGIN IMMEDIATE');
    try {
      const key=randomBytes(32).toString('hex'),id=`pubkey-${hash(key).slice(0,24)}`;
      const record={...old,id,keyHash:hash(key),createdAt:now(),revokedAt:null,label:options.label??old.label,scopes:validateScopes(options.scopes??old.scopes)};
      if(typeof record.label!=='string'||!record.label.trim()||record.label.length>120)throw new ContractError('publisher_label_invalid');
      exchange.put('product_publisher_keys',id,record);exchange.put('product_publisher_keys',old.id,{...old,revokedAt:now()});
      result={apiKey:key,keyId:id,publisherId,scopes:record.scopes};exchange.db.exec('COMMIT');
    }catch(e){exchange.db.exec('ROLLBACK');throw e;}
    return result;
  }
  return {authenticate,issue,revoke,rotate,list:()=>exchange.all('product_publisher_keys').map(({keyHash,...record})=>record)};
}
