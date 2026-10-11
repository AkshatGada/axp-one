// Minimal key/value store for hosted live runs. Two interchangeable backends:
//  - Upstash Redis REST (production; Vercel Marketplace injects KV_REST_API_URL/TOKEN)
//  - a local directory (development and tests)
// Values are strings. No SDK dependency.
import {mkdirSync,readFileSync,writeFileSync,existsSync,rmSync,renameSync,openSync,closeSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';

const fail=code=>{const e=new Error(code);e.code=code;throw e;};

/** Upstash Redis over its REST API. Only the commands this package needs. */
export function createUpstashKV({url,token,fetchImpl=fetch,timeoutMs=10000}) {
  if(!/^https:\/\//.test(url??'')||!token)fail('kv_config_invalid');
  async function command(...args) {
    for(let attempt=0;;attempt++) {
      let r;
      try{r=await fetchImpl(url,{method:'POST',redirect:'error',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args.map(String)),signal:AbortSignal.timeout(timeoutMs)});}
      catch(e){if(attempt<2){await new Promise(r=>setTimeout(r,300*(attempt+1)));continue;}fail('kv_unavailable');}
      if((r.status===429||r.status>=500)&&attempt<2){await new Promise(r=>setTimeout(r,500*(attempt+1)));continue;}
      const body=await r.json().catch(()=>({}));
      if(!r.ok||body.error)fail(`kv_error_${r.status}`);
      return body.result;
    }
  }
  return {
    kind:'upstash',
    get:key=>command('GET',key),
    async set(key,value,{ttlSeconds,nx=false}={}) {
      const args=['SET',key,value];if(ttlSeconds)args.push('EX',Math.ceil(ttlSeconds));if(nx)args.push('NX');
      return (await command(...args))==='OK';
    },
    del:key=>command('DEL',key).then(n=>n>0),
    // Exact-value compare-and-swap, including absent keys. No read/write race.
    async compareAndSet(key,expected,value) {
      const script="local v=redis.call('GET',KEYS[1]); if (ARGV[1]=='0' and v) or (ARGV[1]=='1' and v~=ARGV[2]) then return 0 end; redis.call('SET',KEYS[1],ARGV[3]); return 1";
      return Number(await command('EVAL',script,1,key,expected===null?'0':'1',expected??'',String(value)))===1;
    },
    async incr(key,ttlSeconds) {const n=await command('INCR',key);if(n===1&&ttlSeconds)await command('EXPIRE',key,Math.ceil(ttlSeconds));return n;},
    async lpush(key,value,max=500) {await command('LPUSH',key,value);await command('LTRIM',key,0,max-1);},
    lrange:(key,start,stop)=>command('LRANGE',key,start,stop),
  };
}

/** Local directory backend. Single machine; NX uses exclusive file creation. */
export function createFileKV({dir}) {
  mkdirSync(dir,{recursive:true,mode:0o700});
  const pathOf=key=>join(dir,createHash('sha256').update(key).digest('hex').slice(0,40)+'.json');
  const read=key=>{const p=pathOf(key);if(!existsSync(p))return null;let v;try{v=JSON.parse(readFileSync(p,'utf8'));}catch{return null;}if(v.expiresAt&&v.expiresAt<Date.now()){rmSync(p,{force:true});return null;}return v;};
  const write=(key,v)=>{const p=pathOf(key),tmp=`${p}.${randomBytes(6).toString('hex')}.tmp`;writeFileSync(tmp,JSON.stringify(v),{mode:0o600});renameSync(tmp,p);};
  return {
    kind:'file',
    async get(key){return read(key)?.value??null;},
    async set(key,value,{ttlSeconds,nx=false}={}) {
      const v={key,value:String(value),...(ttlSeconds?{expiresAt:Date.now()+ttlSeconds*1000}:{})};
      if(nx) {
        read(key);// drops an expired entry
        try{const fd=openSync(pathOf(key),'wx',0o600);closeSync(fd);}catch(e){if(e.code==='EEXIST')return false;throw e;}
      }
      write(key,v);return true;
    },
    async del(key){const p=pathOf(key),had=existsSync(p);rmSync(p,{force:true});return had;},
    async compareAndSet(key,expected,value) {
      // Synchronous critical section; separate file processes cannot both win CAS.
      const lockPath=pathOf(key)+'.cas-lock';let fd;
      try{fd=openSync(lockPath,'wx',0o600);}catch(e){if(e.code==='EEXIST')return false;throw e;}
      try{if((read(key)?.value??null)!==expected)return false;write(key,{key,value:String(value)});return true;}
      finally{closeSync(fd);rmSync(lockPath,{force:true});}
    },
    async incr(key,ttlSeconds){const v=read(key),n=Number(v?.value??0)+1;write(key,{key,value:String(n),expiresAt:v?.expiresAt??(ttlSeconds?Date.now()+ttlSeconds*1000:undefined)});return n;},
    async lpush(key,value,max=500){const v=read(key),list=v?JSON.parse(v.value):[];list.unshift(String(value));write(key,{key,value:JSON.stringify(list.slice(0,max))});},
    async lrange(key,start,stop){const v=read(key),list=v?JSON.parse(v.value):[];return list.slice(start,stop<0?list.length+stop+1:stop+1);},
  };
}

/** Vercel Blob (private store) over its REST API, the same protocol as @vercel/blob 2.x.
 * Every key is one private blob read uncached (`?cache=0`), so reads see the latest write.
 * NX = create-if-absent (allowOverwrite off); expired NX keys are taken over with an ETag
 * conditional write; counters and lists are ETag compare-and-swap loops. */
export function createBlobKV({token,apiURL='https://vercel.com/api/blob',prefix='axp-hosted/',fetchImpl=fetch,timeoutMs=15000}) {
  const storeId=String(token??'').split('_')[3];
  if(!/^vercel_blob_rw_/.test(token??'')||!storeId)fail('blob_config_invalid');
  const base=`https://${storeId}.private.blob.vercel-storage.com/`;
  const pathOf=key=>`${prefix}${key.replace(/[^\w.:/-]/g,'_').replace(/:/g,'/')}.json`;
  const urlOf=key=>base+pathOf(key);
  async function api(path,init) {
    for(let attempt=0;;attempt++) {
      let r;
      try{r=await fetchImpl(apiURL+path,{...init,redirect:'error',signal:AbortSignal.timeout(timeoutMs),headers:{authorization:`Bearer ${token}`,'x-api-version':'12','x-vercel-blob-store-id':storeId,'x-api-blob-request-id':`${storeId}:${Date.now()}:${randomBytes(4).toString('hex')}`,'x-api-blob-request-attempt':String(attempt),...init.headers}});}
      catch{if(attempt<2){await new Promise(r=>setTimeout(r,400*(attempt+1)));continue;}fail('blob_unavailable');}
      if(r.ok)return r.json();
      let code='unknown_error',message='';try{const b=await r.json();code=b.error?.code??code;message=b.error?.message??'';}catch{}
      if(['unknown_error','service_unavailable','internal_server_error','rate_limited'].includes(code)&&attempt<2){await new Promise(r=>setTimeout(r,600*(attempt+1)));continue;}
      const e=new Error(`blob_${code}`);e.code=`blob_${code}`;e.status=r.status;e.blobMessage=message;throw e;
    }
  }
  // Content plus ETag, uncached. null when absent.
  async function read(key) {
    let r;
    // CDN compression turns an object ETag into W/"…". That weak validator
    // cannot be used by Blob's x-if-match PUT, so read the original bytes.
    for(let attempt=0;;attempt++){try{r=await fetchImpl(`${urlOf(key)}?cache=0`,{headers:{authorization:`Bearer ${token}`,'accept-encoding':'identity'},redirect:'error',signal:AbortSignal.timeout(timeoutMs)});break;}catch{if(attempt<2)continue;fail('blob_unavailable');}}
    if(r.status===404)return null;if(!r.ok)fail(`blob_read_${r.status}`);
    const text=await r.text();let v;try{v=JSON.parse(text);}catch{return null;}
    return {...v,etag:r.headers.get('etag')};
  }
  const live=v=>v&&!(v.exp&&v.exp<Date.now());
  const fenceOf=record=>{
    if(!record.etag)fail('blob_etag_required');
    // Never strip W/ or obtain HEAD after GET: either could associate an
    // unverified validator with the snapshot and weaken stale-worker fencing.
    if(!/^"[^"\r\n]*"$/.test(record.etag))fail('blob_etag_not_strong');
    return record.etag;
  };
  const put=(key,record,{overwrite=true,ifMatch}={})=>api(`/?${new URLSearchParams({pathname:pathOf(key)})}`,{method:'PUT',body:JSON.stringify(record),headers:{'x-vercel-blob-access':'private','x-add-random-suffix':'0','x-content-type':'application/json',
    'x-allow-overwrite':overwrite||ifMatch?'1':'0',...(ifMatch?{'x-if-match':ifMatch}:{}),'x-cache-control-max-age':'60'}});
  const conflict=e=>e.code==='blob_precondition_failed'||(e.status>=400&&e.status<500&&/exist/i.test(e.blobMessage??''))||e.status===409;
  async function cas(key,update,ttlSeconds) {
    for(let i=0;i<8;i++) {
      const cur=await read(key),next=update(live(cur)?cur.v:null);
      const record={v:next,...(ttlSeconds?{exp:live(cur)&&cur.exp?cur.exp:Date.now()+ttlSeconds*1000}:{})};
      try{if(cur)await put(key,record,{ifMatch:fenceOf(cur)});else await put(key,record,{overwrite:false});return next;}
      catch(e){if(!conflict(e))throw e;await new Promise(r=>setTimeout(r,50+Math.random()*150));}
    }
    fail('blob_contention');
  }
  return {
    kind:'blob',
    async get(key){const v=await read(key);return live(v)?v.v:null;},
    async set(key,value,{ttlSeconds,nx=false}={}) {
      const record={v:String(value),...(ttlSeconds?{exp:Date.now()+ttlSeconds*1000}:{})};
      if(!nx){await put(key,record);return true;}
      try{await put(key,record,{overwrite:false});return true;}
      catch(e) {
        if(!conflict(e))throw e;
        const cur=await read(key);if(live(cur))return false;
        // Expired (or vanished): take it over only if nobody else changed it meanwhile.
        try{if(cur)await put(key,record,{ifMatch:fenceOf(cur)});else await put(key,record,{overwrite:false});return true;}catch(e2){if(conflict(e2))return false;throw e2;}
      }
    },
    async compareAndSet(key,expected,value) {
      const cur=await read(key);
      if((live(cur)?cur.v:null)!==expected)return false;
      try{await put(key,{v:String(value)},cur?{ifMatch:fenceOf(cur)}:{overwrite:false});return true;}
      catch(e){if(conflict(e))return false;throw e;}
    },
    async del(key){await api('/delete',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({urls:[urlOf(key)]})});return true;},
    incr:(key,ttlSeconds)=>cas(key,v=>String(Number(v??0)+1),ttlSeconds).then(Number),
    async lpush(key,value,max=500){await cas(key,v=>JSON.stringify([String(value),...(v?JSON.parse(v):[])].slice(0,max)));},
    async lrange(key,start,stop){const v=await this.get(key),list=v?JSON.parse(v):[];return list.slice(start,stop<0?list.length+stop+1:stop+1);},
  };
}

/** Store selection: AXP_RUN_STORE=blob|upstash|file, else Blob if BLOB_READ_WRITE_TOKEN,
 * else Upstash if its REST variables exist, else a local directory. On Vercel without a
 * store this returns null (live runs off, site still works). */
export function createKVFromConfig(config,{root}) {
  const mode=config.AXP_RUN_STORE,blob=config.BLOB_READ_WRITE_TOKEN;
  const url=config.KV_REST_API_URL||config.UPSTASH_REDIS_REST_URL,token=config.KV_REST_API_TOKEN||config.UPSTASH_REDIS_REST_TOKEN;
  if(mode==='file')return createFileKV({dir:join(resolve(root,config.AXP_HOSTED_DATA_DIR||'local-state/hosted'),'kv')});
  if(mode==='upstash'||(!mode&&!blob&&url&&token))return url&&token?createUpstashKV({url,token}):null;
  if(blob&&mode!=='upstash')return createBlobKV({token:blob,...(config.VERCEL_BLOB_API_URL?{apiURL:config.VERCEL_BLOB_API_URL}:{})});
  if(mode==='blob'||config.VERCEL)return null;
  return createFileKV({dir:join(resolve(root,config.AXP_HOSTED_DATA_DIR||'local-state/hosted'),'kv')});
}
