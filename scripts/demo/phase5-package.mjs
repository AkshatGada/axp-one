import {mkdirSync,readdirSync,copyFileSync,readFileSync,writeFileSync,statfsSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadReplayBundle,digest} from '../../packages/replay/bundle.mjs';
const root=resolve(import.meta.dirname,'../..'),out=join(root,'artifacts/phase5'),dest=join(out,'offline/axp-phase5');
const disk=statfsSync(root);if(disk.bavail*disk.bsize<40*1024**3)throw Error('storage_floor_40GiB');
const b=loadReplayBundle(join(out,'replay'));
// Explicit allowlist: no local-state, .env, SDK, databases, credentials or wallets.
const dirs=['apps/replay-ui','packages/replay','packages/client','design-system','docs/frontend','artifacts/phase5/replay','artifacts/phase5/frontend','artifacts/phase5/recording'];
const files=['packages/contracts/index.mjs','scripts/demo/phase5.mjs','scripts/demo/phase5-check.mjs','docs/build/PHASE5_RUNBOOK.md','docs/build/PHASE5_TASK.md','docs/build/PHASE5_RESULT.md','docs/build/PHASE5_REVIEW.md','docs/FRONTEND_HANDOFF.md','docs/DESIGN_SYSTEM.md','artifacts/phase5/test-report.json','artifacts/phase5/offline-smoke.json'];
const copy=file=>{mkdirSync(resolve(dest,file,'..'),{recursive:true});copyFileSync(join(root,file),join(dest,file));};
const tree=dir=>readdirSync(join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?tree(join(dir,e.name)):[join(dir,e.name)]);
const selected=[...dirs.flatMap(tree),...files];
for(const file of selected)copy(file);
writeFileSync(join(dest,'package.json'),JSON.stringify({name:'axp-phase5-offline-replay',version:'1.0.0',private:true,type:'module',engines:{node:'>=22'},scripts:{'demo:replay':'node scripts/demo/phase5.mjs','verify':'node scripts/demo/phase5-check.mjs'}},null,2));
writeFileSync(join(dest,'README.md'),`# AXP offline evidence replay\n\nOriginal run: ${b.run.runId}. Original network: official Solana payment sandbox. Presentation: recorded evidence replay, not fresh execution.\n\nRequires existing Node22+ and npm. No npm install, providers, database, Docker, credentials, wallet or network sandbox needed.\n\n\`\`\`sh\nnpm run verify\nnpm run demo:replay\n\`\`\`\n\nOpen http://127.0.0.1:8790 in a browser. Previous/Next or left/right arrows move through the story. If the port is in use, set AXP_REPLAY_PORT=8791. Stop with Ctrl-C.\n\nRead docs/build/PHASE5_RUNBOOK.md. Video, SRT, narration and original-frame evidence are under artifacts/phase5/recording. The silent captioned240-second video is an edited browser frame-hold walkthrough, not a continuous recording of paid execution. The sandbox may reset; use the saved account/transaction evidence, not permanent explorer availability.\n\nFrontend contracts/client/fixtures: docs/frontend/SETUP.md. No financial authority or private spending vouchers in browser code. Final design and public release are separate.\n`);
const list=[...selected,'package.json','README.md'];const hashes={};
for(const f of list){const bytes=readFileSync(join(dest,f));if(/\.(json|mjs|mts|md|css|html|srt)$/.test(f)&&/-----BEGIN (?:[A-Z]+ )?PRIVATE KEY-----|apikey_[A-Za-z0-9_]{30,}|"(?:wireBase64|unsignedWireBase64|secret|privateKey|csrf)"\s*:\s*"[^"<>]{12,}"/.test(bytes.toString()))throw Error(`private_material:${f}`);hashes[f]=digest(bytes);}
writeFileSync(join(dest,'integrity.json'),JSON.stringify({schemaVersion:'axp.offline-integrity.v1',runId:b.run.runId,bundleHash:b.bundleHash,files:hashes},null,2));
const check=spawnSync(process.execPath,[join(dest,'scripts/demo/phase5-check.mjs')],{encoding:'utf8'});if(check.status!==0)throw Error(check.stderr);console.log(check.stdout);
const archive=join(out,'axp-phase5-offline.tar.gz');const pack=spawnSync('/usr/bin/tar',['-czf',archive,'-C',join(out,'offline'),'axp-phase5'],{encoding:'utf8'});if(pack.status!==0)throw Error(pack.stderr);
writeFileSync(join(out,'package-check.json'),JSON.stringify({schemaVersion:'axp.package-check.v1',runId:b.run.runId,bundleHash:b.bundleHash,archive,archiveHash:digest(readFileSync(archive)),files:list.length,noExecutionDependencies:true},null,2));
console.log(JSON.stringify({directory:dest,archive,files:list.length},null,2));
