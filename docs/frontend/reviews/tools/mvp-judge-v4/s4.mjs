import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v4-judge';
const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
const p = await b.newPage({viewport:{width:1440,height:900}});
await p.goto('http://localhost:3420/present/?auto=1#9',{waitUntil:'networkidle'});
await p.waitForTimeout(24000);
await p.screenshot({path:`${SHOTS}/15-present-s9-late.png`});
// manual mode slide 8
await p.goto('http://localhost:3420/present/#8',{waitUntil:'networkidle'});
await p.waitForTimeout(4000);
await p.screenshot({path:`${SHOTS}/16-present-s8-manual.png`});
await b.close();
