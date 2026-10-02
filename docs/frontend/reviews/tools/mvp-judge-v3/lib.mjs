import { chromium } from '/Users/akshat/chatgpt-pixel-helper/analysis/runtime/node_modules/playwright-core/index.mjs';
export const SHOTS='/Users/akshat/agentic-dsp/docs/frontend/reviews/shots/mvp-v3-judge';
export async function open(){
  const b = await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless:true});
  const p = await b.newPage({viewport:{width:1440,height:900}});
  const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message)); p.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  return {b,p,errs};
}
export async function txt(p,n=3000){return (await p.innerText('body')).slice(0,n)}
