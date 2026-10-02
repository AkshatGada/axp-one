import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.getByRole('link',{name:'Watch the guided replay'}).click();
await p.waitForLoadState('networkidle');
const t0=Date.now(); let last=''; let n=20; const shotAt=new Set([0,6,15,30,50,75,100,130]);
for(let s=0;s<=150;s+=3){
  const body=(await p.innerText('body')).replace(/\s+/g,' ').slice(0,700);
  if(body!==last){console.log(`\n[t=${s}s] ${p.url()}\n${body}`); last=body;}
  if([...shotAt].some(x=>x>=s&&x<s+3) && n<=27){await p.screenshot({path:`${SHOTS}/${n}-present-t${s}.png`}); n++;}
  await p.waitForTimeout(3000);
}
console.log(errs);
await b.close();
