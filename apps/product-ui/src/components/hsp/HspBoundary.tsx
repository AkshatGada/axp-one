'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {Ld} from '@axp/design-system/ledger';
export function HspBoundary({children}:{children:ReactNode}){
 const enabled=process.env.NEXT_PUBLIC_AXP_HSP_DEMO==='1';const [ready,setReady]=useState(false),[password,setPassword]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(enabled)fetch('/api/hsp/operator/session',{cache:'no-store'}).then(r=>r.json()).then(v=>setReady(v.authenticated===true)).catch(()=>setError('The isolated local HSP server is unavailable.'));},[enabled]);
 if(!enabled)return children;
 if(ready)return <><Ld.Notice tone="demo" title="Isolated AXP × HSP demo">HSK Testnet payments and HSK mainnet evidence anchors are separate. Existing production accounts and wallets are not connected.</Ld.Notice>{children}</>;
 return <main style={{maxWidth:560,margin:'80px auto',padding:24}}><Ld.Panel title="Open the isolated HSP demo" sub="Local operator access"><form onSubmit={async e=>{e.preventDefault();setError('');try{const r=await fetch('/api/hsp/operator/login',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({password})});if(!r.ok)throw Error('Operator password rejected.');setPassword('');setReady(true);}catch(e){setError((e as Error).message);}}}><Ld.Field label="Operator password"><input className="ld-input" type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></Ld.Field><Ld.Button type="submit">Open demo</Ld.Button>{error&&<p role="alert">{error}</p>}</form><p className="ld-caption">Fixture mode uses the documented fixture password. Live mode requires a private operator password.</p></Ld.Panel></main>;
}
