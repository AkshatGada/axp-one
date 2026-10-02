import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
const t0=Date.now();
await p.getByRole('link',{name:'Verify',exact:true}).first().click();
await p.waitForURL(/verify/); 
for(let i=0;i<20;i++){ await p.waitForTimeout(500); const t=await p.evaluate(()=>document.body.innerText); if(/47\s*\/\s*47|47 of 47/.test(t)) break; }
console.log('verify ready s',(Date.now()-t0)/1000);
await p.screenshot({path:`${SHOTS}/22-verify.png`});
console.log(await p.evaluate(()=>document.querySelector('main')?.innerText.slice(0,4000)));
console.log('BUTTONS', (await p.evaluate(()=>[...document.querySelectorAll('main button')].map(b=>b.innerText.trim().replace(/\s+/g,' ')).slice(0,40))).join(' | '));
console.log('ERRS',errs);
await b.close();
