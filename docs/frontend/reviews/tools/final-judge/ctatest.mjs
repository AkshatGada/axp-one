import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const ctx = await b.newContext({viewport:{width:1440,height:900}});
const p = await ctx.newPage();
await p.goto('http://localhost:3410/',{waitUntil:'networkidle'}); await p.waitForTimeout(2000);
const info = await p.evaluate(()=>{const as=[...document.querySelectorAll('a')].filter(a=>/See the working MVP/.test(a.innerText)); return as.map(a=>{const r=a.getBoundingClientRect(); const cx=r.x+r.width/2, cy=r.y+r.height/2; const top=document.elementFromPoint(cx,cy); return {cls:a.className, r:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)], top: top? (top.className+' '+top.tagName):null, inside: a.contains(top), target:a.target};});});
console.log(JSON.stringify(info,null,1));
// sample points across hero CTA
const pts = await p.evaluate(()=>{const a=[...document.querySelectorAll('a')].find(a=>/See the working MVP/.test(a.innerText)); const r=a.getBoundingClientRect(); const out=[]; for(let fx of [0.1,0.3,0.5,0.7,0.9]) for (let fy of [0.3,0.5,0.7]){const t=document.elementFromPoint(r.x+r.width*fx,r.y+r.height*fy); out.push(a.contains(t)?1:0);} return out.join('');});
console.log('hit map',pts);
const [popup] = await Promise.all([ctx.waitForEvent('page',{timeout:5000}).catch(()=>null), p.mouse.click(220,702)]);
console.log('popup', popup? popup.url():'none', 'same page url', p.url());
await b.close();
