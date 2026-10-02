import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v4-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3420/settlement/',{waitUntil:'networkidle'});
await p.click('text=Solana Devnet re-settlement ↓'); await p.waitForTimeout(1200);
await p.screenshot({path:`${SHOTS}/20-settlement-devnet-header.png`});
// explorer
const tx='https://explorer.solana.com/tx/3q1XpdeKtGWb9JRwNhxNPB79scZdxpXq69Rn6jSHvyMQSBEPBqfcXVyqa8k1nnZWGrTF6MuKzvs2SdwViEyMXwyL?cluster=devnet';
await p.goto(tx,{waitUntil:'domcontentloaded',timeout:60000});
for (let i=0;i<12;i++){ await p.waitForTimeout(2500); const t=await p.innerText('body'); if(/Success|Finalized|Not Found|not found/i.test(t)&&/Slot/.test(t)) break; }
await p.screenshot({path:`${SHOTS}/21-explorer-close-tx.png`});
const t=await p.innerText('body');
console.log(t.slice(0,3500));
await b.close();
