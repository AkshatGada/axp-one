import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/opportunity/1/',{waitUntil:'networkidle'});
// jump straight to receipt via stepper
for(let k=0;k<7;k++){await p.getByRole('button',{name:'Next stage'}).click(); await p.waitForTimeout(400);}
const main = await p.innerText('main');
const i = main.indexOf('8. Signed receipt'); console.log(main.slice(i,i+1500));
// inspect record modal
await p.getByRole('button',{name:'Inspect record'}).last().click(); await p.waitForTimeout(800);
await p.screenshot({path:`${SHOTS}/13-opp1-receipt-inspect.png`});
const dlg = await p.$('[role=dialog]'); if(dlg) console.log('DIALOG:\n'+(await dlg.innerText()).slice(0,1500));
await p.keyboard.press('Escape'); await p.waitForTimeout(300);
// opportunity 3 auction
await p.goto('http://localhost:3420/opportunity/3/#auction',{waitUntil:'networkidle'}); await p.waitForTimeout(1200);
await p.screenshot({path:`${SHOTS}/14-opp3-auction.png`});
const m3=await p.innerText('main'); const j=m3.indexOf('5. Auction'); console.log('\nOPP3:\n'+m3.slice(0,400)+'\n...\n'+m3.slice(j,j+1500));
// opp 4
await p.goto('http://localhost:3420/opportunity/4/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
console.log('\nOPP4:\n'+(await p.innerText('main')).slice(0,2500));
console.log(errs);
await b.close();
