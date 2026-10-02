import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v4-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const p = await b.newPage({viewport:{width:1440,height:900}});
const errs=[]; p.on('pageerror',e=>errs.push(e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
await p.goto('http://localhost:3420/present/?auto=1#6',{waitUntil:'networkidle'});
let last='';
const t0=Date.now(); let n=9;
while (Date.now()-t0 < 150000) {
  await p.waitForTimeout(3000);
  const hdr = (await p.innerText('body')).split('\n').slice(0,3).join(' | ');
  if (hdr!==last) { 
    // wait for reveal to settle
    await p.waitForTimeout(9000);
    const name=`${String(n).padStart(2,'0')}-present.png`; n++;
    await p.screenshot({path:`${SHOTS}/${name}`});
    console.log(`== ${name} ${((Date.now()-t0)/1000).toFixed(0)}s ${p.url()}\n`, (await p.innerText('body')).slice(0,1800));
    last=hdr;
    if (n>14) break;
  }
}
console.log('ERRS',errs);
await b.close();
