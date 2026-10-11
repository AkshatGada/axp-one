import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {flattenTempoSDK} from '../../scripts/build-site/flatten-tempo-sdk.mjs';

test('runtime packaging includes reachable SDK dependencies without operator secrets',()=>{
 const dir=mkdtempSync(join(tmpdir(),'tempo-packaging-'));
 try {
  const source=join(dir,'source'),target=join(dir,'function');mkdirSync(join(source,'node_modules/sdk/node_modules/helper'),{recursive:true});
  writeFileSync(join(source,'package.json'),JSON.stringify({private:true,dependencies:{sdk:'1.0.0'}}));
  writeFileSync(join(source,'.env.local'),'must-not-be-bundled');
  writeFileSync(join(source,'node_modules/sdk/package.json'),JSON.stringify({name:'sdk',version:'1.0.0',main:'index.js',dependencies:{helper:'2.0.0'}}));
  writeFileSync(join(source,'node_modules/sdk/index.js'),'module.exports=require("helper")');
  writeFileSync(join(source,'node_modules/sdk/node_modules/helper/package.json'),JSON.stringify({name:'helper',version:'2.0.0',main:'index.js'}));
  writeFileSync(join(source,'node_modules/sdk/node_modules/helper/index.js'),'module.exports=42');
  const result=flattenTempoSDK(source,target);assert.equal(result.packages,2);
  assert.equal(JSON.parse(readFileSync(join(target,'node_modules/helper/package.json'))).version,'2.0.0');
  assert.throws(()=>readFileSync(join(target,'.env.local')),{code:'ENOENT'});
 } finally {rmSync(dir,{recursive:true,force:true});}
});
