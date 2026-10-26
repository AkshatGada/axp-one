/** Sole-writer relational reference model for Packet03. NOT native settlement. */
import { DatabaseSync } from 'node:sqlite';
import { openSync,closeSync,chmodSync,statSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { canonical } from '../../contracts/index.mjs';
import { reject,decimal,hex32,publicKeyBytes,canonicalBase64,encodeInstruction,ZERO_HASH,ZERO_KEY,strict } from './codec.mjs';
import { domainHash,orderId,unitId,matchId,operationId,seriesTermsHash,fundTermsHash,verifyAuthorization,effectiveRemaining,compatible,fee,sha256,deriveMarketPda,deriveSeriesPda,deriveUnitPda,deriveMatchPda,deriveOrderUsePda } from './domain.mjs';
const json=value=>canonical(value),parse=row=>row?JSON.parse(row.data):null;
const active=['Open','Reserved'];
const key=value=>{publicKeyBytes(value);return value;};
const slot=value=>decimal(value);
const PLUS=(a,b)=>(decimal(a)+decimal(b)).toString();
const MINUS=(a,b)=>{const n=decimal(a)-decimal(b);if(n<0n)reject('INSUFFICIENT_AVAILABLE');return n.toString();};
function int(value,min,max){if(!Number.isInteger(value)||value<min||value>max)reject('INVALID_INPUT');return value;}
function assertKey(value){if(typeof value!=='string'||!value.length||value.length>128||/[\x00-\x1f\x7f]/.test(value))reject('INVALID_INPUT');}

export function createTradingStore({filename=':memory:',run,recoverStaleLock=false}={}) {
  strict(run,['genesis','program','market','initializer','marketNonce','matcher','gateway','collector','issuer','buyerA','buyerB','sponsor']);
  run=Object.freeze(structuredClone(run));
  hex32(run.genesis);hex32(run.marketNonce);for(const [name,value] of Object.entries(run))if(!['genesis','marketNonce'].includes(name))key(value);
  const trading=[run.issuer,run.buyerA,run.buyerB,run.sponsor],operating=[run.initializer,run.matcher,run.gateway];
  if([...trading,...operating,run.collector].some(k=>[ZERO_KEY,run.program,run.market].includes(k))||run.program===ZERO_KEY)reject('INVALID_INPUT');
  if(new Set(trading).size!==4||trading.some(k=>operating.includes(k))||trading.includes(run.collector)||operating.includes(run.collector))reject('INVALID_INPUT');
  if(deriveMarketPda(run).address!==run.market)reject('RUN_MISMATCH');
  const domain=domainHash(run),runHash=sha256(Buffer.from(json(run))),token=randomUUID();
  if(typeof filename!=='string'||!filename.length)reject('INVALID_INPUT');
  if(filename!==':memory:'){const fd=openSync(filename,'a',0o600);closeSync(fd);chmodSync(filename,0o600);}
  const db=new DatabaseSync(filename);db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA fullfsync=ON; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA wal_autocheckpoint=64; PRAGMA journal_size_limit=1048576;');
  const pageSize=db.prepare('PRAGMA page_size').get().page_size;db.exec('PRAGMA max_page_count='+Math.floor(24*1024*1024/pageSize));
  db.exec(`CREATE TABLE IF NOT EXISTS settings(id INTEGER PRIMARY KEY CHECK(id=1),run_hash TEXT NOT NULL,domain TEXT NOT NULL,operator_unknown INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS writer(id INTEGER PRIMARY KEY CHECK(id=1),pid INTEGER NOT NULL,token TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS wallets(key TEXT PRIMARY KEY,balance TEXT NOT NULL,rent TEXT NOT NULL,watermark TEXT NOT NULL,version INTEGER NOT NULL,quarantined INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS series(address TEXT PRIMARY KEY,series_id TEXT NOT NULL UNIQUE,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS units(address TEXT PRIMARY KEY,series TEXT NOT NULL REFERENCES series(address),serial INTEGER NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL,UNIQUE(series,serial));
    CREATE TABLE IF NOT EXISTS authorizations(actor TEXT NOT NULL,nonce TEXT NOT NULL,auth_hash TEXT NOT NULL,kind TEXT NOT NULL,entity_id TEXT NOT NULL,PRIMARY KEY(actor,nonce));
    CREATE TABLE IF NOT EXISTS requests(actor TEXT NOT NULL,key TEXT NOT NULL,body_hash TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(actor,key));
    CREATE TABLE IF NOT EXISTS orders(sequence INTEGER PRIMARY KEY AUTOINCREMENT,id TEXT NOT NULL UNIQUE,actor TEXT NOT NULL,nonce TEXT NOT NULL,auth_hash TEXT NOT NULL,kind TEXT NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL,match_id TEXT,data TEXT NOT NULL,UNIQUE(actor,nonce));
    CREATE INDEX IF NOT EXISTS orders_state ON orders(state,sequence);
    CREATE TABLE IF NOT EXISTS matches(id TEXT PRIMARY KEY,unit TEXT NOT NULL REFERENCES units(address),state TEXT NOT NULL,version INTEGER NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS principal_holds(id TEXT PRIMARY KEY,payer TEXT NOT NULL REFERENCES wallets(key),amount TEXT NOT NULL,owner_type TEXT NOT NULL CHECK(owner_type IN ('order','match')),owner_id TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS unit_holds(unit TEXT PRIMARY KEY REFERENCES units(address),owner_type TEXT NOT NULL CHECK(owner_type IN ('order','match')),owner_id TEXT NOT NULL UNIQUE);
    CREATE TABLE IF NOT EXISTS campaigns(id TEXT PRIMARY KEY,sponsor TEXT NOT NULL,consumed_gross TEXT NOT NULL,consumed_count INTEGER NOT NULL,refunded_gross TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS campaign_reservations(match_id TEXT PRIMARY KEY REFERENCES matches(id),campaign_id TEXT NOT NULL REFERENCES campaigns(id),amount TEXT NOT NULL,state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS operations(id TEXT PRIMARY KEY,type TEXT NOT NULL,unit TEXT NOT NULL,state TEXT NOT NULL,version INTEGER NOT NULL,watermark TEXT NOT NULL,data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS signed_attempts(operation_id TEXT PRIMARY KEY REFERENCES operations(id),data TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS signing_barriers(operation_id TEXT PRIMARY KEY REFERENCES operations(id),state TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS operating_holds(operation_id TEXT PRIMARY KEY REFERENCES operations(id),amount TEXT NOT NULL,unknown INTEGER NOT NULL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS claims(unit TEXT PRIMARY KEY REFERENCES units(address),primary_match TEXT NOT NULL,face TEXT NOT NULL,state TEXT NOT NULL,owner TEXT NOT NULL,sponsor TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS events(sequence INTEGER PRIMARY KEY AUTOINCREMENT,type TEXT NOT NULL,entity_id TEXT NOT NULL,data TEXT NOT NULL);`);
  let closed=false;
  db.exec('BEGIN IMMEDIATE');
  try {
    const existing=db.prepare('SELECT * FROM settings WHERE id=1').get();if(existing&&existing.run_hash!==runHash)reject('RUN_MISMATCH');
    db.prepare('INSERT OR IGNORE INTO settings(id,run_hash,domain) VALUES(1,?,?)').run(runHash,domain);
    const owner=db.prepare('SELECT * FROM writer WHERE id=1').get();
    if(owner){let alive=true;try{process.kill(owner.pid,0);}catch(e){if(e.code==='ESRCH')alive=false;}if(alive||!recoverStaleLock)reject('RUN_MISMATCH');db.exec('DELETE FROM writer');}
    db.prepare('INSERT INTO writer VALUES(1,?,?)').run(process.pid,token);db.exec('COMMIT');
  } catch(e){try{db.exec('ROLLBACK');}catch{}db.close();throw e;}
  function checkpoint(){try{const c=db.prepare('PRAGMA wal_checkpoint(PASSIVE)').get();if(c.log===c.checkpointed)db.exec('PRAGMA wal_checkpoint(TRUNCATE)');}catch{}}
  function count(table,where=''){return Number(db.prepare('SELECT COUNT(*) AS n FROM '+table+(where?' WHERE '+where:'')).get().n);}
  function physical(){let main=0,wal=0;if(filename!==':memory:'){try{main=statSync(filename).size;}catch{}try{wal=statSync(filename+'-wal').size;}catch{}}return {main,wal};}
  function capacity(drain){
    const p=physical();if(p.wal>(drain?8:4)*1024*1024 || p.main+p.wal+1024*1024>32*1024*1024)reject('CAPACITY');
    if(count('series')>16||count('units')>64||count('orders')>256||count('orders',"state IN ('Open','Reserved')")>32||count('matches',"state IN ('Reserved','Signed','Unknown')")>8||count('campaigns')>16||count('operations')>1024||count('events')>(drain?4096:3072)||count('requests')>(drain?5120:4096))reject('CAPACITY');
    // 12 operation slots + permanent response/operation bytes per registered unit.
    if(count('units')*12+count('operations',"unit='' ")>1024)reject('CAPACITY');
    let bytes=count('units')*128*1024+count('orders',"state='Open'")*8192;
    bytes+=Number(db.prepare('SELECT COALESCE(SUM(length(CAST(result AS BLOB))),0) AS n FROM requests').get().n);
    for(const table of ['series','units','orders','matches','campaigns','operations','signed_attempts','events'])bytes+=Number(db.prepare('SELECT COALESCE(SUM(length(CAST(data AS BLOB))),0) AS n FROM '+table).get().n);
    if(bytes>(drain?16:12)*1024*1024)reject('CAPACITY');
  }
  function tx(fn,{drain=false}={}){
    if(closed)reject('RUN_MISMATCH');checkpoint();db.exec('BEGIN IMMEDIATE');
    try{if(db.prepare('SELECT token FROM writer WHERE id=1').get()?.token!==token)reject('RUN_MISMATCH');capacity(drain);const result=fn();capacity(drain);db.exec('COMMIT');checkpoint();return structuredClone(result);}catch(e){try{db.exec('ROLLBACK');}catch{}if(e.errcode===13)reject('CAPACITY');throw e;}
  }
  const row=(table,id,column='id')=>db.prepare('SELECT * FROM '+table+' WHERE '+column+'=?').get(id);
  const requireRow=(table,id,column='id')=>row(table,id,column)??reject('INVALID_INPUT');
  const series=address=>parse(requireRow('series',address,'address'));
  const unit=address=>{const r=requireRow('units',address,'address');return {...parse(r),version:r.version};};
  function order(id){const r=requireRow('orders',id);return {...parse(r),id:r.id,sequence:r.sequence,state:r.state,version:r.version,matchId:r.match_id};}
  function match(id){const r=requireRow('matches',id);return {...parse(r),state:r.state,version:r.version};}
  function operation(id){const r=requireRow('operations',id);return {...parse(r),state:r.state,version:r.version,lastObservedSlot:r.watermark,attempt:parse(row('signed_attempts',id,'operation_id'))};}
  function emit(type,entityId,data={}){if(Buffer.byteLength(json(data))>512)reject('CAPACITY');db.prepare('INSERT INTO events(type,entity_id,data) VALUES(?,?,?)').run(type,entityId,json(data));}
  function wallet(k){return requireRow('wallets',key(k),'key');}
  function bump(k){db.prepare('UPDATE wallets SET version=version+1 WHERE key=?').run(k);}
  function held(k){return db.prepare('SELECT amount FROM principal_holds WHERE payer=?').all(k).reduce((s,r)=>s+decimal(r.amount),0n);}
  function available(k){const w=wallet(k);return decimal(w.balance)-decimal(w.rent)-held(k);}
  function validateContext(k,context){const w=wallet(k);if(!context||context.walletStateVersion!==w.version||decimal(context.contextSlot)<decimal(w.watermark)||context.balance!==w.balance)reject('STALE_CURSOR');if(w.quarantined)reject('PENDING_SETTLEMENT');return w;}
  function hold(payer,amount,type,id){if(available(payer)<decimal(amount))reject('INSUFFICIENT_AVAILABLE');db.prepare('INSERT INTO principal_holds VALUES(?,?,?,?,?)').run(id,payer,amount,type,id);bump(payer);}
  function releaseHold(id){const h=row('principal_holds',id);if(h){db.prepare('DELETE FROM principal_holds WHERE id=?').run(id);bump(h.payer);}}
  function updateUnit(u){db.prepare('UPDATE units SET state=?,version=version+1,data=? WHERE address=?').run(u.state,json(u),u.address);}
  function orderState(id,state,matchId=null){db.prepare('UPDATE orders SET state=?,match_id=?,version=version+1 WHERE id=?').run(state,matchId,id);}
  function envelope(envelope,kind){strict(envelope,['authorization','signature','idempotencyKey']);assertKey(envelope.idempotencyKey);return verifyAuthorization({...envelope,domain,kind,allowedActors:[...trading,...operating,run.collector]});}
  function request(actor,key,bodyHash,fn){const old=db.prepare('SELECT * FROM requests WHERE actor=? AND key=?').get(actor,key);if(old){if(old.body_hash!==bodyHash)reject('NONCE_CONFLICT');return JSON.parse(old.result);}const result=fn();db.prepare('INSERT INTO requests VALUES(?,?,?,?)').run(actor,key,bodyHash,json(result));return result;}
  function nonce(auth,entityId){const old=db.prepare('SELECT * FROM authorizations WHERE actor=? AND nonce=?').get(auth.value.actor,auth.value.nonce);if(old){if(old.auth_hash!==auth.authHash||old.kind!==auth.value.kind)reject('NONCE_CONFLICT');return old.entity_id;}db.prepare('INSERT INTO authorizations VALUES(?,?,?,?,?)').run(auth.value.actor,auth.value.nonce,auth.authHash,auth.value.kind,entityId);return null;}
  function checkFresh(a,currentSlot){if(a.validUntilSlot!==undefined&&slot(currentSlot)>=slot(a.validUntilSlot))reject('EXPIRED');}
  function putOrder(auth){const a=auth.value;db.prepare('INSERT INTO orders(id,actor,nonce,auth_hash,kind,state,version,match_id,data) VALUES(?,?,?,?,?,?,1,NULL,?)').run(a.orderId,a.actor,a.nonce,auth.authHash,a.kind,'Open',json({...a,authHash:auth.authHash,authorization:auth.bytes.toString('base64')}));return order(a.orderId);}
  function validateOrder(a,currentSlot){
    const s=series(a.series);checkFresh(a,currentSlot);if(slot(currentSlot)>=slot(s.useBySlot))reject('EXPIRED');if(decimal(a.limit)===0n||decimal(a.limit)>1_000_000_000n)reject('INVALID_INPUT');
    if(a.side===0){if(![run.buyerA,run.buyerB].includes(a.actor))reject('INVALID_AUTH');if(a.lane===0)effectiveRemaining({series:s,unit:null,fundingKind:0,minRemainingAfter:a.minRemainingAfter});}
    else {const u=unit(a.exactUnit);if(u.series!==a.series||u.owner!==a.actor||u.cursor!==a.expectedCursor)reject('STALE_CURSOR');if(a.lane===0){if(a.actor!==run.issuer||u.state!=='IssuerOpen')reject('INCOMPATIBLE');}else {if(![run.buyerA,run.buyerB].includes(a.actor)||u.state!=='FundedOpen'||a.refundFace!==u.refundFace)reject('INCOMPATIBLE');effectiveRemaining({series:s,unit:u,fundingKind:1,minRemainingAfter:0});}}
  }
  function reserve(bid,ask,currentSlot,{sponsorCampaign=null}={}){
    const u=unit(ask.exactUnit),s=series(ask.series),kind=sponsorCampaign?2:bid.lane;
    if(bid.actor===ask.actor||(sponsorCampaign&&sponsorCampaign.sponsor===ask.actor))reject('SELF_TRADE');
    if(!sponsorCampaign&&!compatible({bid,ask,series:s,unit:u,currentSlot}))reject('INCOMPATIBLE');
    const payer=sponsorCampaign?.sponsor??bid.actor;
    if(wallet(payer).quarantined||db.prepare('SELECT operator_unknown FROM settings').get().operator_unknown)reject('PENDING_SETTLEMENT');
    const gross=sponsorCampaign?bid.amount:(bid.sequence<ask.sequence?bid.limit:ask.limit);
    const id=matchId({domain,buyOrderId:bid.id,sellOrderId:ask.id,unit:u.address,expectedCursor:u.cursor,gross,fundingKind:kind});
    const existing=row('matches',id);if(existing)return match(id);
    const principal=requireRow('principal_holds',bid.id),unitHold=requireRow('unit_holds',u.address,'unit');
    if(principal.owner_type!=='order'||principal.owner_id!==bid.id||unitHold.owner_type!=='order'||unitHold.owner_id!==ask.id)reject('PENDING_SETTLEMENT');
    db.prepare('UPDATE principal_holds SET id=?,owner_type=\'match\',owner_id=?,amount=? WHERE id=?').run(id,id,gross,bid.id);bump(payer);
    db.prepare('UPDATE unit_holds SET owner_type=\'match\',owner_id=? WHERE unit=?').run(id,u.address);
    orderState(bid.id,'Reserved',id);orderState(ask.id,'Reserved',id);
    const opId=operationId({domain,type:'FundMatch',matchId:id});
    const instruction={type:'Fund',operationId:opId,matchId:id,expectedCursor:u.cursor,buyNonce:bid.nonce,sellNonce:ask.nonce,buyAuthHash:bid.authHash,sellAuthHash:ask.authHash,gross,buyerLimit:sponsorCampaign?gross:bid.limit,sellerLimit:ask.limit,buyerValidUntil:bid.validUntilSlot,sellerValidUntil:ask.validUntilSlot,minRemainingAfter:sponsorCampaign?0:bid.minRemainingAfter,fundingKind:kind,expectedRefundFace:kind===1?u.refundFace:'0',packetHash:sponsorCampaign?bid.packetHash:ZERO_HASH,campaignId:sponsorCampaign?bid.campaignId:ZERO_HASH};
    const buyUse=deriveOrderUsePda({program:run.program,market:run.market,actor:bid.actor,nonce:bid.nonce}).address,sellUse=deriveOrderUsePda({program:run.program,market:run.market,actor:ask.actor,nonce:ask.nonce}).address;
    const keys=[run.market,s.address,u.address,payer,bid.actor,ask.actor,run.matcher,run.collector,buyUse,sellUse,kind===1?u.primaryMatch:ZERO_KEY],termsHash=fundTermsHash(instruction,keys);
    const data={id,unit:u.address,series:s.address,payer,beneficiary:bid.actor,seller:ask.actor,buyOrderId:bid.id,sellOrderId:ask.id,gross,fee:fee(gross),fundingKind:kind,refundFace:kind===1?u.refundFace:gross,expectedCursor:u.cursor,operationId:opId,termsHash,instruction,semanticKeys:keys,campaignId:sponsorCampaign?.campaignId??null,pricingProvenance:sponsorCampaign?'sponsored-fixed-price':'book-maker-price'};
    db.prepare('INSERT INTO matches VALUES(?,?,\'Reserved\',1,?)').run(id,u.address,json(data));
    const op={id:opId,type:'FundMatch',unit:u.address,matchIds:[id],sourceCursor:u.cursor,termsHash,instruction,semanticKeys:keys,reservationIds:[id,u.address]};
    db.prepare('INSERT INTO operations VALUES(?,?,?,\'Reserved\',1,\'0\',?)').run(opId,'FundMatch',u.address,json(op));
    if(sponsorCampaign)db.prepare('INSERT INTO campaign_reservations VALUES(?,?,?,\'Reserved\')').run(id,sponsorCampaign.campaignId,gross);
    emit('match-reserved',id,{operationId:opId,pricingProvenance:data.pricingProvenance});return match(id);
  }
  function tryMatch(incoming,currentSlot){
    const candidates=db.prepare("SELECT id FROM orders WHERE state='Open' AND id<>?").all(incoming.id).map(r=>order(r.id)).filter(other=>other.kind==='BookOrder'&&other.side!==incoming.side);
    const eligible=candidates.filter(other=>{const bid=incoming.side===0?incoming:other,ask=incoming.side===1?incoming:other;return compatible({bid,ask,series:series(ask.series),unit:unit(ask.exactUnit),currentSlot});});
    eligible.sort((a,b)=>{const x=decimal(a.limit),y=decimal(b.limit);return (x===y?0:(x<y?-1:1))*(incoming.side===0?1:-1)||a.sequence-b.sequence||a.id.localeCompare(b.id);});
    if(eligible.length){const other=eligible[0];reserve(incoming.side===0?incoming:other,incoming.side===1?incoming:other,currentSlot);}
    else if(incoming.tif===1){releaseHold(incoming.id);db.prepare("DELETE FROM unit_holds WHERE owner_type='order' AND owner_id=?").run(incoming.id);orderState(incoming.id,'NoFill');emit('ioc-no-fill',incoming.id);}
    return order(incoming.id);
  }
  function validateReserved(m,currentSlot,walletContext){
    const b=order(m.buyOrderId),a=order(m.sellOrderId),u=unit(m.unit),s=series(m.series);validateContext(m.payer,walletContext);if(available(m.payer)<0n)reject('INSUFFICIENT_AVAILABLE');
    if(slot(currentSlot)>=slot(s.useBySlot)||slot(currentSlot)>=slot(a.validUntilSlot)||slot(currentSlot)>=slot(b.validUntilSlot))reject('EXPIRED');
    if(u.cursor!==m.expectedCursor||u.owner!==m.seller||!['IssuerOpen','FundedOpen'].includes(u.state))reject('STALE_CURSOR');
    effectiveRemaining({series:s,unit:u,fundingKind:m.fundingKind,minRemainingAfter:m.instruction.minRemainingAfter});
    if(m.fundingKind===1&&(u.refundFace!==m.refundFace||!row('claims',u.address,'unit')||row('claims',u.address,'unit').state!=='Escrowed'))reject('INCOMPATIBLE');
    if(m.termsHash!==fundTermsHash(m.instruction,m.semanticKeys))reject('INVALID_AUTH');
    if(m.fundingKind===2){const c=campaign(m.campaignId);if(slot(currentSlot)>=slot(c.validUntilSlot)||b.packetHash!==c.packetHash||b.amount!==s.sponsoredPrice||b.campaignVersion!==c.version||b.sponsor!==c.sponsor||!c.eligibleKeys.slice(0,c.eligibleCount).includes(b.actor))reject('INCOMPATIBLE');}
  }
  function campaign(id){const r=requireRow('campaigns',id);const reserved=db.prepare("SELECT amount FROM campaign_reservations WHERE campaign_id=? AND state='Reserved'").all(id);return {...parse(r),consumedGross:r.consumed_gross,consumedCount:r.consumed_count,refundedGross:r.refunded_gross,activeReservedGross:reserved.reduce((s,r)=>s+decimal(r.amount),0n).toString(),activeReservedCount:reserved.length};}
  function applyWallets(values,contextSlot,expected){
    if(!Array.isArray(values)||new Set(values.map(v=>v.key)).size!==values.length)reject('INVALID_INPUT');
    for(const k of Object.keys(expected))if(!values.some(v=>v.key===k))reject('INVALID_INPUT');
    for(const v of values){strict(v,['key','balance','rent']);const w=wallet(v.key);decimal(v.balance);decimal(v.rent);if(slot(contextSlot)<slot(w.watermark))reject('STALE_CURSOR');if(Object.hasOwn(expected,v.key)&&decimal(v.balance)!==decimal(w.balance)+expected[v.key])reject('RECIPIENT_STATE');if(decimal(v.balance)<decimal(v.rent))reject('RECIPIENT_STATE');}
    for(const v of values)db.prepare('UPDATE wallets SET balance=?,rent=?,watermark=?,version=version+1 WHERE key=?').run(v.balance,v.rent,contextSlot,v.key);
  }
  function resolveCampaign(m,success){if(!m.campaignId)return;const r=row('campaign_reservations',m.id,'match_id');if(!r||r.state!=='Reserved')return;if(success){const c=campaign(m.campaignId);db.prepare('UPDATE campaigns SET consumed_gross=?,consumed_count=consumed_count+1 WHERE id=?').run(PLUS(c.consumedGross,m.gross),c.campaignId);}db.prepare('UPDATE campaign_reservations SET state=? WHERE match_id=?').run(success?'Consumed':'Released',m.id);}
  function refreshQuarantine(){db.exec("UPDATE wallets SET quarantined=0; UPDATE settings SET operator_unknown=0;");for(const r of db.prepare("SELECT data FROM matches WHERE state='Unknown'").all()){const m=parse(r);db.prepare('UPDATE wallets SET quarantined=1 WHERE key=?').run(m.payer);db.exec('UPDATE settings SET operator_unknown=1');}if(count('operating_holds','unknown=1'))db.exec('UPDATE settings SET operator_unknown=1');}
  const store={
    domain,
    observeWallet({key:k,balance,rent,contextSlot,expectedVersion}){return tx(()=>{key(k);decimal(balance);decimal(rent);decimal(contextSlot);if(![...trading,...operating,run.collector].includes(k)||decimal(balance)>10_000_000_000n||decimal(balance)<decimal(rent))reject('INVALID_INPUT');const w=row('wallets',k,'key');if(w&&(expectedVersion!==w.version||slot(contextSlot)<slot(w.watermark)))reject('STALE_CURSOR');if(!w&&expectedVersion!==0)reject('STALE_CURSOR');if(w)db.prepare('UPDATE wallets SET balance=?,rent=?,watermark=?,version=version+1 WHERE key=?').run(balance,rent,contextSlot,k);else db.prepare('INSERT INTO wallets VALUES(?,?,?,?,1,0)').run(k,balance,rent,contextSlot);return store.captureWallet(k);});},
    captureWallet(k){const w=wallet(k);return {key:k,balance:w.balance,rent:w.rent,contextSlot:w.watermark,walletStateVersion:w.version,held:held(k).toString(),available:available(k).toString(),quarantined:!!w.quarantined};},
    registerSeries(value){return tx(()=>{strict(value,['address','seriesId','issuer','resourceHash','versionHash','format','useBySlot','sponsoredPrice','cap','maxTransfers','transferable','contentBytes','currentSlot']);const {currentSlot,...s}=value;key(s.address);hex32(s.seriesId);hex32(s.resourceHash);hex32(s.versionHash);if(s.issuer!==run.issuer||deriveSeriesPda({...run,seriesId:s.seriesId}).address!==s.address)reject('INVALID_AUTH');int(s.format,0,3);int(s.cap,1,64);int(s.contentBytes,0,16384);if(slot(currentSlot)>=slot(s.useBySlot)||decimal(s.sponsoredPrice)===0n||decimal(s.sponsoredPrice)>1_000_000_000n)reject('INVALID_INPUT');s.termsHash=seriesTermsHash(s);const old=row('series',s.address,'address');if(old){if(old.data!==json(s))reject('NONCE_CONFLICT');return parse(old);}db.prepare('INSERT INTO series VALUES(?,?,?)').run(s.address,s.seriesId,json(s));emit('series-registered-reference',s.address);return s;});},
    registerUnit({address,series:seriesAddress,serial,currentSlot}){return tx(()=>{const s=series(seriesAddress);int(serial,0,s.cap-1);const id=unitId({series:seriesAddress,serial});if(deriveUnitPda({...run,unitId:id}).address!==address)reject('INVALID_AUTH');const old=row('units',address,'address');if(old){const u=parse(old);if(u.series!==seriesAddress||u.serial!==serial)reject('NONCE_CONFLICT');return unit(address);}if(slot(currentSlot)>=slot(s.useBySlot))reject('EXPIRED');if(serial!==count('units',"series='"+seriesAddress+"'"))reject('STALE_CURSOR');const u={address,series:seriesAddress,unitId:id,serial,state:'IssuerOpen',owner:run.issuer,cursor:'0',transferCount:0,sponsored:0,primaryMatch:ZERO_KEY,latestMatch:ZERO_KEY,refundFace:'0',sponsorRefundKey:ZERO_KEY};db.prepare('INSERT INTO units VALUES(?,?,?,\'IssuerOpen\',1,?)').run(address,seriesAddress,serial,json(u));emit('unit-registered-reference',address);return unit(address);});},
    admitAuthorization(env,{currentSlot,walletContext}={}){const auth=envelope(env,'BookOrder'),a=auth.value;return tx(()=>request(a.actor,env.idempotencyKey,auth.authHash,()=>{const prior=nonce(auth,a.orderId);if(prior)return order(prior);validateOrder(a,currentSlot);if(a.side===0){validateContext(a.actor,walletContext);hold(a.actor,a.limit,'order',a.orderId);}else{if(row('unit_holds',a.exactUnit,'unit'))reject('PENDING_SETTLEMENT');db.prepare("INSERT INTO unit_holds VALUES(?,'order',?)").run(a.exactUnit,a.orderId);}const o=putOrder(auth);emit('order-admitted',o.id);return tryMatch(o,currentSlot);}));},
    reserveMatch(orderId,{currentSlot,walletContext}={}){return tx(()=>{const o=order(orderId);if(o.state!=='Open'||o.tif!==0)reject('PENDING_SETTLEMENT');if(o.side===0)validateContext(o.actor,walletContext);return tryMatch(o,currentSlot);});},
    cancelUnsigned(env,{currentSlot}={}){const auth=envelope(env,'Cancel'),a=auth.value;return tx(()=>request(a.actor,env.idempotencyKey,auth.authHash,()=>{const prior=nonce(auth,a.originalOrderId);if(prior)return order(prior);const o=order(a.originalOrderId);if(o.actor!==a.actor||o.nonce!==a.originalNonce||o.authHash!==a.originalAuthHash)reject('INVALID_AUTH');if(o.state==='Reserved'||(o.matchId&&row('signed_attempts',operationId({domain,type:'FundMatch',matchId:o.matchId}),'operation_id')))reject('PENDING_SETTLEMENT');if(o.version!==Number(decimal(a.expectedOrderVersion)))reject('STALE_CURSOR');if(o.state!=='Open')reject('ALREADY_USED');releaseHold(o.id);db.prepare("DELETE FROM unit_holds WHERE owner_type='order' AND owner_id=?").run(o.id);orderState(o.id,'Cancelled');emit('order-cancelled',o.id);return order(o.id);}),{drain:true});},
    expireOrders({currentSlot}){return tx(()=>{let n=0;for(const r of db.prepare("SELECT id FROM orders WHERE state='Open'").all()){const o=order(r.id);if(slot(currentSlot)>=slot(o.validUntilSlot)||slot(currentSlot)>=slot(series(o.series).useBySlot)){releaseHold(o.id);db.prepare("DELETE FROM unit_holds WHERE owner_type='order' AND owner_id=?").run(o.id);orderState(o.id,'Expired');n++;}}if(n)emit('orders-expired','book',{count:n});return {expired:n};},{drain:true});},
    admitCampaign(env,{currentSlot}={}){const auth=envelope(env,'SponsorMandate'),a=auth.value;return tx(()=>request(a.actor,env.idempotencyKey,auth.authHash,()=>{const prior=nonce(auth,a.campaignId);if(prior)return campaign(prior);if(a.actor!==run.sponsor||a.eligibleKeys.slice(0,a.eligibleCount).some(k=>![run.buyerA,run.buyerB].includes(k)))reject('INVALID_AUTH');checkFresh(a,currentSlot);const s=series(a.series);if(decimal(a.budget)===0n||decimal(a.perGrant)===0n||decimal(a.perGrant)>decimal(a.budget)||decimal(a.perGrant)>1_000_000_000n||slot(a.validUntilSlot)>slot(s.useBySlot))reject('INVALID_INPUT');if(row('campaigns',a.campaignId))reject('NONCE_CONFLICT');const c={...a,sponsor:a.actor,authHash:auth.authHash};db.prepare("INSERT INTO campaigns VALUES(?,?, '0',0,'0',?)").run(a.campaignId,a.actor,json(c));emit('campaign-admitted',a.campaignId);return campaign(a.campaignId);}));},
    sponsorAccess({consentEnvelope,issuerEnvelope,currentSlot,walletContext}){const consent=envelope(consentEnvelope,'SponsoredConsent'),quote=envelope(issuerEnvelope,'BookOrder'),b=consent.value,a=quote.value;return tx(()=>request(b.actor,consentEnvelope.idempotencyKey,sha256(Buffer.concat([consent.bytes,quote.bytes])),()=>{
      const old=db.prepare('SELECT * FROM authorizations WHERE actor=? AND nonce=?').get(b.actor,b.nonce);if(old){if(old.auth_hash!==consent.authHash||old.kind!=='SponsoredConsent')reject('NONCE_CONFLICT');return order(old.entity_id);}
      if(![run.buyerA,run.buyerB].includes(b.actor)||a.actor!==run.issuer||a.side!==1||a.lane!==0||b.sponsor!==run.sponsor)reject('INVALID_AUTH');checkFresh(a,currentSlot);checkFresh(b,currentSlot);
      const c=campaign(b.campaignId),s=series(b.series),u=unit(b.unit);if(slot(currentSlot)>=slot(c.validUntilSlot)||slot(currentSlot)>=slot(s.useBySlot))reject('EXPIRED');
      if(c.series!==b.series||a.series!==b.series||u.series!==b.series||a.exactUnit!==b.unit||a.expectedCursor!=='0'||u.cursor!=='0'||u.state!=='IssuerOpen'||u.owner!==run.issuer||b.packetHash!==c.packetHash||b.campaignVersion!==c.version||b.amount!==s.sponsoredPrice||a.limit!==b.amount||c.sponsor!==b.sponsor||!c.eligibleKeys.slice(0,c.eligibleCount).includes(b.actor))reject('INCOMPATIBLE');
      if(decimal(c.consumedGross)+decimal(c.activeReservedGross)+decimal(b.amount)>decimal(c.budget)||c.consumedCount+c.activeReservedCount+1>c.maxGrants||decimal(b.amount)>decimal(c.perGrant))reject('INSUFFICIENT_AVAILABLE');
      if(row('unit_holds',b.unit,'unit'))reject('PENDING_SETTLEMENT');validateContext(c.sponsor,walletContext);nonce(consent,b.orderId);if(nonce(quote,a.orderId))reject('ALREADY_USED');
      const bo=putOrder(consent),ao=putOrder(quote);hold(c.sponsor,b.amount,'order',bo.id);db.prepare("INSERT INTO unit_holds VALUES(?,'order',?)").run(u.address,ao.id);reserve(bo,ao,currentSlot,{sponsorCampaign:c});return order(bo.id);
    }));},
    abortNeverSignedMatch(id,{expectedVersion}={}){return tx(()=>{const m=match(id),op=operation(m.operationId);if(m.state==='FailedClosed'&&op.state==='ResolvedFailure'&&!op.attempt&&!row('signing_barriers',op.id,'operation_id'))return m;if(m.version!==expectedVersion)reject('STALE_CURSOR');if(op.attempt||row('signing_barriers',op.id,'operation_id')||!['Reserved','Prepared'].includes(op.state)||m.state!=='Reserved')reject('PENDING_SETTLEMENT');releaseHold(id);db.prepare("DELETE FROM unit_holds WHERE owner_type='match' AND owner_id=?").run(id);for(const o of [m.buyOrderId,m.sellOrderId])orderState(o,'FailedClosed',id);db.prepare("UPDATE matches SET state='FailedClosed',version=version+1 WHERE id=?").run(id);db.prepare("UPDATE operations SET state='ResolvedFailure',version=version+1 WHERE id=?").run(op.id);resolveCampaign(m,false);emit('never-signed-abort',id);return match(id);},{drain:true});},
    prepareNativeOperation(id,{expectedVersion}={}){return tx(()=>{const op=operation(id);if(op.version!==expectedVersion)reject('STALE_CURSOR');if(op.state==='Prepared')return op;if(op.state!=='Reserved'||op.attempt)reject('PENDING_SETTLEMENT');db.prepare("UPDATE operations SET state='Prepared',version=version+1 WHERE id=?").run(id);return operation(id);});},
    persistSignedAttempt(id,{expectedVersion,currentSlot,walletContext,prepared,signExact}={}){
      const result=tx(()=>{const op=operation(id);if(op.version!==expectedVersion)reject('STALE_CURSOR');if(op.attempt)return op;if(op.state!=='Prepared'||typeof signExact!=='function'||db.prepare('SELECT operator_unknown FROM settings').get().operator_unknown||row('signing_barriers',id,'operation_id'))reject('PENDING_SETTLEMENT');const m=match(op.matchIds[0]);validateReserved(m,currentSlot,walletContext);
        strict(prepared,['blockhash','lastValidBlockHeight','feeReserve','rentReserve']);key(prepared.blockhash);decimal(prepared.lastValidBlockHeight);if(decimal(prepared.feeReserve)>100000n)reject('CAPACITY');decimal(prepared.rentReserve);
        const reserve=PLUS(prepared.feeReserve,prepared.rentReserve),operator=wallet(run.matcher),already=db.prepare('SELECT amount FROM operating_holds').all().reduce((sum,r)=>sum+decimal(r.amount),0n);if(decimal(operator.balance)-decimal(operator.rent)-already<decimal(reserve))reject('INSUFFICIENT_AVAILABLE');
        const message=encodeInstruction(op.instruction);db.prepare("INSERT INTO signing_barriers VALUES(?,'Entered')").run(id);db.prepare('INSERT INTO operating_holds VALUES(?,?,0)').run(id,reserve);
        let signed;
        try {signed=signExact(Object.freeze({...op}),Buffer.from(message));if(signed&&typeof signed.then==='function')reject('INVALID_INPUT');strict(signed,['transaction','signature']);const txBytes=canonicalBase64(signed.transaction);if(txBytes.length>1232||txBytes.length===0)reject('CAPACITY');canonicalBase64(signed.signature,64);}
        catch {db.prepare("UPDATE signing_barriers SET state='Uncertain' WHERE operation_id=?").run(id);db.prepare("UPDATE operations SET state='Quarantined',version=version+1 WHERE id=?").run(id);db.prepare("UPDATE matches SET state='Unknown',version=version+1 WHERE id=?").run(m.id);db.prepare('UPDATE operating_holds SET unknown=1 WHERE operation_id=?').run(id);refreshQuarantine();emit('fixture-signing-uncertain',id);return {signingError:true};}
        const attempt={...prepared,...signed,message:message.toString('base64')};db.prepare('INSERT INTO signed_attempts VALUES(?,?)').run(id,json(attempt));db.prepare("UPDATE signing_barriers SET state='Persisted' WHERE operation_id=?").run(id);db.prepare("UPDATE operations SET state='Signed',version=version+1 WHERE id=?").run(id);db.prepare("UPDATE matches SET state='Signed',version=version+1 WHERE id=?").run(m.id);emit('fixture-attempt-persisted',id);return operation(id);
      });if(result.signingError)reject('PENDING_SETTLEMENT');return result;
    },
    observeOperation(id,observation){return tx(()=>{const op=operation(id);if(op.version!==observation.expectedVersion)reject('STALE_CURSOR');const contextSlot=observation.contextSlot;decimal(contextSlot);if(slot(contextSlot)<slot(op.lastObservedSlot))reject('STALE_CURSOR');if(Buffer.byteLength(json(observation))>2048)reject('CAPACITY');const m=match(op.matchIds[0]);
      const quarantine=()=>{db.prepare("UPDATE operations SET state='Quarantined',version=version+1,watermark=? WHERE id=?").run(contextSlot,id);db.prepare("UPDATE matches SET state='Unknown',version=version+1 WHERE id=?").run(m.id);db.prepare('UPDATE operating_holds SET unknown=1 WHERE operation_id=?').run(id);refreshQuarantine();emit('observation-conflict',id);return operation(id);};
      if(observation.status==='unknown'){if(['ResolvedSuccess','ResolvedFailure'].includes(op.state))return op;if(!op.attempt)reject('PENDING_SETTLEMENT');db.prepare("UPDATE operations SET state='Unknown',version=version+1,watermark=? WHERE id=?").run(contextSlot,id);db.prepare("UPDATE matches SET state='Unknown',version=version+1 WHERE id=?").run(m.id);db.prepare('UPDATE operating_holds SET unknown=1 WHERE operation_id=?').run(id);refreshQuarantine();return operation(id);}
      if(!['success','failure'].includes(observation.status)||!op.attempt)reject('INVALID_INPUT');
      if(op.state==='ResolvedSuccess'){const r=observation.receipt;return observation.status==='success'&&r&&r.matchId===m.id&&r.termsHash===m.termsHash&&(m.fundingKind===1?r.state==='SecondarySettled':['PrimaryEscrowed','PrimarySettled','PrimaryRefunded'].includes(r.state))?op:quarantine();}if(op.state==='ResolvedFailure')return observation.status==='failure'?op:quarantine();
      if(observation.status==='failure'){
        if(observation.receipt||observation.failedSignature!==op.attempt.signature||observation.fundedMatchAbsent!==true)return quarantine();
        if(!Array.isArray(observation.wallets))reject('INVALID_INPUT');const expected={[m.payer]:0n};if(observation.operatingFeesKnown===true){strict(observation.operatingCost,['fee','rent']);if(decimal(observation.operatingCost.fee)>decimal(op.attempt.feeReserve)||decimal(observation.operatingCost.rent)>decimal(op.attempt.rentReserve))reject('INVALID_INPUT');expected[run.matcher]=-decimal(PLUS(observation.operatingCost.fee,observation.operatingCost.rent));}applyWallets(observation.wallets,contextSlot,expected);releaseHold(m.id);db.prepare('DELETE FROM unit_holds WHERE unit=?').run(m.unit);resolveCampaign(m,false);for(const oid of [m.buyOrderId,m.sellOrderId])orderState(oid,'FailedClosed',m.id);db.prepare("UPDATE matches SET state='FailedClosed',version=version+1 WHERE id=?").run(m.id);db.prepare("UPDATE operations SET state='ResolvedFailure',version=version+1,watermark=? WHERE id=?").run(contextSlot,id);
      } else {
        const receipt=observation.receipt;if(!receipt||receipt.matchId!==m.id||receipt.termsHash!==m.termsHash||receipt.state!==(m.fundingKind===1?'SecondarySettled':'PrimaryEscrowed'))return quarantine();
        const u=unit(m.unit);if(u.cursor!==m.expectedCursor||u.owner!==m.seller)return quarantine();
        const expected={[m.payer]:-decimal(m.gross)};if(m.fundingKind===1){expected[m.seller]=(expected[m.seller]??0n)+decimal(m.gross)-decimal(m.fee);expected[run.collector]=(expected[run.collector]??0n)+decimal(m.fee);}
        if(observation.operatingFeesKnown===true){strict(observation.operatingCost,['fee','rent']);if(decimal(observation.operatingCost.fee)>decimal(op.attempt.feeReserve)||decimal(observation.operatingCost.rent)>decimal(op.attempt.rentReserve))reject('INVALID_INPUT');expected[run.matcher]=-decimal(PLUS(observation.operatingCost.fee,observation.operatingCost.rent));}
        applyWallets(observation.wallets,contextSlot,expected);releaseHold(m.id);db.prepare('DELETE FROM unit_holds WHERE unit=?').run(m.unit);
        u.owner=m.beneficiary;u.cursor=PLUS(u.cursor,'1');u.state='FundedOpen';const receiptAddress=deriveMatchPda({...run,matchId:m.id}).address;
        if(m.fundingKind===1){u.transferCount++;db.prepare('UPDATE claims SET owner=? WHERE unit=?').run(u.owner,u.address);}
        else {u.primaryMatch=receiptAddress;u.refundFace=m.gross;u.sponsored=m.fundingKind===2?1:0;u.sponsorRefundKey=m.fundingKind===2?m.payer:ZERO_KEY;db.prepare("INSERT INTO claims VALUES(?,?,?,'Escrowed',?,?)").run(u.address,receiptAddress,m.gross,u.owner,u.sponsorRefundKey);}
        u.latestMatch=receiptAddress;updateUnit(u);resolveCampaign(m,true);for(const oid of [m.buyOrderId,m.sellOrderId])orderState(oid,'Filled',m.id);db.prepare('UPDATE matches SET state=?,version=version+1 WHERE id=?').run(m.fundingKind===1?'SecondarySettled':'PrimaryEscrowed',m.id);db.prepare("UPDATE operations SET state='ResolvedSuccess',version=version+1,watermark=? WHERE id=?").run(contextSlot,id);
      }
      if(observation.operatingFeesKnown===true)db.prepare('DELETE FROM operating_holds WHERE operation_id=?').run(id);else db.prepare('UPDATE operating_holds SET unknown=1 WHERE operation_id=?').run(id);refreshQuarantine();emit('reference-funding-'+observation.status,id,{authority:'sqlite-reference-fixture'});return operation(id);
    },{drain:true});},
    observeOperatingCost(id,{expectedVersion,contextSlot,fee:feePaid,rent:rentPaid,wallet:observedWallet}){return tx(()=>{const op=operation(id);if(op.version!==expectedVersion)reject('STALE_CURSOR');if(!['ResolvedSuccess','ResolvedFailure'].includes(op.state)||!op.attempt)reject('PENDING_SETTLEMENT');if(!row('operating_holds',id,'operation_id'))return op;if(slot(contextSlot)<slot(op.lastObservedSlot))reject('STALE_CURSOR');if(decimal(feePaid)>decimal(op.attempt.feeReserve)||decimal(rentPaid)>decimal(op.attempt.rentReserve)||observedWallet.key!==run.matcher)reject('INVALID_INPUT');applyWallets([observedWallet],contextSlot,{[run.matcher]:-decimal(PLUS(feePaid,rentPaid))});db.prepare('DELETE FROM operating_holds WHERE operation_id=?').run(id);db.prepare('UPDATE operations SET watermark=?,version=version+1 WHERE id=?').run(contextSlot,id);refreshQuarantine();emit('reference-operating-cost-known',id);return operation(id);},{drain:true});},
    referenceStartDelivery(env,{currentSlot}={}){const auth=envelope(env,'DeliveryRequest'),a=auth.value;return tx(()=>request(a.actor,env.idempotencyKey,auth.authHash,()=>{const u=unit(a.unit),s=series(u.series);if(u.owner!==a.actor)reject('INVALID_AUTH');if(u.state==='DeliveryLocked'&&u.requestHash===auth.authHash&&u.lockStartCursor===a.expectedCursor)return u;if(u.state!=='FundedOpen'||row('unit_holds',u.address,'unit'))reject('PENDING_SETTLEMENT');if(u.cursor!==a.expectedCursor||a.series!==s.address||a.resourceHash!==s.resourceHash)reject('STALE_CURSOR');if(slot(currentSlot)>=slot(s.useBySlot))reject('EXPIRED');nonce(auth,auth.authHash);u.state='DeliveryLocked';u.requestHash=auth.authHash;u.lockStartCursor=u.cursor;u.lockStartSlot=currentSlot;u.lockDeadlineSlot=PLUS(currentSlot,'150');u.cursor=PLUS(u.cursor,'1');updateUnit(u);emit('reference-delivery-start',u.address,{requestHash:u.requestHash});return unit(u.address);}),{drain:true});},
    referenceTerminal({unit:address,reason,currentSlot,expectedCursor,requestHash,wallets}){return tx(()=>{const u=unit(address),s=series(u.series),claim=requireRow('claims',address,'unit');if(claim.state!=='Escrowed')reject('ALREADY_USED');if(u.cursor!==expectedCursor)reject('STALE_CURSOR');if(!['delivery','expiry','failure','timeout'].includes(reason))reject('INVALID_INPUT');if(reason==='expiry'){if(u.state!=='FundedOpen')reject('INCOMPATIBLE');if(slot(currentSlot)<slot(s.useBySlot))reject('EXPIRED');}else {if(u.state!=='DeliveryLocked'||requestHash!==u.requestHash)reject('INCOMPATIBLE');if(reason==='delivery'&&slot(currentSlot)>=slot(u.lockDeadlineSlot))reject('EXPIRED');if(reason==='timeout'&&slot(currentSlot)<slot(u.lockDeadlineSlot))reject('EXPIRED');}
      // Phase1 coherent reference observation only; actual native proof is Phase2.
      const refund=['failure','timeout'].includes(reason),recipient=refund?(u.sponsored?u.sponsorRefundKey:u.owner):run.issuer,n=decimal(claim.face),f=refund?0n:decimal(fee(claim.face)),expected={[recipient]:n-f};if(f)expected[run.collector]=(expected[run.collector]??0n)+f;applyWallets(wallets,currentSlot,expected);
      const state=refund?'Refunded':reason==='expiry'?'Expired':'Consumed';u.state=state;u.cursor=PLUS(u.cursor,'1');updateUnit(u);db.prepare('UPDATE claims SET state=? WHERE unit=?').run(refund?'Refunded':'Settled',address);
      const primary=db.prepare('SELECT id,data FROM matches WHERE unit=?').all(address).find(r=>parse(r).fundingKind!==1);if(primary)db.prepare('UPDATE matches SET state=?,version=version+1 WHERE id=?').run(refund?'PrimaryRefunded':'PrimarySettled',primary.id);
      if(refund&&u.sponsored){const primary=db.prepare('SELECT data FROM matches WHERE unit=?').all(address).map(parse).find(m=>m.fundingKind===2);if(primary?.campaignId){const c=campaign(primary.campaignId);db.prepare('UPDATE campaigns SET refunded_gross=? WHERE id=?').run(PLUS(c.refundedGross,claim.face),c.campaignId);}}
      emit('reference-terminal',address,{reason,recipient,face:claim.face,authority:'sqlite-reference-fixture'});return unit(address);
    },{drain:true});},
    projectActor(actor){if(![...trading,...operating,run.collector].includes(actor))reject('INVALID_AUTH');return {authority:'sqlite-reference-fixture',nativeEvidence:false,domain,run:structuredClone(run),wallet:row('wallets',actor,'key')?store.captureWallet(actor):null,series:db.prepare('SELECT data FROM series').all().map(parse),units:db.prepare('SELECT address FROM units').all().map(r=>unit(r.address)),orders:db.prepare('SELECT id FROM orders WHERE actor=? ORDER BY sequence').all(actor).map(r=>order(r.id)),matches:db.prepare('SELECT id FROM matches').all().map(r=>match(r.id)).filter(m=>[m.payer,m.beneficiary,m.seller].includes(actor)),campaigns:db.prepare('SELECT id FROM campaigns WHERE sponsor=?').all(actor).map(r=>campaign(r.id)),operatingUnknown:!!db.prepare('SELECT operator_unknown FROM settings').get().operator_unknown};},
    getOrder:order,getMatch:match,getUnit:unit,getOperation:operation,getCampaign:campaign,
    storageInfo(){return {...physical(),pageSize,maximumPages:db.prepare('PRAGMA max_page_count').get().max_page_count,synchronous:db.prepare('PRAGMA synchronous').get().synchronous,fullfsync:db.prepare('PRAGMA fullfsync').get().fullfsync};},
    close(){if(!closed){db.prepare('DELETE FROM writer WHERE token=?').run(token);checkpoint();closed=true;db.close();}},
  };
  return store;
}
