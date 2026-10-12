// Disposable, network-disabled fixture only. No credentials, host mounts, ports,
// cloud migrations or existing databases. Uses an already installed postgres:17.
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

if (!process.argv.includes('--isolated-fixture')) throw Error('explicit_isolated_fixture_required');
const root = fileURLToPath(new URL('../../', import.meta.url));
const name = `axp-finance-sql-${randomBytes(6).toString('hex')}`;
function docker(args, input) {
  const r = spawnSync('docker', args, {input, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024, timeout: 60000});
  if (r.status !== 0) throw Error(`isolated_finance_sql_failed: ${(r.stderr || r.stdout || r.error?.message || 'unknown').slice(-4000)}`);
  return r.stdout;
}
let created = false;
try {
  docker(['image', 'inspect', 'postgres:17']);
  docker(['run', '--detach', '--pull', 'never', '--network', 'none', '--memory', '256m', '--cpus', '1', '--pids-limit', '128',
    '--name', name, '-e', 'POSTGRES_HOST_AUTH_METHOD=trust', '-e', 'POSTGRES_DB=axp_accounts_fixture', 'postgres:17']);
  created = true;
  let ready = false;
  for (let i = 0; i < 40; i++) {
    const logs = spawnSync('docker', ['logs', name], {encoding: 'utf8', timeout: 2000});
    if (`${logs.stdout ?? ''}${logs.stderr ?? ''}`.includes('PostgreSQL init process complete; ready for start up.') &&
        spawnSync('docker', ['exec', name, 'psql', '-U', 'postgres', '-d', 'axp_accounts_fixture', '-Atqc', 'SELECT 1'],
          {stdio: 'ignore', timeout: 2000}).status === 0) {ready = true; break;}
    await new Promise(r => setTimeout(r, 250));
  }
  if (!ready) throw Error('isolated_postgres_not_ready');
  for (const path of ['tests/support/accounts-auth-stub.sql', 'supabase/migrations/20261012_axp_account_profiles.sql',
    'supabase/migrations/20261012_axp_account_resources.sql', 'supabase/migrations/20261012_axp_account_serving.sql',
    'supabase/migrations/20261012_axp_account_finance.sql', 'supabase/tests/account_finance.sql']) {
    docker(['exec', '-i', name, 'psql', '-U', 'postgres', '-d', 'axp_accounts_fixture', '-v', 'ON_ERROR_STOP=1'], readFileSync(resolve(root, path), 'utf8'));
    console.log(`PASS ${path}`);
  }
  const remaining = docker(['exec', name, 'psql', '-U', 'postgres', '-d', 'axp_accounts_fixture', '-Atqc',
    'SELECT count(*) FROM public.axp_account_financial_records']);
  if (remaining.trim() !== '0') throw Error('fixture_rollback_failed');
  console.log('PASS finance rollback/roles/ownership/CAS. Fixture claims only; no hosted Auth or native transaction evidence.');
} finally {
  if (created) docker(['rm', '--force', '--volumes', name]);
}
