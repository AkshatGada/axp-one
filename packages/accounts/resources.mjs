import {createHash,randomBytes} from 'node:crypto';

export const APP_SCOPES=Object.freeze(['opportunities:write','opportunities:read','delivery:write','delivery:read']);
export const CAMPAIGN_CAPABILITIES=Object.freeze(['crypto_storage','hardware_wallet','offline_key_storage','mobile_software_wallet','ethereum','solana','travel_booking','expense_management','policy_enforcement','authentication','agent_identity','software_development','online_learning','project_management','design_tools','productivity','ecommerce']);
export const RESOURCE_LIMITS=Object.freeze({keyLifetimeMs:30*86400000,activeKeys:10,campaigns:100});
const fail=(code,status=400)=>{throw Object.assign(Error(code),{code,status});};
export function exactResource(value,fields) {
  if(!value||typeof value!=='object'||Array.isArray(value)||![Object.prototype,null].includes(Object.getPrototypeOf(value)))fail('invalid_input');
  if(Reflect.ownKeys(value).some(k=>!fields.includes(k)||!Object.getOwnPropertyDescriptor(value,k)?.enumerable||!Object.hasOwn(Object.getOwnPropertyDescriptor(value,k),'value')))fail('unknown_field');
  if(fields.some(k=>!Object.hasOwn(value,k)))fail('missing_field');
}
function text(value,max) {
  if(typeof value!=='string'||value.length>max||/[\u0000-\u001f\u007f]/u.test(value)||!value.trim())fail('invalid_input');
  return value.trim();
}
function list(value,max,allowed) {
  if(!Array.isArray(value)||value.length>max)fail('invalid_input');
  const result=Array.from(value,v=>text(v,400));
  if(new Set(result).size!==result.length||allowed&&result.some(v=>!allowed.includes(v)))fail('invalid_input');
  return result;
}
export function validateCampaignInput(value) {
  exactResource(value,['name','productDescription','approvedText','contextHints','declaredCapabilities','maxBidBaseUnits','budgetCapBaseUnits','settlementNetwork']);
  const result={name:text(value.name,120),productDescription:text(value.productDescription,1200),approvedText:text(value.approvedText,800),contextHints:list(value.contextHints,6),declaredCapabilities:list(value.declaredCapabilities,12,CAMPAIGN_CAPABILITIES)};
  const content=[result.productDescription,result.approvedText,...result.contextHints].join(' ');
  if(result.productDescription.length+result.approvedText.length+result.contextHints.join('').length>2400)fail('invalid_input');
  if(/[\w.+-]+@[\w.-]+\.[a-z]{2,}|apikey_[a-z0-9_]+|-----BEGIN .*PRIVATE KEY/iu.test(content))fail('private_content');
  for(const [key,max] of [['maxBidBaseUnits',4000n],['budgetCapBaseUnits',100000n]]) {
    const raw=value[key];if(typeof raw!=='string'||!/^[1-9][0-9]{0,5}$/.test(raw)||BigInt(raw)>max)fail('spend_limit_exceeded');result[key]=raw;
  }
  if(BigInt(result.maxBidBaseUnits)>BigInt(result.budgetCapBaseUnits))fail('spend_limit_exceeded');
  if(!['solana-devnet','tempo-testnet'].includes(value.settlementNetwork))fail('invalid_input');
  result.settlementNetwork=value.settlementNetwork;return result;
}
export function validateCredentialInput(value,{withHash=false}={}) {
  exactResource(value,withHash?['label','keyHash']:['label']);
  const result={label:text(value.label,120)};
  if(withHash){if(typeof value.keyHash!=='string'||!/^[a-f0-9]{64}$/.test(value.keyHash))fail('invalid_input');result.keyHash=value.keyHash;}
  return result;
}
export const appKeyHash=value=>createHash('sha256').update(value).digest('hex');
export function createAppKey() {const apiKey=`axp_app_${randomBytes(32).toString('hex')}`;return {apiKey,keyHash:appKeyHash(apiKey)};}
export function validAppKey(value) {return typeof value==='string'&&/^axp_app_[a-f0-9]{64}$/.test(value);}
