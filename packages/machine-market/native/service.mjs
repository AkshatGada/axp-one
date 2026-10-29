/** Minimal W6 local service. Async RPC/signing orchestration is outside store transactions. */
import {canonical} from '../../contracts/index.mjs';
import {timingSafeEqual} from 'node:crypto';
import {reject,NativeError,strict,hex32,publicKeyBytes,decimal,ACCOUNT_SCHEMAS,encodeInstruction} from './codec.mjs';
import {domainHash,verifyAuthorization,operationId,deriveMatchPda} from './domain.mjs';
import {buildLegacyMessage} from './transaction.mjs';
import {createNativeObserver,validateNativeAccount} from './observations.mjs';
import {createDeliveryCoordinator} from './delivery.mjs';
import {localEndpoint} from './rpc.mjs';
const idkey=key=>{if(typeof key!=='string'||!key||key.length>128||/[\x00-\x1f\x7f]/.test(key))reject('INVALID_INPUT');};
function envelope(value){strict(value,['authorization','signature','idempotencyKey']);idkey(value.idempotencyKey);return value;}
function safeOperation(op){return {id:op.id,type:op.type,state:op.state,version:op.version,lastObservedSlot:op.lastObservedSlot??'0',unit:op.unit??op.accounts?.unit??null,signature:op.attempt?.signature??null,evidence:op.evidence??null,facts:op.facts??null};}
export function createNativeService({run,rpc,store,signers,operatorToken,repository,observer=createNativeObserver({rpc,run})}={}){
 const outbox=store?.native;if(!outbox||typeof outbox.get!=='function'||typeof operatorToken!=='string'||operatorToken.length<32||operatorToken.length>256)reject('INVALID_INPUT');
 const domain=domainHash(run);const actors=[run.issuer,run.buyerA,run.buyerB,run.sponsor];
 // Only identical authenticated in-flight orders share admission. Every HTTP key
 // still binds through the store; conflicting bytes never bypass its guards.
 const orderAdmissions=new Map();
 function orderProjection(order){
  const match=order.matchId?store.getMatch(order.matchId):null;
  const reserved=order.state==='Open'?{ownerType:'order',ownerId:order.id,amount:order.side===0?order.limit:'0',unit:order.side===1?order.exactUnit:null}:order.state==='Reserved'&&match?{ownerType:'match',ownerId:match.id,amount:match.gross,unit:match.unit}:null;
  return {orderId:order.id,state:order.state,version:order.version,sequence:order.sequence,actor:order.actor,kind:order.kind,side:order.side??null,lane:order.lane??null,refundFace:order.refundFace??null,exactUnit:order.exactUnit??null,validUntilSlot:order.validUntilSlot??null,series:order.series,limit:order.limit??order.amount,matchId:order.matchId??null,operationId:match?.operationId??null,reservation:reserved,...(match?{pricingProvenance:match.pricingProvenance}:{})};
 }
 function operationProjection(op){let evidence=null;try{evidence=typeof outbox.getEvidence==='function'?outbox.getEvidence(op.id):null;}catch(error){if(error.code!=='INVALID_INPUT')throw error;}return {...safeOperation(op),evidence:evidence?.evidence??null,observedSlot:evidence?.contextSlot??null,nativeEvidence:evidence?.status==='success',operatingFeesKnown:evidence?.operatingFeesKnown===true};}
 async function walletContext(key){
  const captured=store.captureWallet(key);const view=await rpc.accounts([key],{minContextSlot:captured.contextSlot??captured.watermark??'0'});const a=view.accounts[0];
  if(a.missing||a.owner!=='11111111111111111111111111111111'||a.executable||a.data.length)reject('RECIPIENT_STATE');
  const rent=await rpc.rentForLength(0);store.observeWallet({key,balance:a.lamports,rent,contextSlot:view.contextSlot,expectedVersion:captured.walletStateVersion});return store.captureWallet(key);
 }
 function maybeNative(id){try{return outbox.get(id);}catch(error){if(error.code==='INVALID_INPUT')return null;throw error;}}
 function typedOperation(id){
  const existing=maybeNative(id);if(existing)return existing;
  const op=store.getOperation(id);if(op.instruction.type!=='Fund'||!Array.isArray(op.semanticKeys)||op.semanticKeys.length!==11)reject('INVALID_INPUT');
  const roles=['market','series','unit','payer','beneficiary','seller','matcher','collector','buyUse','sellUse','primaryMatch'];
  const accounts={...Object.fromEntries(roles.slice(0,op.instruction.fundingKind===1?11:10).map((name,index)=>[name,op.semanticKeys[index]])),match:deriveMatchPda({...run,matchId:op.instruction.matchId}).address};return {...op,accounts};
 }
 async function signingContext(op){
  if(typeof store.captureWallet!=='function')return {...(op.context??{})};
  const payer=op.feePayer??run.matcher,walletKeys=[...new Set([payer,...(op.instruction.type==='Fund'?[op.accounts.payer]:[])])],captures=new Map(walletKeys.map(key=>[key,store.captureWallet(key)]));
  let watermark=BigInt(op.contextSlot??'0');for(const capture of captures.values())if(BigInt(capture.contextSlot)>watermark)watermark=BigInt(capture.contextSlot);
  const addresses=[...new Set([run.market,...Object.values(op.accounts),...walletKeys].filter(key=>key!=='11111111111111111111111111111111'))];
  const view=await rpc.accounts(addresses,{minContextSlot:watermark.toString()}),byKey=new Map(view.accounts.map(account=>[account.address,account]));
  if(op.instruction.type!=='Init')validateNativeAccount(byKey.get(run.market),run,{kind:'Market'});
  if(op.accounts.unit&&!['RegisterUnit'].includes(op.instruction.type)){
   const unit=validateNativeAccount(byKey.get(op.accounts.unit),run,{kind:'Unit'}),i=op.instruction,a=op.accounts;if(!unit)reject('RUN_MISMATCH');
   const expected=i.type==='Fund'||i.type==='StartDelivery'||i.type==='ExpireUnused'?i.expectedCursor:i.expectedLockedCursor;
   if(unit.cursor!==expected||unit.series!==a.series)reject('STALE_CURSOR');
   if(i.type==='Fund'&&(unit.state!==(i.fundingKind===1?1:0)||unit.owner!==a.seller)||i.type==='StartDelivery'&&(unit.state!==1||unit.owner!==a.owner)||['FinalizeDelivery','RefundFailure','TimeoutRefund'].includes(i.type)&&(unit.state!==2||unit.requestHash!==i.requestHash)||i.type==='ExpireUnused'&&unit.state!==1)reject('PENDING_SETTLEMENT');
   const series=validateNativeAccount(byKey.get(a.series),run,{kind:'Series'});if(!series)reject('RUN_MISMATCH');
   if(i.type==='Fund')for(const role of ['match','buyUse','sellUse']){const account=byKey.get(a[role]);if(!account.missing)reject('PREFUNDED_PDA_UNSUPPORTED');}
  }
  const rent=await rpc.rentForLength(0);for(const role of ['payer','beneficiary','seller','collector','issuer','gateway','owner','caller'])if(op.accounts[role]){const account=byKey.get(op.accounts[role]);if(account.missing||account.owner!=='11111111111111111111111111111111'||account.executable||account.data.length)reject('RECIPIENT_STATE');}
  for(const key of walletKeys){const account=byKey.get(key),captured=captures.get(key);if(account.missing||account.owner!=='11111111111111111111111111111111'||account.executable||account.data.length)reject('RECIPIENT_STATE');store.observeWallet({key,balance:account.lamports,rent,contextSlot:view.contextSlot,expectedVersion:captured.walletStateVersion});}
  return {...(op.context??{}),operatorContext:store.captureWallet(payer),...(op.instruction.type==='Fund'?{walletContext:store.captureWallet(op.accounts.payer)}:{})};
 }
 async function prepare({instruction,accounts,context={},feePayer=run.matcher}){
  const old=maybeNative(instruction.operationId);if(old){if(!encodeInstruction(old.instruction).equals(encodeInstruction(instruction))||JSON.stringify(Object.entries(old.accounts).sort())!==JSON.stringify(Object.entries(accounts).sort())||old.feePayer!==feePayer)reject('NONCE_CONFLICT');return old;}
  await rpc.inspectRun({requireMarket:instruction.type!=='Init'});
  const latest=await rpc.latestBlockhash();const built=buildLegacyMessage({program:run.program,feePayer,blockhash:latest.blockhash,instruction,accounts});const feeQuote=await rpc.feeForMessage(built.message);
  if(BigInt(feeQuote.fee)>100000n)reject('CAPACITY');
  const lengths={Init:[393],IssueSeries:[229],RegisterUnit:[383],Fund:[619,178,178]}[instruction.type]??[];
  let rent=0n;for(const length of lengths)rent+=BigInt(await rpc.rentForLength(length));
  return outbox.prepare({instruction,accounts,feePayer,blockhash:latest.blockhash,lastValidBlockHeight:latest.lastValidBlockHeight,feeReserve:feeQuote.fee,rentReserve:rent.toString(),contextSlot:latest.contextSlot,context});
 }
 async function admitOperation(value){
  const {type,id,accounts,contextSlot,...fields}=value;if(fields.idempotencyKey&&typeof store.bindRequest==='function')store.bindRequest({actor:run.gateway,idempotencyKey:fields.idempotencyKey,purpose:'delivery-process',requestBytes:Buffer.from(canonical({unit:fields.unit,requestHash:fields.requestHash})),operationId:id});const instruction={type,operationId:id};
  const names={StartDelivery:['expectedCursor','requestNonce','requestHash'],FinalizeDelivery:['expectedLockedCursor','requestHash','responseHash'],RefundFailure:['expectedLockedCursor','requestHash'],TimeoutRefund:['expectedLockedCursor','requestHash'],ExpireUnused:['expectedCursor']}[type];if(!names)reject('INVALID_INPUT');
  for(const name of names)instruction[name]=fields[name];
  return prepare({instruction,accounts,context:{contextSlot,...(fields.context??{}),idempotencyKey:fields.idempotencyKey}});
 }
 async function reconcile(id){
  hex32(id);const op=outbox.get(id);if(!op?.attempt)reject('PENDING_SETTLEMENT');const observed=await observer.observeFinalized(op);
  const prior=typeof outbox.getEvidence==='function'?outbox.getEvidence(id):null;if(op.state==='ResolvedSuccess'&&!op.blocked&&prior?.operatingFeesKnown===true&&observed.status==='success'&&!observed.feeKnown)return op;
  const status=observed.status==='superseded'?(observed.proof?.state==='Refunded'?'superseded-refund':'unknown'):observed.status;
  const wire=value=>value?Object.fromEntries(['kind','state','market',...ACCOUNT_SCHEMAS[value.kind].fields.map(([name])=>name)].map(name=>[name,value[name]])):null;
  const nativeAccount=address=>observed.accounts.find(a=>a.address===address)?.decoded;
  const registerRole={Init:'market',IssueSeries:'series',RegisterUnit:'unit'}[op.instruction.type];
  const rent=observed.wallets.length?await rpc.rentForLength(0):'0';
  const facts={verified:true,operationId:id,exactFailedTransaction:observed.status==='failure'&&observed.evidence==='transaction-finalized',fundedMatchAbsent:op.instruction.type==='Fund'&&observed.accounts.some(a=>a.address===op.accounts.match&&a.missing),accountOwner:run.program,account:registerRole?wire(nativeAccount(op.accounts[registerRole])):null,unitOwner:run.program,unit:wire(observed.proof?.unit),receiptOwner:run.program,receipt:wire(observed.proof?.match),orderUses:observed.proof?.buyUse?[wire(observed.proof.buyUse),wire(observed.proof.sellUse)]:[],primaryMatch:wire(observed.proof?.primaryMatch),terminalOperationId:observed.proof?.terminalOperationId??null,operatingCost:observed.operatingCost,wallets:observed.wallets.map(w=>({...w,rent})),transactionSlot:observed.transactionSlot,economicReplay:observed.effects?.economicReplay??null};
  return outbox.observe(id,{expectedVersion:op.version,contextSlot:observed.contextSlot,status,evidence:observed.evidence,...(observed.signature?{signature:observed.signature}:{}),facts,operatingFeesKnown:observed.feeKnown});
 }
 async function send(op,{reconciliationVersion}={}){
  const height=await rpc.blockHeight();outbox.markSend(op.id,{expectedVersion:op.version,blockHeight:height,...(reconciliationVersion!==undefined?{reconciliationVersion}:{})});
  try{await rpc.sendPersisted(outbox.get(op.id),{assertPersisted:operation=>outbox.assertPersisted(operation)});const sent=outbox.get(op.id);outbox.markSubmitted(op.id,{expectedVersion:sent.version});}catch(error){const current=outbox.get(op.id);outbox.observe(op.id,{expectedVersion:current.version,contextSlot:current.lastObservedSlot??'0',status:'unknown',evidence:'account-state-only',operatingFeesKnown:false});throw error;}
  return reconcile(op.id);
 }
 async function executeOperation(id){
  let op=typedOperation(id);if(op.attempt||['Signing','Quarantined','Unknown','Submitted','ResolvedSuccess','ResolvedFailure'].includes(op.state))return op;
  const otherUnresolved=outbox.listUnresolved().some(value=>value.id!==id&&(value.attempt||value.fenceToken||value.blocked));if(otherUnresolved)reject('PENDING_SETTLEMENT');
  const context=await signingContext(op);
  if(!maybeNative(id))op=await prepare({instruction:op.instruction,accounts:op.accounts,context});
  await rpc.inspectRun({requireMarket:op.instruction.type!=='Init'});const currentSlot=await rpc.slot();op=outbox.sign(id,{expectedVersion:op.version,currentSlot,context,signers});return send(op);
 }
 const delivery=repository?createDeliveryCoordinator({run,rpc,repository,privateStore:store,admitOperation,executeOperation}):null;
 const requireDelivery=()=>delivery??reject('INVALID_INPUT');
 const service={
  authorizeOperator(token){if(typeof token!=='string'||Buffer.byteLength(token)!==Buffer.byteLength(operatorToken)||!timingSafeEqual(Buffer.from(token),Buffer.from(operatorToken)))reject('INVALID_AUTH');},
  health(){return {ok:true,mode:'local-solana-validator',genesis:run.genesis,program:run.program,market:run.market,authority:'local-service-configuration',nativeEvidence:false};},
  getOrder(id){hex32(id);return orderProjection(store.getOrder(id));},
  getOperation(id){hex32(id);return operationProjection(maybeNative(id)??store.getOperation(id));},
  getUnit(address){publicKeyBytes(address);return store.getUnit(address);},
  getMatch(id){hex32(id);const m=store.getMatch(id),op=service.getOperation(m.operationId);return {id:m.id,state:m.state,unit:m.unit,series:m.series,payer:m.payer,beneficiary:m.beneficiary,seller:m.seller,buyOrderId:m.buyOrderId,sellOrderId:m.sellOrderId,gross:m.gross,fee:m.fee,fundingKind:m.fundingKind,originalPrimaryRefundFace:m.refundFace,pricingProvenance:m.pricingProvenance,expectedSecondaryProceeds:m.fundingKind===1?(BigInt(m.gross)-BigInt(m.fee)).toString():'0',immediateSecondaryProceeds:m.fundingKind===1&&m.state==='SecondarySettled'?(BigInt(m.gross)-BigInt(m.fee)).toString():'0',operationId:m.operationId,signature:op.signature,nativeEvidence:op.nativeEvidence,operatingFeesKnown:op.operatingFeesKnown,evidence:op.evidence};},
  book(series){publicKeyBytes(series);const all=actors.flatMap(actor=>store.projectActor(actor).orders);const orders=[...new Map(all.filter(o=>o.series===series&&o.state==='Open').map(o=>[o.id,o])).values()];orders.sort((a,b)=>a.side-b.side||(a.limit===b.limit?a.sequence-b.sequence:a.side===0?(BigInt(a.limit)>BigInt(b.limit)?-1:1):(BigInt(a.limit)<BigInt(b.limit)?-1:1)));return {mode:'local-solana-validator',genesis:run.genesis,series,orders:orders.map(orderProjection)};},
  async orders(value){
   envelope(value);const auth=verifyAuthorization({...value,domain,allowedActors:actors,kind:'BookOrder'}),identity=auth.value.actor+':'+auth.value.nonce,existing=orderAdmissions.get(identity);
   if(existing){
    if(existing.authHash!==auth.authHash)reject('NONCE_CONFLICT');
    await existing.promise;
    // Admission is already durable. Re-authenticate/bind this HTTP key in the same
    // store transaction; exact nonce reuse returns one order without another hold.
    const result=store.admitAuthorization(value,{currentSlot:await rpc.slot()});
    return orderProjection(store.getOrder(result.id??result.orderId));
   }
   const pending={authHash:auth.authHash,promise:null};
   pending.promise=(async()=>{const context=auth.value.side===0?await walletContext(auth.value.actor):undefined;const result=store.admitAuthorization(value,{currentSlot:await rpc.slot(),walletContext:context});const operationId=result.operationId??(result.matchId?store.getMatch(result.matchId).operationId:null);if(operationId)await executeOperation(operationId);return orderProjection(store.getOrder(result.id??result.orderId));})();
   orderAdmissions.set(identity,pending);
   try{return await pending.promise;}finally{if(orderAdmissions.get(identity)===pending)orderAdmissions.delete(identity);}
  },
  async cancel(value){envelope(value);return orderProjection(store.cancelUnsigned(value,{currentSlot:await rpc.slot()}));},
  async campaign(value){envelope(value);return store.admitCampaign(value,{currentSlot:await rpc.slot()});},
  async sponsored(value){strict(value,['consentEnvelope','issuerEnvelope']);envelope(value.consentEnvelope);envelope(value.issuerEnvelope);const auth=verifyAuthorization({...value.consentEnvelope,domain,kind:'SponsoredConsent',allowedActors:[run.buyerA,run.buyerB]});const result=store.sponsorAccess({...value,currentSlot:await rpc.slot(),walletContext:await walletContext(auth.value.sponsor)});const operationId=result.operationId??(result.matchId?store.getMatch(result.matchId).operationId:null);if(operationId)await executeOperation(operationId);return orderProjection(store.getOrder(result.id??result.orderId));},
  async startDelivery(value){envelope(value);const currentSlot=await rpc.slot();const auth=verifyAuthorization({...value,domain,kind:'DeliveryRequest',currentSlot});const a=auth.value,id=operationId({domain,type:'StartDelivery',unit:a.unit,requestHash:auth.authHash});if(typeof store.bindRequest!=='function')reject('RUN_MISMATCH');store.bindRequest({actor:a.actor,idempotencyKey:value.idempotencyKey,purpose:'delivery-start',requestBytes:auth.bytes,operationId:id});const admitted=await prepare({instruction:{type:'StartDelivery',operationId:id,expectedCursor:a.expectedCursor,requestNonce:a.nonce,requestHash:auth.authHash},accounts:{owner:a.actor,market:run.market,series:a.series,unit:a.unit},context:{authorization:value,currentSlot}});await executeOperation(admitted.id);return {status:'pending',operationId:admitted.id};},
  async processDelivery(input){strict(input,['unit','requestHash','idempotencyKey']);publicKeyBytes(input.unit);hex32(input.requestHash);idkey(input.idempotencyKey);if(typeof store.bindRequest!=='function')reject('RUN_MISMATCH');const binding=store.bindRequest({actor:run.gateway,idempotencyKey:input.idempotencyKey,purpose:'delivery-process',requestBytes:Buffer.from(canonical({unit:input.unit,requestHash:input.requestHash})),operationId:null});if(binding.operationId){const old=maybeNative(binding.operationId);if(old&&['ResolvedSuccess','ResolvedFailure','SupersededByRefund'].includes(old.state))return operationProjection(old);}return operationProjection(await requireDelivery().process(input));},
  async readDelivery(value){envelope(value);const result=await requireDelivery().read(value);return {response:result.response,responseBase64:result.bytes.toString('base64'),responseHash:result.responseHash,nativeReceipt:{evidence:'account-state-only',state:'Consumed',unit:result.response.unit,responseHash:result.responseHash}};},
  async reconcile(id){return operationProjection(await reconcile(id));},
  async resend(id){await reconcile(id);const op=outbox.get(id);if(['ResolvedSuccess','ResolvedFailure','SupersededByRefund'].includes(op.state))return operationProjection(op);const valid=await rpc.blockhashValid(op.attempt.blockhash);if(!valid.valid)reject('PENDING_SETTLEMENT');return operationProjection(await send(op,{reconciliationVersion:op.version}));},
  // Internal typed operator/harness methods; deliberately absent from HTTP routes.
  prepare,executeOperation,monitorDeliveries:input=>requireDelivery().monitor(input),
 };
 return Object.freeze(service);
}

function json(res,status,value){const bytes=Buffer.from(JSON.stringify(value));if(bytes.length>196608)reject('CAPACITY');res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Content-Length':bytes.length,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Cross-Origin-Resource-Policy':'same-origin'});res.end(bytes);}
async function readBody(req){if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type']??''))reject('INVALID_INPUT');if(Number(req.headers['content-length']??'0')>8192)reject('CAPACITY');const chunks=[];let size=0;const timer=setTimeout(()=>req.destroy(),5000);timer.unref?.();try{for await(const chunk of req){size+=chunk.length;if(size>8192)reject('CAPACITY');chunks.push(chunk);}let value;try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));}catch{reject('INVALID_INPUT');}if(!value||Object.getPrototypeOf(value)!==Object.prototype)reject('INVALID_INPUT');return value;}finally{clearTimeout(timer);}}
export function createTradingHandler({service,origin}){
 origin=localEndpoint(origin);const authority=new URL(origin).host;
 return async function handler(req,res){try{
  const hostCount=req.rawHeaders.filter((_,index)=>index%2===0&&req.rawHeaders[index].toLowerCase()==='host').length;
  if(hostCount!==1||req.headers.host!==authority||Object.keys(req.headers).some(key=>key==='forwarded'||key.startsWith('x-forwarded-'))||req.headers.origin!==undefined&&req.headers.origin!==origin||req.headers['sec-fetch-site']&&!['same-origin','none'].includes(req.headers['sec-fetch-site']))reject('INVALID_AUTH');
  if(typeof req.url!=='string'||req.url.length>2048||!req.url.startsWith('/api/trading/')||/[\\#\x00-\x20]/.test(req.url)||/%2f|%5c|%2e/i.test(req.url)||req.url.includes('..'))reject('INVALID_INPUT');
  const url=new URL(req.url,origin),route=url.pathname.slice('/api/trading'.length);if(!['GET','POST'].includes(req.method))reject('INVALID_INPUT');
  if(req.method==='GET'){
   if(route==='/health'&&!url.search)return json(res,200,service.health());
   if(route==='/book'){if([...url.searchParams.keys()].join(',')!=='series')reject('INVALID_INPUT');return json(res,200,service.book(url.searchParams.get('series')));}
   if(url.search)reject('INVALID_INPUT');const match=/^\/(orders|operations|units|matches)\/([-a-zA-Z0-9]+)$/.exec(route);if(!match)reject('INVALID_INPUT');return json(res,200,service[{orders:'getOrder',operations:'getOperation',units:'getUnit',matches:'getMatch'}[match[1]]](match[2]));
  }
  if(url.search)reject('INVALID_INPUT');const body=await readBody(req);
  const operations=/^\/operations\/([0-9a-f]{64})\/(reconcile|resend)$/.exec(route);
  if(operations){strict(body,[]);service.authorizeOperator(req.headers['x-axp-local-operator']);return json(res,200,await service[operations[2]](operations[1]));}
  const methods={'/orders':'orders','/orders/cancel':'cancel','/campaigns':'campaign','/sponsored-access':'sponsored','/deliveries/start':'startDelivery','/deliveries/process':'processDelivery','/deliveries/read':'readDelivery'};
  const method=methods[route];if(!method)reject('INVALID_INPUT');if(route==='/deliveries/process'){strict(body,['unit','requestHash','idempotencyKey']);publicKeyBytes(body.unit);hex32(body.requestHash);idkey(body.idempotencyKey);service.authorizeOperator(req.headers['x-axp-local-operator']);}
  return json(res,route==='/deliveries/start'?202:200,await service[method](body));
 }catch(error){if(res.headersSent||res.destroyed){res.destroy();return;}const safe=error instanceof NativeError;json(res,safe?error.status:503,{code:safe?error.code:'RUN_MISMATCH'});}};
}
