import {readFileSync,writeFileSync,mkdirSync,readdirSync,statSync,statfsSync} from 'node:fs';
import {resolve,join,relative} from 'node:path';
import {digest,loadReplayBundle} from '../../packages/replay/bundle.mjs';

const root=resolve('.'),out=join(root,'artifacts/phase5'),bundle=join(out,'replay');
const disk=statfsSync(root);if(disk.bavail*disk.bsize<40*1024**3)throw Error('40GiB_free_floor');
mkdirSync(bundle,{recursive:true});
function preservedFiles(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?preservedFiles(join(dir,e.name)):e.name.endsWith('.json')||e.name.endsWith('.png')||e.name.endsWith('.sqlite')||e.name.includes('.sqlite-')?[join(dir,e.name)]:[]);}
if(!process.argv.includes('--verify-only')) {
  const baseline=join(out,'preservation.json');if(!statMaybe(baseline)){const dirs=['artifacts/phase3','artifacts/phase4','local-state/phase3','local-state/phase4'];const files=dirs.filter(d=>statMaybe(join(root,d))).flatMap(d=>preservedFiles(join(root,d)));writeFileSync(baseline,JSON.stringify({capturedAt:new Date().toISOString(),files:Object.fromEntries(files.map(f=>[relative(root,f),digest(readFileSync(f))]))},null,2));}
  const profilesPath=join(bundle,'source-profiles.json');
  if(!statMaybe(profilesPath)){
    // One existing local public-bootstrap read. Never persist its CSRF token.
    const response=await fetch('http://127.0.0.1:8789/v1/bootstrap',{signal:AbortSignal.timeout(5000),redirect:'error'});if(!response.ok)throw Error('existing_profile_capture_unavailable');const b=await response.json();if(b.runId!=='phase4-20261001-acceptance'||b.mode!=='sandbox'||!b.demo?.profiles)throw Error('wrong_source_console');
    writeFileSync(profilesPath,JSON.stringify({runId:b.runId,task:b.demo.task,profiles:b.demo.profiles,capturedAt:new Date().toISOString(),captureKind:'existing_public_local_bootstrap',noNewLookup:true},null,2));
  }
  for(const [name,source] of [['connected-run.json','artifacts/phase4/connected-run.json'],['chain-check.json','artifacts/phase4/chain-check.json'],['restart-replay.json','artifacts/phase4/restart-replay.json'],['phase2-summary.json','artifacts/phase2/summary.json']])writeFileSync(join(bundle,name),readFileSync(join(root,source)));
  const files=Object.fromEntries(readdirSync(bundle).filter(f=>f.endsWith('.json')&&f!=='manifest.json').sort().map(f=>[f,digest(readFileSync(join(bundle,f)))]));
  writeFileSync(join(bundle,'manifest.json'),JSON.stringify({schemaVersion:'axp.replay-bundle.v1',runId:'phase4-20261001-acceptance',financialMode:'sandbox',presentationKind:'recorded_evidence_replay',createdAt:new Date().toISOString(),files,integrityBoundary:'SHA256 prevents accidental alteration; not an independently trusted attestation or original-time signature.'},null,2));
}
const verified=loadReplayBundle(bundle),baseline=JSON.parse(readFileSync(join(out,'preservation.json'),'utf8'));
const changed=Object.entries(baseline.files).filter(([path,expected])=>digest(readFileSync(join(root,path)))!==expected).map(([path])=>path);if(changed.length)throw Error(`original_state_changed:${changed.join(',')}`);
console.log(JSON.stringify({verified:true,bundleHash:verified.bundleHash,runId:verified.run.runId,decisions:verified.run.decisions.length,deliveries:verified.run.deliveries.length,preservedFiles:Object.keys(baseline.files).length,changed:0},null,2));
function statMaybe(path){try{return statSync(path);}catch{return null;}}
