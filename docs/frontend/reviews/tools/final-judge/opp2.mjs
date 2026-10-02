import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/final-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3420/opportunity/1/',{waitUntil:'networkidle'}); await p.waitForTimeout(1000);
const panel = async()=> (await p.evaluate(()=>{const h=[...document.querySelectorAll('h2,h3')].find(h=>/^\d\. /.test(h.innerText.trim())); const c=h?.closest('section,article,div[class]'); let el=h; for(let i=0;i<4&&el;i++) el=el.parentElement; return (el||document.body).innerText;}));
for (let s=2;s<=9;s++){
  await p.getByRole('button',{name:'Next stage'}).click(); await p.waitForTimeout(1200);
  const txt = await panel();
  console.log(`\n===== STAGE ${s} =====\n`+txt.slice(0,1800));
  if (s===4) await p.screenshot({path:`${SHOTS}/16-opp1-decisions.png`});
  if (s===5) await p.screenshot({path:`${SHOTS}/17-opp1-auction.png`});
  if (s===9) await p.screenshot({path:`${SHOTS}/18-opp1-charge.png`});
}
await b.close();
