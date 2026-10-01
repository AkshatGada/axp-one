// A self-contained, replay-only package. No databases, credentials or SDK vendors.
import {readFileSync,writeFileSync,mkdirSync,copyFileSync,readdirSync,statfsSync} from 'node:fs';
import {resolve,dirname,join,relative} from 'node:path';
import {createHash} from 'node:crypto';
import {loadV3Bundle} from '../../packages/v3/bundle.mjs';
const root=resolve(import.meta.dirname,'../..'),dest=join(root,'artifacts/v3/offline-presentation');
const disk=statfsSync(root);if(disk.bavail*disk.bsize<40*1024**3)throw Error('storage_floor_40GiB');
const bundle=loadV3Bundle(join(root,'artifacts/v3/replay')),copied=new Set();
function copy(p){if(copied.has(p))return;if(!p||p.startsWith('..')||p.includes('.env')||p.includes('local-state'))throw Error('package_scope');mkdirSync(dirname(join(dest,p)),{recursive:true});copyFileSync(join(root,p),join(dest,p));copied.add(p);}
function moduleClosure(p){if(copied.has(p))return;copy(p);const source=readFileSync(join(root,p),'utf8');for(const m of source.matchAll(/(?:from\s*|import\s*)['"]([^'"]+)['"]/g)){if(m[1].startsWith('.'))moduleClosure(relative(root,resolve(dirname(join(root,p)),m[1])));}}
// Static imports are required at startup. Dynamic native payment imports are
// unreachable because the only launcher always supplies replayDirectory.
moduleClosure('apps/backend/v3.mjs');copy('packages/v3/client.mjs');copy('packages/v3/client.d.mts');
for(const p of ['apps/v3-ui/index.html','apps/v3-ui/app.mjs','apps/v3-ui/style.css','design-system/fonts.css','design-system/tokens.css','docs/DESIGN_SYSTEM.md','docs/frontend/V3_HANDOFF.md','docs/frontend/v3-openapi.json','docs/frontend/v3-fixtures.json','docs/build/V3_RUNBOOK.md','docs/build/V3_RESULT.md','docs/build/V3_REVIEW.md','artifacts/v3/replay/manifest.json','artifacts/v3/replay/run.json','artifacts/v3/chain-check.json','artifacts/v3/restart.json','artifacts/v3/replay-check.json','artifacts/v3/test-report.json','artifacts/v3/presentation-check.json'])copy(p);
for(const f of readdirSync(join(root,'design-system/fonts')).filter(f=>f.endsWith('.woff2')))copy(`design-system/fonts/${f}`);
for(const f of readdirSync(join(root,'artifacts/v3/recording')).filter(f=>/\.(mp4|srt|md|json|jpg)$/.test(f)))copy(`artifacts/v3/recording/${f}`);
const launcher=`import {createV3Server} from './apps/backend/v3.mjs';\nimport {resolve} from 'node:path';\nconst port=Number(process.env.AXP_V3_PORT??8794);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('invalid_port');\nconst server=createV3Server({replayDirectory:resolve(import.meta.dirname,'artifacts/v3/replay')});\nserver.listen(port,'127.0.0.1',()=>console.log('AXP V3 recorded sandbox replay: http://127.0.0.1:'+port));\nfor(const sig of ['SIGINT','SIGTERM'])process.once(sig,()=>{server.close();server.closeAllConnections();});\n`;
writeFileSync(join(dest,'replay.mjs'),launcher);copied.add('replay.mjs');
writeFileSync(join(dest,'package.json'),JSON.stringify({name:'axp-v3-offline-presentation',private:true,type:'module',engines:{node:'>=25'},scripts:{'demo:v3:replay':'node replay.mjs'}},null,2));copied.add('package.json');
writeFileSync(join(dest,'README.md'),`# AXP V3 offline presentation\n\nRequires Node 25+, no npm install or credentials. Run npm run demo:v3:replay and open http://127.0.0.1:8794. If occupied, use AXP_V3_PORT=8795 npm run demo:v3:replay. All mutations rejected; no service/ledger/provider instantiated. Original network: hosted Solana sandbox. Presentation: recorded evidence replay.\n\nRun: ${bundle.run.runId}\nBundle hash: ${bundle.bundleHash}\n\nFour-minute silent captioned MP4, subtitle file and operator narration: artifacts/v3/recording/. Public saved account/transaction evidence is retained because the sandbox can reset. Frontend specialist contracts: docs/frontend/. Marketing and final layouts/motion remain separate. Fonts are supplied for this authorized project reference, not relicensed for unrelated redistribution.\n`);copied.add('README.md');
const digest=x=>createHash('sha256').update(x).digest('hex'),files=Object.fromEntries([...copied].sort().map(p=>[p,digest(readFileSync(join(dest,p)))]));
writeFileSync(join(dest,'package-manifest.json'),JSON.stringify({schemaVersion:'axp.v3-offline-package.v1',runId:bundle.run.runId,bundleHash:bundle.bundleHash,financialMode:'sandbox',presentation:'recorded_evidence_replay',files},null,2));
console.log(JSON.stringify({directory:dest,files:copied.size,bundleHash:bundle.bundleHash},null,2));
