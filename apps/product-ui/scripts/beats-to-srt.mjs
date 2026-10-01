#!/usr/bin/env node
// Writes the Present-mode captions as SRT (public/present.srt) from src/present/beats.ts and the projection.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEATS } from '../src/present/beats.ts';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const run = JSON.parse(readFileSync(resolve(app, 'src/data/run.public.json'), 'utf8'));
const ts = (ms) => {
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000), x = ms % 1000;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(x).padStart(3, '0')}`;
};
const extra = { devnet: existsSync(resolve(app, 'src/data/devnet.public.json')) };
let t = 0;
const blocks = BEATS.map((b, i) => {
  const start = t;
  t += b.durationMs;
  return `${i + 1}\n${ts(start)} --> ${ts(t - 1)}\n${b.caption(run, extra)}\n`;
});
const out = resolve(app, process.argv[2] ?? 'public/present.srt');
writeFileSync(out, blocks.join('\n'));
console.log(`beats-to-srt: ${BEATS.length} captions, ${ts(t)} total -> ${out}`);
