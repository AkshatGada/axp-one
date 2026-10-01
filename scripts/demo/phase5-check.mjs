import {readFileSync,existsSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {loadReplayBundle,digest} from '../../packages/replay/bundle.mjs';
const root=resolve(import.meta.dirname,'../..');
const b=loadReplayBundle(join(root,'artifacts/phase5/replay'));
const checks={bundle:true,runId:b.run.runId,financialMode:b.run.financialMode,presentationKind:b.run.presentationKind};
if(existsSync(join(root,'integrity.json'))){
  const manifest=JSON.parse(readFileSync(join(root,'integrity.json')));
  for(const [file,expected] of Object.entries(manifest.files)){
    if(file.includes('..')||file.startsWith('/')||!/^[-a-zA-Z0-9_/.]+$/.test(file))throw Error('integrity_path');
    if(digest(readFileSync(join(root,file)))!==expected)throw Error(`integrity_mismatch:${file}`);
  }
  checks.packageFiles=Object.keys(manifest.files).length;
}
const captures=JSON.parse(readFileSync(join(root,'artifacts/phase5/recording/captures.json')));
if(captures.bundleHash!==b.bundleHash||captures.frames.length!==b.run.steps.length)throw Error('video_source_binding');
for(const f of captures.frames)if(digest(readFileSync(join(root,'artifacts/phase5/recording',f.file)))!==f.sha256)throw Error('frame_hash');
const video=JSON.parse(readFileSync(join(root,'artifacts/phase5/recording/video-check.json')));
if(digest(readFileSync(join(root,'artifacts/phase5/recording/axp-four-minute-demo.mp4')))!==video.videoHash||digest(readFileSync(join(root,'artifacts/phase5/recording/walkthrough.srt')))!==video.subtitleHash||Number(video.format.duration)!==240)throw Error('video_hash_or_duration');
checks.videoSeconds=240;
console.log(JSON.stringify(checks,null,2));
