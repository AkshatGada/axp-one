import {open,SHOTS,txt} from './lib.mjs';
const {b,p,errs}=await open();
await p.goto('http://localhost:3420/',{waitUntil:'networkidle'});
await p.mouse.move(862,139); await p.waitForTimeout(800);
await p.screenshot({path:`${SHOTS}/03-hover-contexthint.png`,clip:{x:240,y:0,width:1200,height:500}});
console.log('VISIBLE TIP', await p.evaluate(()=>[...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return e.innerText&&e.innerText.includes('ContextHint')&&s.position==='absolute'||s.position==='fixed'&&e.innerText&&e.innerText.length<600&&e.offsetParent!==null}).map(e=>e.innerText.slice(0,400))));
await p.mouse.move(945,139); await p.waitForTimeout(800);
await p.screenshot({path:`${SHOTS}/04-hover-jev.png`,clip:{x:240,y:0,width:1200,height:500}});
// open issues overlay
await p.click('button[data-issues-open]').catch(e=>console.log('no issues btn'));
await p.waitForTimeout(1000);
await p.screenshot({path:`${SHOTS}/05-dev-issues.png`});
console.log((await p.evaluate(()=>{const h=document.querySelector('nextjs-portal');return h&&h.shadowRoot?h.shadowRoot.textContent.slice(0,1500):'none'})));
console.log(errs);
await b.close();
