// Reviewer verification only. No cloud setup, live provider calls or payments.
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {dirname, join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

export const REVIEW_DOCS = [
  'README.md', 'docs/REVIEWER_GUIDE.md', 'docs/VERIFICATION.md',
  'docs/ARCHITECTURE.md', 'pages.md', 'packages/publisher-sdk/README.md',
  'docs/accounts/STATUS.md', 'docs/accounts/SUBMISSION_READINESS_CHECKLIST.md',
  'docs/accounts/FINAL_ROLLOUT_CHECKLIST.md', 'docs/SUBMISSION_CHECKLIST.md',
  'docs/product/SDK.md', 'docs/BUILD_PROGRESS.md',
];

/** Local Markdown file targets only: does not fetch remote links or check anchors. */
export function checkReviewLinks(root, files = REVIEW_DOCS) {
  const findings = [];
  for (const file of files) {
    const path = resolve(root, file);
    if (!existsSync(path)) { findings.push(`${file}:document_missing`); continue; }
    const markdown = readFileSync(path, 'utf8').replace(/^```[^\n]*\n[\s\S]*?^```\s*$/gm, '');
    for (const match of markdown.matchAll(/\[[^\]\n]*\]\(([^)\n]+)\)/g)) {
      const target = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(target)) continue;
      let local;
      try { local = decodeURIComponent(target.split(/[?#]/, 1)[0]); }
      catch { findings.push(`${file}:invalid_link_encoding`); continue; }
      const full = resolve(dirname(path), local);
      if (relative(root, full).startsWith(`..${sep}`) || relative(root, full) === '..') {
        findings.push(`${file}:link_outside_repository`);
      } else if (!existsSync(full)) findings.push(`${file}:${local}:target_missing`);
    }
  }
  return {documents: files.length, findings};
}

export function reviewerEnvironment(env = process.env) {
  // Do not forward provider, wallet, database, auth, npm token or NODE_OPTIONS values.
  const allowed = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'TMP', 'SystemRoot', 'ComSpec',
    'PATHEXT', 'LANG', 'LC_ALL', 'TERM'];
  return {...Object.fromEntries(allowed.filter(key => typeof env[key] === 'string').map(key => [key, env[key]])),
    NEXT_TELEMETRY_DISABLED: '1', AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED: '0'};
}

export function reviewSteps(root) {
  const ui = join(root, 'apps/product-ui');
  const componentTests = ['accounts', 'advertiser-dashboard', 'publisher-demo'].flatMap(name =>
    readdirSync(join(ui, 'src/components', name)).filter(file => /\.test\.(?:ts|mjs)$/.test(file))
      .sort().map(file => join('src/components', name, file)));
  return [
    {name: 'repository-tests', cwd: root, args: ['scripts/test.mjs']},
    {name: 'product-components', cwd: ui, args: ['--test', ...componentTests]},
    ...['product-ui', 'marketing'].map(name => ({name: `${name}-typecheck`,
      cwd: join(root, 'apps', name), args: ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']})),
    {name: 'react-sdk-parity', cwd: root, args: ['scripts/sdk/build-react.mjs', '--check']},
    {name: 'repository-hygiene', cwd: root, args: ['scripts/setup/check-repository.mjs']},
  ];
}

export function runReview({root = fileURLToPath(new URL('../../', import.meta.url)),
  env = process.env, spawn = spawnSync, write = line => process.stdout.write(line)} = {}) {
  // A clean checkout is deliberate: tests must not discover real local credentials.
  if (existsSync(join(root, '.env.local'))) {
    write('Run reviewer verification in a clean checkout without .env.local.\n');
    return 1;
  }
  const links = checkReviewLinks(root);
  write(`${JSON.stringify({check: 'review-document-links', ...links})}\n`);
  if (links.findings.length) return 1;
  for (const step of reviewSteps(root)) {
    write(`\n=== ${step.name} ===\n`);
    const result = spawn(process.execPath, step.args, {cwd: step.cwd,
      env: reviewerEnvironment(env), stdio: 'inherit', timeout: 300000});
    if (result.status !== 0 || result.error || result.signal) {
      write(`FAILED ${step.name}. Inspect its output; no automatic retry was made.\n`);
      return 1;
    }
  }
  write('\nReviewer checks passed. Fixture results are separate from hosted and testnet evidence.\n');
  return 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = runReview();
}
