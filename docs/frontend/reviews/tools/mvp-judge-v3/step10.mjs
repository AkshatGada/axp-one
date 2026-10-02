import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
for (const s of [8,9,10]){
  await p.goto(`http://localhost:3420/present/?auto=1#${s}`,{waitUntil:'networkidle'}); await p.waitForTimeout(4000);
  console.log(`\n[slide ${s}] ${p.url()}\n`+(await p.innerText('body')).replace(/\s+/g,' ').slice(0,1500));
  if(s!==9) await p.screenshot({path:`${SHOTS}/${s===8?28:29}-present-slide${s}.png`});
}
// end of slide 10 after waiting: what happens
await p.waitForTimeout(30000);
console.log('\nAFTER 30s on 10: '+p.url()+'\n'+(await p.innerText('body')).replace(/\s+/g,' ').slice(0,600));
// keyboard help
await p.keyboard.press('?'); await p.waitForTimeout(800);
console.log('\nHELP: '+(await p.innerText('body')).replace(/\s+/g,' ').slice(-700));
console.log(errs);
await b.close();
