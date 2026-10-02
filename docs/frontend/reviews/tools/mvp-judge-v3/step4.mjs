import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/opportunity/1/',{waitUntil:'networkidle'});
const want={2:'07-opp1-eligibility',3:'08-opp1-evidence',4:'09-opp1-decisions',5:'10-opp1-auction',7:'11-opp1-delivery',9:'12-opp1-charge'};
for(let s=2;s<=9;s++){
  await p.getByRole('button',{name:'Next stage'}).click();
  await p.waitForTimeout(900);
  const panel = await p.evaluate(()=>{const h=[...document.querySelectorAll('h2,h3')].find(e=>/^\d\. /.test(e.innerText.trim())&&e.offsetParent);return h?h.closest('section,div[class]')?.parentElement?.innerText.slice(0,2500):'?'});
  console.log(`\n===== STAGE ${s} =====\n`+panel);
  if(want[s]) await p.screenshot({path:`${SHOTS}/${want[s]}.png`});
}
console.log(errs);
await b.close();
