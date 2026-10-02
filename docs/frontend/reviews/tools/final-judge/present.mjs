import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.getByRole('link',{name:'Present',exact:true}).click();
await p.waitForURL(/present/); await p.waitForTimeout(2000);
console.log('url',p.url());
await p.screenshot({path:`${SHOTS}/24-present-start.png`});
const vis = async()=> (await p.evaluate(()=>document.body.innerText)).replace(/\n+/g,' / ').slice(0,900);
console.log('T0:', await vis());
console.log('BUTTONS', (await p.evaluate(()=>[...document.querySelectorAll('button,a')].map(b=>(b.innerText||b.getAttribute('aria-label')||'').trim().replace(/\s+/g,' ')).filter(Boolean))).join(' | '));
// wait idle 15s to see if it autoplays
await p.waitForTimeout(15000);
console.log('T15 idle:', (await vis()).slice(0,300));
// advance with right arrow a few times
for (let i=1;i<=6;i++){ await p.keyboard.press('ArrowRight'); await p.waitForTimeout(5000); const t=await vis(); console.log(`\nSTEP ${i}:`, t.slice(0,600)); if(i===2) await p.screenshot({path:`${SHOTS}/25-present-step2.png`}); if(i===5) await p.screenshot({path:`${SHOTS}/26-present-step5.png`}); }
console.log('ERRS',errs);
await b.close();
