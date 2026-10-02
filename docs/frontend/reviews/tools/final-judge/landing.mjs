import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
const t0=Date.now();
await p.goto('http://localhost:3410/',{waitUntil:'networkidle'});
console.log('load ms',Date.now()-t0);
const H = await p.evaluate(()=>document.documentElement.scrollHeight);
console.log('height',H, 'title', await p.title());
await p.waitForTimeout(1500);
await p.screenshot({path:`${SHOTS}/01-landing-hero.png`});
// text per viewport
let i=0, shot=2;
for (let y=0;y<H;y+=500){
  await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(700);
  if (y>0 && y%1000===0 && shot<=9){ await p.screenshot({path:`${SHOTS}/${String(shot).padStart(2,'0')}-landing-y${y}.png`}); shot++; }
}
const txt = await p.evaluate(()=>document.body.innerText);
console.log(txt);
const links = await p.evaluate(()=>[...document.querySelectorAll('a,button')].map(a=>(a.innerText.trim().slice(0,50)+' -> '+(a.href||'btn'))));
console.log(links.join('\n'));
await b.close();
