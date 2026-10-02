import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/verify/',{waitUntil:'networkidle'}); await p.waitForTimeout(2500);
const btn=p.getByRole('button',{name:'Tamper with one byte'});
await btn.scrollIntoViewIfNeeded(); await p.mouse.wheel(0,-150);
await btn.click(); await p.waitForTimeout(1500);
await p.screenshot({path:`${SHOTS}/19-verify-tampered.png`});
const m=await p.innerText('main'); const i=m.indexOf('Tamper with one byte'); console.log(m.slice(0,300)+'\n...\n'+m.slice(i,i+1200));
await p.getByRole('button',{name:'Reset'}).click(); await p.waitForTimeout(1000);
const m2=await p.innerText('main'); const k=m2.indexOf('Tamper with one byte'); console.log('\nAFTER RESET:\n'+m2.slice(k,k+700));
// scroll to bottom of verify for remaining sections
const j=m2.indexOf('Voucher arithmetic'); console.log('\nTAIL:\n'+m2.slice(j,j+3500));
console.log(errs);
await b.close();
