import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const ctx = await b.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage();
await p.goto('http://localhost:3410/',{waitUntil:'networkidle'});
for (const wait of [500,3000,8000]) {
 await p.waitForTimeout(wait);
 const r = await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>/See the working MVP/.test(a.innerText)); const r=a.getBoundingClientRect(); const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); const line=document.querySelector('[class*=hero_line]'); const cs=getComputedStyle(line); return {top:t.className, lineIsAncestor: line.contains(a), aPE:getComputedStyle(a).pointerEvents, linePE:cs.pointerEvents, lineZ:cs.zIndex, lineOp:cs.opacity, lineRect:JSON.stringify(line.getBoundingClientRect()), lineHTML: line.outerHTML.slice(0,200)};});
 console.log(wait, JSON.stringify(r,null,1));
}
// header CTA
const h = await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>a.innerText.trim()==='See the MVP'); const r=a.getBoundingClientRect(); const t=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2); return a.contains(t);});
console.log('header CTA clickable', h);
const [popup] = await Promise.all([ctx.waitForEvent('page',{timeout:5000}).catch(()=>null), p.mouse.click(1270,35)]);
console.log('header popup', popup? popup.url():'none', p.url());
await b.close();
