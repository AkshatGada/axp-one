// Buildless concept presentation only. No environment, database or network access.
import {cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, join, relative, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const allowed=join(root,'local-state/hsk-hsp');
const out=resolve(root,process.argv[2]??'local-state/hsk-hsp/presentation');
const rel=relative(allowed,out);
if(!rel||rel==='..'||rel.startsWith('../')||rel.startsWith('/'))throw Error('Choose a new directory below local-state/hsk-hsp.');
if(existsSync(out)&&readdirSync(out).length)throw Error('Presentation output must be empty; preserve earlier exports.');
const source=join(root,'apps/hsk-presentation');
const assets=['demo.css','demo.js','scenes-campaign.css','scenes-campaign.js','scenes-exchange.css','scenes-exchange.js','scenes-payment.css','scenes-payment.js'];
const fonts=['PolySans-Neutral.woff2','PolySans-Median.woff2','PolySans-NeutralMono.woff2'];
// Validate the complete input set before creating output.
const inputs=[join(source,'index.html'),...assets.map(f=>join(source,'assets',f)),...fonts.map(f=>join(root,'design-system/fonts',f))];
for(const path of inputs)if(!existsSync(path))throw Error(`Missing presentation input: ${relative(root,path)}`);
const html=readFileSync(inputs[0],'utf8');
if(!html.includes('CONCEPT DEMO')||!html.includes('EXAMPLE DATA'))throw Error('Keep concept/example-data attribution visible.');
mkdirSync(join(out,'assets'),{recursive:true});mkdirSync(join(out,'fonts'),{recursive:true});
for(const route of ['','demo','publisher-demo','advertiser-dashboard','sdk']){const target=join(out,route);mkdirSync(target,{recursive:true});writeFileSync(join(target,'index.html'),html);}
for(const file of assets)cpSync(join(source,'assets',file),join(out,'assets',file));
for(const file of fonts)cpSync(join(root,'design-system/fonts',file),join(out,'fonts',file));
console.log(JSON.stringify({out,pages:5,browserLocal:true,liveExecution:false}));
