// One-time, operator-authenticated encrypted import. Available only while the
// branch is explicitly in import mode; ordinary demo traffic cannot initialize
// an empty workspace during the handoff. Never overwrites another state.
import {createHmac,timingSafeEqual} from 'node:crypto';
import {mkdtempSync,rmSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createKVFromConfig} from '../hosted/kv.mjs';
import {unpackDirectory} from '../hosted/vault.mjs';
import {productStateKey} from '../product/hosted.mjs';
import {hash} from '../contracts/index.mjs';

export const importProof=(key,rows)=>createHmac('sha256',key).update('axp-arc-import-v1:'+hash(rows)).digest('hex');
export function createArcImportHandler({config,root,kv,id}) {
  const send=(res,status,value)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(value));};
  return async(req,res)=>{
    const path=new URL(req.url,'http://local').pathname;
    if(req.method!=='POST'||path!=='/api/arc/operator/import')return send(res,503,{error:'arc_import_pending',enabled:false});
    try{
      const key=Buffer.from(config.AXP_ARC_PREVIEW_STATE_KEY??'','base64');if(key.length!==32)throw Error('arc_import_configuration');
      const chunks=[];let bytes=0;
      for await(const chunk of req){bytes+=Buffer.byteLength(chunk);if(bytes>2*1024*1024)return send(res,413,{error:'body_too_large'});chunks.push(Buffer.from(chunk));}
      const rows=JSON.parse(Buffer.concat(chunks).toString('utf8'));
      if(!rows||Object.keys(rows).sort().join()!=='financial,organic')return send(res,400,{error:'arc_import_invalid'});
      const proof=req.headers['x-axp-arc-import-proof'];
      if(typeof proof!=='string'||!/^[a-f0-9]{64}$/.test(proof)||!timingSafeEqual(Buffer.from(proof,'hex'),Buffer.from(importProof(key,rows),'hex')))return send(res,403,{error:'arc_import_forbidden'});
      kv??=createKVFromConfig(config,{root});if(!kv||config.VERCEL&&kv.kind==='file')throw Error('arc_import_store_required');
      // Authenticate both complete snapshots before creating either record.
      for(const kind of ['financial','organic']){
        const row=JSON.parse(rows[kind]);
        if(row.schemaVersion!=='axp.hosted-product-state.v1'||row.lease!==null||!Number.isSafeInteger(row.revision)||row.revision<1||typeof row.snapshot!=='string')throw Error('arc_import_invalid');
        const dir=mkdtempSync(join(tmpdir(),'axp-arc-import-check-'));
        try{unpackDirectory(row.snapshot,dir,key,{aad:`axp.hosted-product-state.v1:${id}:${kind}`});if(!existsSync(join(dir,'exchange.sqlite')))throw Error('arc_import_invalid');}
        finally{rmSync(dir,{recursive:true,force:true});}
      }
      for(const kind of ['financial','organic']){
        const name=productStateKey(id,kind),existing=await kv.get(name);
        if(existing!==null&&existing!==rows[kind])return send(res,409,{error:'arc_import_target_exists'});
      }
      for(const kind of ['financial','organic']){
        const name=productStateKey(id,kind);
        if(await kv.get(name)===rows[kind])continue;
        if(!await kv.compareAndSet(name,null,rows[kind])&&await kv.get(name)!==rows[kind])return send(res,409,{error:'arc_import_target_exists'});
      }
      return send(res,200,{imported:true,workspaceId:id,shards:2,providerCalls:0,signaturesCreated:0,broadcasts:0});
    }catch(e){const code=/^arc_import_[a-z_]+$/.test(e.message??'')?e.message:'arc_import_unavailable';return send(res,503,{error:code});}
  };
}
