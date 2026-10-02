// node assemble.mjs <captureDir> <out.mp4> <startOffsetSec|auto> <lengthSec>
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
const [dir, out, startArg, lenArg] = process.argv.slice(2);
const { frames } = JSON.parse(readFileSync(join(dir, 'frames.json'), 'utf8'));
// First content frame: the blank page encodes tiny; content frames are large.
const sizes = frames.map((f) => statSync(join(dir, f.file)).size);
const firstContent = sizes.findIndex((s) => s > 60000);
const base = frames[firstContent].ts;
const start = startArg === 'auto' ? 0 : Number(startArg);
const len = Number(lenArg);
const t0 = base + start, t1 = t0 + len;
// the frame showing at t0 is the last frame with ts <= t0
let i0 = frames.findLastIndex((f) => f.ts <= t0); if (i0 < 0) i0 = firstContent;
const lines = ['ffconcat version 1.0'];
let acc = 0;
for (let i = i0; i < frames.length; i++) {
  const a = Math.max(frames[i].ts, t0);
  const b = Math.min(i + 1 < frames.length ? frames[i + 1].ts : t1, t1);
  if (b <= a) { if (a >= t1) break; else continue; }
  lines.push(`file '${frames[i].file}'`, `duration ${(b - a).toFixed(6)}`);
  acc += b - a;
  if (b >= t1) break;
}
// last-frame quirk of the concat demuxer: repeat the final file
lines.push(lines[lines.length - 2]);
writeFileSync(join(dir, 'list.ffconcat'), lines.join('\n') + '\n');
console.log(JSON.stringify({ firstContent, firstContentSize: sizes[firstContent], blankBefore: firstContent, contentStartSinceFirstFrame: base - frames[0].ts, covered: acc }));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', join(dir, 'list.ffconcat'), '-vf', `fps=60,scale=1920:1080:flags=lanczos:in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p,trim=duration=${len}`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-tune', 'stillimage', '-r', '60', '-an', '-color_range', 'tv', out], { stdio: 'inherit' });
