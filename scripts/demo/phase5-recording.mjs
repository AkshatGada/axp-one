import {readFileSync,writeFileSync,mkdirSync,copyFileSync,statfsSync,statSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {STEPS,loadReplayBundle,digest} from '../../packages/replay/bundle.mjs';
import {captureDirectory} from './capture-path.mjs';

const root=resolve(import.meta.dirname,'../..'),out=join(root,'artifacts/phase5'),recording=join(out,'recording');
const source=captureDirectory(process.argv[2],'phase5');
const disk=statfsSync(root);if(disk.bavail*disk.bsize<40*1024**3)throw Error('storage_floor_40GiB');
const b=loadReplayBundle(join(out,'replay')),capture=JSON.parse(readFileSync(join(source,'capture.json')));
if(capture.runId!==b.run.runId||capture.frames.length!==STEPS.length)throw Error('capture_binding');
mkdirSync(recording,{recursive:true});
const ffmpeg=process.env.AXP_FFMPEG_BIN??'ffmpeg',ffprobe=process.env.AXP_FFPROBE_BIN??'ffprobe';
const exec=(cmd,args)=>{const r=spawnSync(cmd,args,{encoding:'utf8',maxBuffer:2*1024**2});if(r.status!==0)throw Error(`${cmd}: ${r.stderr?.slice(-2500)}`);return r.stdout;};
const time=seconds=>`${String(Math.floor(seconds/3600)).padStart(2,'0')}:${String(Math.floor(seconds/60)%60).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')},000`;
const narration=[
  'AXP.one is an advertising exchange for the agentic internet. Advertiser agents buy separate, disclosed sponsored cards in AI applications. Agents judge fit; code enforces the money rules. This is a recorded replay, not a fresh run or purchase. The original experiment used the official hosted Solana payment sandbox—not Devnet or mainnet. The replay needs no credentials and cannot spend.',
  'TripDesk, AgentPass and HotelOps are fictional advertisers with declared travel-related capabilities. Their maximum bid is four thousand base units; the spending cap is eight thousand. Only TripDesk was funded. All three agents evaluated task fit before the separate financial eligibility check.',
  'Real historical ContextHint observations informed these profiles. Travel prompts were associated with Navan, Auth0 and Software Connect creatives; some profiles also contain inferred context hints. These brands are evidence, not enrolled advertisers. Saved creative IDs preserve the association. This is not a reconstruction of ChatGPT’s proprietary algorithm or proof of targeting lift.',
  'Here are six actual Jev decisions. TripDesk bids twice; AgentPass and HotelOps skip twice. Code maps fit and intent to a bid: four thousand times seventy-five percent equals three thousand base units. Jev cannot transfer funds or bypass constraints. Measured attempts took about one point two four to one point five one seconds—no low-latency advantage is demonstrated.',
  'The task asks for corporate travel booking and automatic expense capture. Two gpt-6.1-sol low app agents generated independent organic answers without advertiser material. An operator-recorded bridge delivered those answers to the publisher app. The Sponsored card is separate, not an undisclosed recommendation. This does not demonstrate an unattended CLI integration or cryptographic context isolation.',
  'The first owned-app placement displayed Sponsored. Its accepted acknowledgement binds the opportunity, award and creative hash, creating a three-thousand-unit charge. Acceptance is not payment finality or attention. The public signed receipt packet was reconstructed on later replay.',
  'A second disclosed placement creates another three-thousand-unit charge on the same channel. The other campaigns incur zero charges. Only one advertiser was funded; hypothetical competition and failure cases are labelled synthetic, separate from this recorded run.',
  'The trusted worker reads immutable accepted charges. Native MPP sessions verify cumulative authorizations of three thousand, then six thousand base units. Vouchers are saved before submission. Agents and browsers do not supply charge amounts or hold wallet keys. Closing uses the final voucher without another spending increment.',
  'One finalized settlement reconciles a deposit of zero point zero two test USDC, a publisher payout of zero point zero zero six, and an unused refund of zero point zero one four. Transaction fees and account rent are separate test-SOL amounts. The sandbox may reset, so saved transaction and account evidence matters more than permanent explorer availability.',
  'The original fresh-process restart preserved two charges, eight model admissions and the payment record hash. No new payment was needed. This presentation only reads files: Previous and Next cannot call models, acknowledge delivery or sign payments. Same-Mac approval remains a demo boundary, not production isolation.',
  'The connected exchange works. Attention, absorption, conversion lift and Jev’s advantage remain unproven. Rules stay the default; Jev is replaceable. The frontend specialist receives implemented APIs and labelled fixtures, while backend code retains financial authority.'
];
let elapsed=0;const segments=[];
for(let i=0;i<STEPS.length;i++){
  const step=STEPS[i],f=capture.frames[i];if(f.step!==step.id||!/^\d{2}-[a-z-]+\.(png|jpg)$/.test(f.file))throw Error('capture_order');
  const file=`${String(i+1).padStart(2,'0')}-${step.id}.jpg`;copyFileSync(join(source,f.file),join(recording,file));
  const info=JSON.parse(exec(ffprobe,['-v','error','-show_entries','stream=codec_name,width,height','-of','json',join(recording,file)]));
  if(info.streams[0].codec_name!=='mjpeg')throw Error('capture_format');
  segments.push({...f,file,width:info.streams[0].width,height:info.streams[0].height,sha256:digest(readFileSync(join(recording,file))),startSeconds:elapsed,durationSeconds:step.seconds,caption:step.caption,narration:narration[i]});elapsed+=step.seconds;
}
writeFileSync(join(recording,'captures.json'),JSON.stringify({...capture,bundleHash:b.bundleHash,captureMethod:'Actual browser navigation, full-page screenshots; edited frame holds, not continuous fresh execution',frames:segments},null,2));
writeFileSync(join(recording,'walkthrough.srt'),segments.map((s,i)=>`${i+1}\n${time(s.startSeconds)} --> ${time(s.startSeconds+s.durationSeconds)}\n${s.caption}\n`).join('\n'));
writeFileSync(join(recording,'narration.md'),`# AXP four-minute operator narration\n\nRead aloud live or use the captioned silent MP4. No microphone or generated voice was used. The video holds captured browser frames; it does not depict fresh execution. Original run: ${b.run.runId}; original network: sandbox.\n\n`+segments.map(s=>`## ${time(s.startSeconds).slice(0,8)} — ${s.step}\n\n${s.narration}\n`).join('\n'));
// Captions are rendered by the actual browser UI and remain visible in frames.
// The installed FFmpeg lacks libass/drawtext; no external font/caption dependency.
// Normalize frame dimensions before concat. Mixed full-page capture heights
// otherwise reinitialize FFmpeg's fps filter and reset part of the timeline.
const normalize='scale=1280:1200:force_original_aspect_ratio=decrease,pad=1280:1200:(ow-iw)/2:(oh-ih)/2:color=0xf5f4f0';
for(const s of segments)exec(ffmpeg,['-hide_banner','-loglevel','error','-y','-i',join(recording,s.file),'-vf',normalize,'-frames:v','1',join(recording,s.file.replace('.jpg','-frame.png'))]);
const frame=s=>s.file.replace('.jpg','-frame.png');
writeFileSync(join(recording,'frames.ffconcat'),'ffconcat version 1.0\n'+segments.map(s=>`file '${frame(s)}'\nduration ${s.durationSeconds}\n`).join('')+`file '${frame(segments.at(-1))}'\n`);
const video=join(recording,'axp-four-minute-demo.mp4');
exec(ffmpeg,['-hide_banner','-loglevel','warning','-y','-f','concat','-safe','0','-i',join(recording,'frames.ffconcat'),'-vf','fps=15,format=yuv420p','-t','240','-an','-c:v','libx264','-preset','fast','-crf','18','-movflags','+faststart',video]);
const probe=JSON.parse(exec(ffprobe,['-v','error','-show_entries','format=duration,size:stream=codec_name,codec_type,width,height','-of','json',video]));
if(Math.abs(Number(probe.format.duration)-240)>.1||probe.streams.length!==1||probe.streams[0].codec_name!=='h264'||statSync(video).size>200*1024**2)throw Error('video_bounds');
writeFileSync(join(recording,'video-check.json'),JSON.stringify({schemaVersion:'axp.video-check.v1',observedAt:new Date().toISOString(),runId:b.run.runId,bundleHash:b.bundleHash,presentationKind:'recorded_evidence_replay',financialMode:'sandbox',...probe,videoHash:digest(readFileSync(video)),subtitleHash:digest(readFileSync(join(recording,'walkthrough.srt'))),captions:'Baked into captured browser frames; matching sidecar SRT',audio:'None; matching operator narration script',visualInspection:'Required separately; ffprobe is not a legibility check'},null,2));
console.log(JSON.stringify({video,duration:probe.format.duration,bytes:probe.format.size,segments:segments.length,originalPhase4Untouched:true},null,2));
