// Minimal key/value store for hosted live runs. Two interchangeable backends:
//  - Upstash Redis REST (production; Vercel Marketplace injects KV_REST_API_URL/TOKEN)
//  - a local directory (development and tests)
// Values are strings. No SDK dependency.
import {mkdirSync,readFileSync,writeFileSync,existsSync,rmSync,renameSync,openSync,closeSync} from 'node:fs';
import {join} from 'node:path';
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
    async incr(key,ttlSeconds){const v=read(key),n=Number(v?.value??0)+1;write(key,{key,value:String(n),expiresAt:v?.expiresAt??(ttlSeconds?Date.now()+ttlSeconds*1000:undefined)});return n;},
    async lpush(key,value,max=500){const v=read(key),list=v?JSON.parse(v.value):[];list.unshift(String(value));write(key,{key,value:JSON.stringify(list.slice(0,max))});},
    async lrange(key,start,stop){const v=read(key),list=v?JSON.parse(v.value):[];return list.slice(start,stop<0?list.length+stop+1:stop+1);},
  };
}

export function createKVFromConfig(config,{root}) {
  const url=config.KV_REST_API_URL||config.UPSTASH_REDIS_REST_URL,token=config.KV_REST_API_TOKEN||config.UPSTASH_REDIS_REST_TOKEN;
  if(url&&token)return createUpstashKV({url,token});
  return createFileKV({dir:join(root,config.AXP_HOSTED_DATA_DIR||'local-state/hosted','kv')});
}
