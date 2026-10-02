import { readFileSync, writeFileSync } from 'node:fs';
const [src, off, total, outBase] = [process.argv[2], Number(process.argv[3]), Number(process.argv[4]), process.argv[5]];
const parse = (t) => { const [h, m, s] = t.replace(',', '.').split(':'); return (+h) * 3600 + (+m) * 60 + (+s); };
const fmt = (x, sep) => { const ms = Math.round(x * 1000); const h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000), s = Math.floor(ms % 60000 / 1000), r = ms % 1000; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}${sep}${String(r).padStart(3,'0')}`; };
const cues = readFileSync(src, 'utf8').trim().split(/\n\n+/).map((b) => { const l = b.split('\n'); const [a, z] = l[1].split(' --> '); return { a: parse(a) + off, z: parse(z) + off, text: l.slice(2).join('\n') }; });
cues.at(-1).z = total;
writeFileSync(outBase + '.srt', cues.map((c, i) => `${i + 1}\n${fmt(c.a, ',')} --> ${fmt(c.z, ',')}\n${c.text}\n`).join('\n'));
writeFileSync(outBase + '.vtt', 'WEBVTT\n\n' + cues.map((c, i) => `${i + 1}\n${fmt(c.a, '.')} --> ${fmt(c.z, '.')}\n${c.text}\n`).join('\n'));
console.log(cues.length, 'cues');
