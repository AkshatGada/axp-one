import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v4-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.mouse.wheel(0,800); await p.waitForTimeout(600);
await p.screenshot({path:`${SHOTS}/02-overview-scrolled.png`});
// Present autoplay
await p.click('text=Watch the guided replay');
await p.waitForTimeout(2500);
console.log('URL',p.url());
await p.screenshot({path:`${SHOTS}/03-present-t0.png`});
console.log('--T0--\n',(await p.innerText('body')).slice(0,2500));
for (const [i,t] of [[4,12000],[5,15000],[6,15000],[7,15000],[8,20000]]) {
  await p.waitForTimeout(t);
  await p.screenshot({path:`${SHOTS}/0${i}-present.png`});
  console.log(`--shot ${i} --\n`,(await p.innerText('body')).slice(0,1500));
}
console.log('ERRS',errs);
await b.close();
