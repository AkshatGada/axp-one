import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3410/',{waitUntil:'networkidle'});
for (let s=0;s<4800;s+=500){ await p.evaluate(s=>window.scrollTo(0,s),s); await p.waitForTimeout(250);}
await p.evaluate(()=>window.scrollTo(0,5050)); await p.waitForTimeout(2500); await p.screenshot({path:`${SHOTS}/13-landing-jev.png`}); await b.close(); process.exit(0);
for (let s=4800;s<6400;s+=100){ await p.evaluate(s=>window.scrollTo(0,s),s); await p.waitForTimeout(500);
  const vis = await p.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.children.length===0 && /87%/.test(e.textContent)); if(!el) return 'none'; const r=el.getBoundingClientRect(); const cs=getComputedStyle(el); return `${Math.round(r.top)} op=${cs.opacity} vis=${cs.visibility}`;});
  console.log(s,vis);
}
await b.close();
