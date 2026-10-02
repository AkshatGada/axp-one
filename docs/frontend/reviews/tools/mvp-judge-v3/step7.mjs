import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/settlement/',{waitUntil:'networkidle'});
await p.getByRole('button',{name:'Inspect'}).first().click().catch(async()=>{await p.getByText('Inspect',{exact:true}).first().click()});
await p.waitForTimeout(900);
await p.screenshot({path:`${SHOTS}/17-settlement-tx-inspect.png`});
const d=await p.$('[role=dialog]'); console.log(d?(await d.innerText()).slice(0,2500):'no dialog');
console.log(await p.$$eval('[role=dialog] a',els=>els.map(e=>`[${e.innerText}] ${e.href}`).join('\n')));
await p.keyboard.press('Escape');
// Verify page
await p.getByRole('link',{name:'Verify',exact:true}).first().click();
await p.waitForLoadState('networkidle'); await p.waitForTimeout(2500);
console.log(p.url());
await p.screenshot({path:`${SHOTS}/18-verify.png`});
console.log((await p.innerText('main')).slice(0,5000));
console.log(await p.$$eval('main button, main a',els=>els.map(e=>`${e.tagName} [${e.innerText.trim().replace(/\s+/g,' ').slice(0,70)}] ${e.getAttribute('href')||''}`).join('\n')));
console.log(errs);
await b.close();
