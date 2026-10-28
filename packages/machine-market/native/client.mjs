/** Compact client for existing loopback /api/trading contracts. Never loads signing keys. */
import {localEndpoint} from './rpc.mjs';
import {strict,publicKeyBytes,hex32,canonicalBase64,decodeAuthorization} from './codec.mjs';
export const SUBMISSIONS=Object.freeze({order:'/orders',cancel:'/orders/cancel',campaign:'/campaigns',sponsored:'/sponsored-access',start:'/deliveries/start',read:'/deliveries/read'});
export function inputError(code='INVALID_INPUT'){return Object.assign(Error(code),{code});}
function envelope(v){strict(v,['authorization','signature','idempotencyKey']);decodeAuthorization(canonicalBase64(v.authorization));canonicalBase64(v.signature,64);if(typeof v.idempotencyKey!=='string'||!v.idempotencyKey||v.idempotencyKey.length>128||/[\x00-\x1f\x7f]/.test(v.idempotencyKey))throw inputError();}
export function createTradingClient({origin='http://127.0.0.1:8799',fetchImpl=globalThis.fetch}={}){
 origin=localEndpoint(origin);
 async function request(route,body,operatorToken){
  const bytes=body===undefined?null:Buffer.from(JSON.stringify(body));if(bytes&&bytes.length>8192)throw inputError('CAPACITY');
  let response;try{response=await fetchImpl(origin+'/api/trading'+route,{method:bytes?'POST':'GET',redirect:'error',signal:AbortSignal.timeout(30000),headers:{origin,...(bytes?{'content-type':'application/json'}:{}),...(operatorToken?{'x-axp-local-operator':operatorToken}:{})},...(bytes?{body:bytes}: {})});}catch{throw inputError('SERVICE_UNAVAILABLE');}
  const reader=response.body?.getReader();if(!reader)throw inputError('SERVICE_RESPONSE');const chunks=[];let length=0;while(true){const {done,value}=await reader.read();if(done)break;length+=value.length;if(length>196608){await reader.cancel();throw inputError('CAPACITY');}chunks.push(value);}
  let value;try{value=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw inputError('SERVICE_RESPONSE');}if(!response.ok)throw inputError(/^[A-Z0-9_]{1,64}$/.test(value?.code??'')?value.code:'SERVICE_RESPONSE');
  return {mode:'native-service-projection',origin,authority:'response-from-configured-loopback-service',freshChainVerification:false,data:value};
 }
 return Object.freeze({origin,
  read(kind,id){if(kind==='health'){if(id!==undefined)throw inputError();return request('/health');}if(kind==='book'){publicKeyBytes(id);return request('/book?series='+encodeURIComponent(id));}const routes={unit:'units',order:'orders',match:'matches',operation:'operations'};if(!routes[kind])throw inputError();if(kind==='unit')publicKeyBytes(id);else hex32(id);return request('/'+routes[kind]+'/'+id);},
  submit(kind,body){if(!SUBMISSIONS[kind])throw inputError();if(kind==='sponsored'){strict(body,['consentEnvelope','issuerEnvelope']);envelope(body.consentEnvelope);envelope(body.issuerEnvelope);}else envelope(body);return request(SUBMISSIONS[kind],body);},
  operator(kind,{id,body={},token}={}){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{32,256}$/.test(token))throw inputError('OPERATOR_TOKEN_REQUIRED');if(kind==='process'){strict(body,['unit','requestHash','idempotencyKey']);publicKeyBytes(body.unit);hex32(body.requestHash);if(typeof body.idempotencyKey!=='string'||!body.idempotencyKey||body.idempotencyKey.length>128)throw inputError();return request('/deliveries/process',body,token);}if(!['reconcile','resend'].includes(kind))throw inputError();hex32(id);strict(body,[]);return request('/operations/'+id+'/'+kind,{},token);}
 });
}
