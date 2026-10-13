import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';

const root=new URL('../../',import.meta.url);
const read=file=>readFileSync(new URL(file,root),'utf8');
const version='8.5.23';

test('Next PostCSS security pin survives the workspace and frozen lockfile',()=>{
  assert.match(read('pnpm-workspace.yaml'),new RegExp(`'next>postcss': ${version.replaceAll('.','\\.')}\\s`));
  const lock=read('pnpm-lock.yaml');
  assert.match(lock,/overrides:\n  next>postcss: 8\.5\.23\n/);
  assert.match(lock,/postcss@8\.5\.23:/);
  assert.match(lock,/      postcss: 8\.5\.23\n/);
  assert.doesNotMatch(lock,/postcss@8\.4\.31|postcss: 8\.4\.31/);
});

for(const app of ['marketing','product-ui']){
  test(`${app}: installed Next resolves the patched CSS processor`,()=>{
    const appRequire=createRequire(new URL(`apps/${app}/package.json`,root));
    const nextRequire=createRequire(appRequire.resolve('next/package.json'));
    assert.equal(nextRequire('postcss/package.json').version,version);
  });
}
