// Explicit disposable PostgreSQL test. No ports, host mounts, network, upstream
// credentials or existing databases. Requires an already installed postgres:17.
import {randomBytes} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

if(!process.argv.includes('--isolated-fixture'))throw Error('explicit_isolated_fixture_required');
const root=fileURLToPath(new URL('../../',import.meta.url));
const name=`axp-account-sql-${randomBytes(6).toString('hex')}`;
function docker(args,input) {
  const result=spawnSync('docker',args,{input,encoding:'utf8',maxBuffer:2*1024*1024,timeout:60000});
  if(result.status!==0)throw Error(`isolated_sql_failed: ${(result.stderr||result.stdout||result.error?.message||'unknown').slice(-3000)}`);
  return result.stdout;
}
let created=false;
try {
  docker(['image','inspect','postgres:17']);
  docker(['run','--detach','--pull','never','--network','none','--memory','256m','--cpus','1','--pids-limit','128','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','-e','POSTGRES_DB=axp_accounts_fixture','postgres:17']);created=true;
  let ready=false;
  for(let i=0;i<40;i++) {
    // pg_isready can succeed against the entrypoint's temporary init server
    // before POSTGRES_DB exists. Wait for init completion and a real query.
    const logs=spawnSync('docker',['logs',name],{encoding:'utf8',timeout:2000});
    if(`${logs.stdout??''}${logs.stderr??''}`.includes('PostgreSQL init process complete; ready for start up.')&&
       spawnSync('docker',['exec',name,'psql','-U','postgres','-d','axp_accounts_fixture','-Atqc','SELECT 1'],{stdio:'ignore',timeout:2000}).status===0){ready=true;break;}
    await new Promise(r=>setTimeout(r,250));
  }
  if(!ready)throw Error('isolated_postgres_not_ready');
  for(const path of ['tests/support/accounts-auth-stub.sql','supabase/migrations/20261012_axp_account_profiles.sql','supabase/migrations/20261012_axp_account_resources.sql','supabase/migrations/20261012_axp_account_serving.sql','supabase/tests/account_profiles.sql','supabase/tests/account_resources.sql','supabase/tests/account_serving.sql']) {
    let source=readFileSync(resolve(root,path),'utf8');
    // Optional diagnostics affect this disposable fixture copy only. There are
    // no customer records or credentials in the isolated database.
    if(process.argv.includes('--diagnostic')&&path==='supabase/migrations/20261012_axp_account_resources.sql')
      source=source.replaceAll("when others then raise exception using errcode='PT503',message='store_unavailable';",'when others then raise;');
    docker(['exec','-i',name,'psql','-U','postgres','-d','axp_accounts_fixture','-v','ON_ERROR_STOP=1'],source);
    console.log(`PASS ${path}`);
  }
  console.log('Isolated PostgreSQL RLS/ACL acceptance passed. Auth claims were fixtures, not real Supabase users. No cloud DB or demo state touched.');
} finally {
  if(created)docker(['rm','--force','--volumes',name]);
}
