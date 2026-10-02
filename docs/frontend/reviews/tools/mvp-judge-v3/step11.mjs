import {open,SHOTS} from './lib.mjs';
const {b,p,errs}=await open();
for (const u of ['/publisher/','/evidence/','/try/','/advertisers/clearvault/']){
  const r=await p.goto('http://localhost:3420'+u,{waitUntil:'networkidle'}); await p.waitForTimeout(800);
  console.log(`\n==== ${u} ${r.status()}\n`+(await p.innerText('main')).replace(/\s+/g,' ').slice(0,1100));
  if(u==='/try/') await p.screenshot({path:`${SHOTS}/30-try-draft.png`});
}
// run selector dropdown
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.getByText('v3-wallet-acceptance').first().click(); await p.waitForTimeout(600);
console.log('\nRUN MENU: '+(await p.innerText('body')).replace(/\s+/g,' ').slice(0,300));
console.log(errs);
await b.close();
