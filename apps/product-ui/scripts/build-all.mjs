#!/usr/bin/env node
// Static export of BOTH runs into out/:
//   out/                  the main run (default: the fully live Solana Devnet run)
//   out/first-recording/  the first recording on a hosted Solana sandbox (kept, clearly labelled; never merged)
// Each is its own build from its own bundle, with a run-switcher entry pointing at the other.
// The main run is built last, so src/data/ ends in the default state.
import { spawnSync } from 'node:child_process';
import { cpSync, rmSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const app = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = (process.env.NEXT_PUBLIC_BASE_PATH ?? '').replace(/\/$/, '');
const FIRST = { dir: 'artifacts/v3/replay', sub: 'first-recording', label: 'First recording, hosted sandbox, Oct 1' };
const MAIN_LABEL = 'Replay of a live Solana Devnet run, Oct 1';

function sh(cmd, args, env = {}) {
  const r = spawnSync(cmd, args, { cwd: app, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.error) throw r.error;
  if (r.status !== 0) process.exit(r.status ?? 1);
}
function build(env) {
  sh(process.execPath, ['scripts/project-run.mjs'], env);
  sh(process.execPath, ['scripts/project-devnet.mjs'], env);
  sh(process.execPath, ['scripts/project-live-sample.mjs'], env);
  sh(process.execPath, ['scripts/beats-to-srt.mjs'], env);
  // Use the installed, lockfile-pinned Next binary; npx may fetch packages and
  // is not available in some bundled Node runtimes.
  sh(process.execPath, [resolve(app, 'node_modules/next/dist/bin/next'), 'build'], env);
}

// 1. The first recording, under <base>/first-recording/.
rmSync(resolve(app, '.next-first'), { recursive: true, force: true });
build({
  AXP_RUN_DIR: FIRST.dir,
  NEXT_PUBLIC_BASE_PATH: `${base}/${FIRST.sub}`,
  NEXT_DIST_DIR: '.next-first',
  AXP_RUN_LABEL: FIRST.label,
  AXP_OTHER_RUN_LABEL: MAIN_LABEL,
  AXP_OTHER_RUN_HREF: `${base}/`,
  AXP_OTHER_RUN_NOTE: 'The main run: fully live on Solana Devnet',
});
// 2. The main run, into out/.
build({
  AXP_OTHER_RUN_LABEL: FIRST.label,
  AXP_OTHER_RUN_HREF: `${base}/${FIRST.sub}/`,
  AXP_OTHER_RUN_NOTE: 'An earlier recording, kept for reference; numbers never merged',
});
const out = resolve(app, 'out');
if (!existsSync(out)) throw new Error('build-all: out/ missing after the main build');
rmSync(resolve(out, FIRST.sub), { recursive: true, force: true });
cpSync(resolve(app, '.next-first'), resolve(out, FIRST.sub), { recursive: true });
for (const junk of ['cache', 'server', 'types', 'trace', 'static', 'build', 'diagnostics']) rmSync(resolve(out, FIRST.sub, junk), { recursive: true, force: true });
console.log(`build-all: out/ (main) and out/${FIRST.sub}/ (first recording)`);
