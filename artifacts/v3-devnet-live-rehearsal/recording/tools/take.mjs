import { capture } from './rec.mjs';
const take = process.argv[2];
const intro = await capture({ url: 'http://localhost:3410/?film=1', outDir: `./take${take}/intro`, seconds: 19, warmUrl: 'http://localhost:3410/' });
console.log('intro frames', intro.frames.length);
const pres = await capture({
  url: 'http://localhost:3420/present/?auto=1', outDir: `./take${take}/present`, seconds: 246, warmUrl: 'http://localhost:3420/present/',
  onTick: (p) => p.evaluate(() => { const f = document.querySelector('.pr-frame'); const z = document.querySelector('[data-zoom]'); return `${location.hash}|${f ? getComputedStyle(f).visibility : 'none'}|${document.querySelector('.lg-present')?.getAttribute('data-cursor')}|z${z?.dataset.zoom}`; }),
});
console.log('present frames', pres.frames.length);
console.log(pres.log.map((l) => `${(l.ms/1000).toFixed(2)} ${l.ev}`).join('\n'));
