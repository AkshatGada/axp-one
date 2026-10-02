import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3410/',{waitUntil:'networkidle'});
// human pace scroll to Jev
for (let y=0;y<=5000;y+=500){ await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(400);}
await p.evaluate(()=>document.querySelector('#jev')?.scrollIntoView()); 
for (let k=0;k<6;k++){ await p.mouse.wheel(0,250); await p.waitForTimeout(900);} 
await p.screenshot({path:`${SHOTS}/10-landing-jev-settled.png`});
// proof
const proofY = await p.evaluate(()=>{const el=[...document.querySelectorAll('*')].find(e=>e.textContent.trim()==='It ran. Check it.'); return el? el.getBoundingClientRect().top+scrollY-150 : null;});
console.log('proofY',proofY);
for (let y=6000;y<=proofY;y+=500){ await p.evaluate(y=>window.scrollTo(0,y),y); await p.waitForTimeout(300);}
await p.evaluate(y=>window.scrollTo(0,y),proofY); await p.waitForTimeout(2500);
await p.screenshot({path:`${SHOTS}/11-landing-proof.png`});
const proofTxt = await p.evaluate(()=>{const el=[...document.querySelectorAll('section')].find(s=>s.innerText.includes('It ran. Check it.')); return el?el.innerText:'';});
console.log(proofTxt);
await p.evaluate(()=>window.scrollTo(0,document.documentElement.scrollHeight)); await p.waitForTimeout(1500);
await p.screenshot({path:`${SHOTS}/12-landing-end.png`});
// video section
const vid = await p.evaluate(()=>{const v=document.querySelector('#video'); return v? v.innerText.slice(0,300)+' | video tags:'+document.querySelectorAll('video,iframe').length : 'no #video';});
console.log(vid);
await b.close();
