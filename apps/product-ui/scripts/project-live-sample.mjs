#!/usr/bin/env node
// One finished live run for copies of the MVP that cannot start a run (a static site with no live-run API).
// Copies the hosted live-run end-to-end bundle (artifacts/hosted-live-e2e: started through the live-run service and
// acknowledged from a browser page's DOM, settled on Solana Devnet) into public/live-runs/<runId>/, so
// /live/run/?id=<runId> can fetch its exact bytes and project and check them in the browser, as it does for a run
// served by the API. Writes src/data/live-sample.json (runId and when it finished; null when the bundle is absent).
// Asserts: the manifest's run.json hash matches the bytes, Devnet mode, a chain check sits beside it.
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(app, '../..');
const dirArg = process.env.AXP_LIVE_SAMPLE_DIR || 'artifacts/hosted-live-e2e';
const SRC = isAbsolute(dirArg) ? dirArg : resolve(repo, dirArg);
const OUT_DATA = resolve(app, 'src/data/live-sample.json');
const OUT_PUBLIC = resolve(app, 'public/live-runs');

function fail(msg) {
  console.error(`project-live-sample: ${msg}`);
  process.exit(1);
}

const files = { run: resolve(SRC, 'replay/run.json'), manifest: resolve(SRC, 'replay/manifest.json'), chain: resolve(SRC, 'chain-check.json') };
rmSync(OUT_PUBLIC, { recursive: true, force: true });
if (!Object.values(files).every(existsSync)) {
  writeFileSync(OUT_DATA, JSON.stringify({ runId: null }, null, 2) + '\n');
  console.log(`project-live-sample: no bundle at ${dirArg}; the static Run it live page links only to the hosted site`);
  process.exit(0);
}
const runBytes = readFileSync(files.run);
const manifest = JSON.parse(readFileSync(files.manifest, 'utf8'));
const chain = JSON.parse(readFileSync(files.chain, 'utf8'));
const hash = createHash('sha256').update(runBytes).digest('hex');
if (manifest.files?.['run.json'] !== hash) fail(`run.json hash ${hash} does not match the manifest`);
if (manifest.financialMode !== 'devnet') fail(`financial mode ${manifest.financialMode}, expected devnet`);
if (chain.runId && chain.runId !== manifest.runId) fail(`chain-check run ${chain.runId} is not ${manifest.runId}`);
if (!/^[\w.-]+$/.test(manifest.runId)) fail(`unsafe run id ${manifest.runId}`);

const dest = resolve(OUT_PUBLIC, manifest.runId);
mkdirSync(resolve(dest, 'replay'), { recursive: true });
copyFileSync(files.run, resolve(dest, 'replay/run.json'));
copyFileSync(files.manifest, resolve(dest, 'replay/manifest.json'));
copyFileSync(files.chain, resolve(dest, 'chain-check.json'));
writeFileSync(OUT_DATA, JSON.stringify({ runId: manifest.runId, finishedAt: manifest.createdAt }, null, 2) + '\n');
console.log(`project-live-sample: ${manifest.runId} -> public/live-runs/ (${runBytes.length} bytes)`);
