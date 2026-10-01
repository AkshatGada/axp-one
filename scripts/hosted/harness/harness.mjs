// Local development harness for the hosted live-run API (not the MVP UI).
import {createLiveClient,driveRun,acknowledgeCard,explorer} from './client.mjs';
const client=createLiveClient(),$=s=>document.querySelector(s);
const params=new URLSearchParams(location.hash.slice(1));
const auto=params.get('auto')==='1';
let runId=sessionStorage.getItem('axp-live-run'),runToken=sessionStorage.getItem('axp-live-token');
const show=run=>{
  $('#phase').textContent=`${run.runId}: ${run.phase}${run.error?` (last error: ${run.error.code}, attempt ${run.error.attempt})`:''}`;
  $('#status').textContent=JSON.stringify({phase:run.phase,history:run.history,bundle:run.bundle,turns:run.status?.turns?.map(t=>({scenario:t.scenarioId,status:t.status,outcome:t.outcome})),charges:run.status?.charges,payments:run.status?.payments},null,2);
  const links=[];for(const p of run.status?.payments??[]){for(const [k,v] of Object.entries(p.explorer))if(v)links.push([`${p.advertiser} ${k}`,v]);}
  for(const f of run.files)links.push([f,`/api/runs/${run.runId}/files/${f}`]);
  $('#links').replaceChildren(...links.map(([t,h])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=h;a.textContent=t;a.target='_blank';li.append(a);return li;}));
  document.body.dataset.phase=run.phase;
};
async function deliver(run) {
  for(const award of run.status.awards.filter(a=>a.status==='reserved')) {
    // Insert the disclosed card into this page (the publisher's owned app), then acknowledge.
    const card=document.createElement('div');card.className='ad';card.dataset.award=award.awardId;
    const label=document.createElement('strong');label.dataset.sponsoredLabel='';label.textContent='Sponsored';
    const copy=document.createElement('p');copy.dataset.creativeCopy='';copy.textContent=award.creativeText;
    const by=document.createElement('small');by.textContent=`${award.advertiser} · fictional advertiser · ${award.scenarioId}`;
    card.append(label,copy,by);$('#slot').append(card);
    for(let i=0;;i++){try{const r=await acknowledgeCard(client,run.runId,runToken,award,card);show(r.run);break;}catch(e){if(e.code==='run_busy_retry'&&i<20){await new Promise(r=>setTimeout(r,1500));continue;}throw e;}}
  }
}
async function loop() {
  for(;;){
    const run=await driveRun(client,runId,{onUpdate:show});
    if(run.terminal){show(run);document.body.dataset.done='1';return run;}
    if(!runToken)throw Error('run token missing in this tab');
    await deliver(run);
  }
}
async function start() {
  const r=await client.start({passcode:$('#passcode').value||undefined,idempotencyKey:`harness-${crypto.randomUUID()}`});
  runId=r.run.runId;runToken=r.runToken;sessionStorage.setItem('axp-live-run',runId);sessionStorage.setItem('axp-live-token',runToken);show(r.run);
  return loop();
}
const guard=fn=>fn().catch(e=>{$('#phase').textContent=`Error: ${e.code??e.message}`;document.body.dataset.error=e.code??e.message;});
$('#start').onclick=()=>guard(start);
$('#resume').onclick=()=>guard(loop);
if(auto)guard(runId?loop:start);
