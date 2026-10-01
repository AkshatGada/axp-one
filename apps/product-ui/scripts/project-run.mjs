#!/usr/bin/env node
// Build-time projection of the recorded run into the public, vector-free, sanitized data the explorer ships.
// Inputs (read-only): <run dir>/run.json and <run dir>/manifest.json. The run dir is AXP_RUN_DIR (relative to the repo
// or absolute), default artifacts/v3/replay. Any bundle in the replay schema works; nothing here assumes one run's story.
// Never reads: artifacts/v3/sandbox-topup.json, .env*, local-state/, voucher stores.
// Outputs: src/data/run.public.json, public/run.public.json, src/data/build-meta.json.
// Fails the build on: leaked strings, numeric arrays > 64, count mismatches, broken conservation,
// any bid != computeBid(levels), any failed verify check, output > 300KB.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve, relative, isAbsolute, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { project as projectCore, structuralChecks as structuralCore, scanForbidden, longNumericArrays, PROJECTION_VERSION, FORBIDDEN } from '../src/lib/project-core.mjs';
import { verifyChecks, expectedCheckCount } from '../src/lib/verify.ts';

const here = dirname(fileURLToPath(import.meta.url));
const app = resolve(here, '..');
const repo = resolve(app, '../..');
/** Default: the fully live Devnet run (owner decision 2026-10-02). The first recording stays at artifacts/v3/replay. */
export const DEFAULT_RUN_DIR = 'artifacts/v3-devnet-live-rehearsal/replay';
export const RUN_DIR = process.env.AXP_RUN_DIR || DEFAULT_RUN_DIR;
const RUN_PATH = `${RUN_DIR.replace(/\/$/, '')}/run.json`;
const MANIFEST_PATH = `${RUN_DIR.replace(/\/$/, '')}/manifest.json`;
const shownPath = (p) => {
  const abs = isAbsolute(p) ? p : resolve(repo, p);
  const rel = relative(repo, abs);
  return rel.startsWith('..') ? `external/${basename(dirname(abs))}/${basename(abs)}` : rel;
};
export { scanForbidden, longNumericArrays, PROJECTION_VERSION };
const SIZE_BUDGET = 300 * 1024;

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');
const failures = [];
const selfChecks = [];
function recordCheck(name, ok, detail = '') {
  return check(name, ok, detail);
}
function check(name, ok, detail = '') {
  selfChecks.push({ name, ok: !!ok, ...(detail ? { detail } : {}) });
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ''}`);
}

/** Build-time projection: the shared core with Node hashing and this script's check collector. */
export function project(input, check = recordCheck) {
  return projectCore({ ...input, paths: input.paths ?? { run: shownPath(RUN_PATH), manifest: shownPath(MANIFEST_PATH) } }, { check, sha256Hex: sha256 });
}
export function structuralChecks(p, check = recordCheck, raw = null) {
  return structuralCore(p, check, raw);
}

async function main() {
  const runBytes = readFileSync(resolve(repo, RUN_PATH));
  const manifestBytes = readFileSync(resolve(repo, MANIFEST_PATH));
  const ccPath = resolve(repo, RUN_DIR, '..', 'chain-check.json');
  const chainCheck = existsSync(ccPath) ? JSON.parse(readFileSync(ccPath, 'utf8')) : null;
  const { projection, removed } = project({ runBytes, manifestBytes, chainCheck });
  structuralChecks(projection, recordCheck, JSON.parse(runBytes.toString('utf8')));
  const text = JSON.stringify(projection);
  const leaks = scanForbidden(text);
  check('sanitization: no forbidden strings', leaks.length === 0, leaks.join(', '));
  const longArrays = longNumericArrays(projection);
  check('vector guard: no numeric array longer than 64', longArrays.length === 0, longArrays.slice(0, 3).join(', '));
  const bytes = Buffer.byteLength(text);
  check('size budget <= 300KB', bytes <= SIZE_BUDGET, `${bytes} bytes`);
  const verify = await verifyChecks(projection);
  const vFail = verify.filter((v) => v.status === 'fail');
  check(`verify checks pass (${verify.length})`, vFail.length === 0, vFail.map((v) => v.id).join(', '));
  const want = expectedCheckCount(projection);
  check(`verify produces exactly the checks the run's structure implies (${want})`, verify.length === want, `${verify.length}`);

  if (failures.length) {
    console.error('project-run: FAILED');
    for (const f of failures) console.error('  x ' + f);
    process.exit(1);
  }
  mkdirSync(resolve(app, 'src/data'), { recursive: true });
  mkdirSync(resolve(app, 'public'), { recursive: true });
  writeFileSync(resolve(app, 'src/data/run.public.json'), text);
  writeFileSync(resolve(app, 'public/run.public.json'), text);
  const meta = {
    projectionVersion: PROJECTION_VERSION,
    generatedFrom: { [shownPath(RUN_PATH)]: projection.source.runSha256, [shownPath(MANIFEST_PATH)]: projection.source.manifestSha256 },
    output: { path: 'public/run.public.json', bytes, sha256: sha256(text) },
    counts: { ...projection.counts, evidenceRecords: projection.evidence.records.length, evidenceHints: projection.evidence.hints.length },
    sanitization: { removed, forbiddenStringsScanned: FORBIDDEN, vectorGuard: 'no numeric array longer than 64' },
    selfChecks,
    verify: { total: verify.length, passed: verify.filter((v) => v.status === 'pass').length, failed: vFail.length, skipped: verify.filter((v) => v.status === 'skip').length, ids: verify.map((v) => v.id), byMethod: Object.fromEntries(['recomputed', 'signature', 'arithmetic', 'policy'].map((m) => [m, verify.filter((v) => v.method === m).length])) },
  };
  writeFileSync(resolve(app, 'src/data/build-meta.json'), JSON.stringify(meta, null, 2) + '\n');
  console.log(`project-run: ok. ${bytes} bytes, ${selfChecks.length} self-checks, ${verify.length} verify checks passed.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
