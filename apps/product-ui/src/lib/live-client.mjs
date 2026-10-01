// COPY of packages/hosted/client.mjs (the hosted live-run API contract). Keep identical below this header;
// scripts/test/live-client.test.mjs fails if it drifts. Copied so the app stays self-contained.
// Browser/Node client for the hosted live-run API. Dependency-free; types in client.d.mts.
// The MVP's "Run it live" UI builds on this; see docs/build/HOSTED_LIVE_RUN.md (section 10).
export class LiveRunError extends Error {constructor(code,status){super(code);this.code=code;this.status=status;}}

export function createLiveClient({baseURL=globalThis.location?.origin,fetcher=globalThis.fetch.bind(globalThis),apiBase='/api'}={}) {
  const url=path=>new URL(`${apiBase}${path}`,baseURL);
  async function call(method,path,{body,headers={}}={}) {
    const r=await fetcher(url(path),{method,redirect:'error',headers:{...(body!==undefined?{'Content-Type':'application/json'}:{}),...headers},...(body!==undefined?{body:JSON.stringify(body)}:{})});
    const text=await r.text();let json=null;try{json=text?JSON.parse(text):null;}catch{}
    if(!r.ok)throw new LiveRunError(json?.error??`http_${r.status}`,r.status);
    return json;
  }
  const file=(runId,path)=>call('GET',`/runs/${encodeURIComponent(runId)}/files/${path}`);
  return {
    config:()=>call('GET','/live'),
    start:({passcode,idempotencyKey}={})=>call('POST','/runs',{body:passcode?{passcode}:{},headers:idempotencyKey?{'Idempotency-Key':idempotencyKey}:{}}),
    list:()=>call('GET','/runs').then(b=>b.runs),
    status:runId=>call('GET',`/runs/${encodeURIComponent(runId)}`).then(b=>b.run),
    advance:runId=>call('POST',`/runs/${encodeURIComponent(runId)}/advance`,{body:{}}),
    render:(runId,awardId,body,runToken)=>call('POST',`/runs/${encodeURIComponent(runId)}/awards/${encodeURIComponent(awardId)}/render`,{body,headers:{Authorization:`Bearer ${runToken}`}}),
    file,
    async bundle(runId){const [run,manifest,chainCheck]=await Promise.all([file(runId,'replay/run.json'),file(runId,'replay/manifest.json'),file(runId,'chain-check.json')]);return {run,manifest,chainCheck};},
  };
}

const sleep=(ms,signal)=>new Promise((resolve,reject)=>{const t=setTimeout(resolve,ms);signal?.addEventListener('abort',()=>{clearTimeout(t);reject(signal.reason??new Error('aborted'));},{once:true});});

/** Advance a run until it needs the browser (awards to render) or reaches a terminal phase.
 * Resolves with the latest RunRecord. Safe to call repeatedly; steps are server-side idempotent. */
export async function driveRun(client,runId,{intervalMs=2500,onUpdate,signal,stopWhenAwardsPending=true}={}) {
  for(;;) {
    signal?.throwIfAborted?.();
    let res;
    try{res=await client.advance(runId);}
    catch(e){if(e.status===429||e.status>=500||e.code==='run_busy_retry'){await sleep(intervalMs*2,signal);continue;}throw e;}
    const run=res.run;onUpdate?.(run,res);
    if(run.terminal)return run;
    if(stopWhenAwardsPending&&run.phase==='delivery'&&run.pendingAwards.length)return run;
    await sleep(res.busy?intervalMs*2:intervalMs,signal);
  }
}

/** Publisher-side delivery acknowledgement from the page's own DOM. `element` must be the
 * inserted card: it must contain [data-sponsored-label] with text "Sponsored" and
 * [data-creative-copy] with exactly the award's approved creative text. */
export async function acknowledgeCard(client,runId,runToken,award,element) {
  const label=element?.querySelector?.('[data-sponsored-label]'),copy=element?.querySelector?.('[data-creative-copy]');
  if(!element?.isConnected)throw new LiveRunError('card_not_in_document',0);
  if(label?.textContent?.trim()!=='Sponsored')throw new LiveRunError('sponsored_label_missing',0);
  if(copy?.textContent!==award.creativeText)throw new LiveRunError('creative_text_mismatch',0);
  return client.render(runId,award.awardId,{domInserted:true,sponsoredLabelPresent:true,creativeHash:award.creativeHash},runToken);
}

/** Explorer link helper for Devnet signatures and addresses. */
export const explorer=(kind,value)=>`https://explorer.solana.com/${kind==='tx'?'tx':'address'}/${value}?cluster=devnet`;
