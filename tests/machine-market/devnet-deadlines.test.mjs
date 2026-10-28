import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,rmSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {fixture} from './helpers/devnet-fixture.mjs';
import {makeApplicationSeal,assertRunNotClosed} from '../../packages/machine-market/devnet/deadlines.mjs';
function setup(t){const dir=realpathSync(mkdtempSync(join(tmpdir(),'axp-late-deadlines-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));return {dir,f:fixture({filename:join(dir,'journal.sqlite'),deferredDeadlines:true})};}
test('upload exceeding the old window leaves a fresh, durable application window after deployment',async t=>{
 const {f}=setup(t);let r=f.create();t.after(()=>r.close());
 assert.equal(r.plan.manifest.useBySlot,null);assert.throws(()=>r.plan.get('D0:fund:0'),{code:'APPLICATION_DEADLINES_NOT_SEALED'});assert.throws(()=>r.plan.authorization('D0:fund:0:ask'),{code:'APPLICATION_DEADLINES_NOT_SEALED'});await assert.rejects(r.sealApplicationDeadlines());await assert.rejects(r.run(),{code:'APPLICATION_DEADLINES_NOT_SEALED'});assert.equal(f.sent.length,0);
 await r.deploy();f.setSlot(20000);const sealed=await r.sealApplicationDeadlines();assert.equal(sealed.useBySlot,'26000');assert.equal(sealed.readValidUntilSlot,'30000');assert.equal(sealed.deploymentSignature,r.journal.get('deploy:new').attempt.signature);const hash=r.plan.manifestHash,attempts=r.journal.summary().actions;r.close();
 r=f.create({applicationSeal:sealed});assert.equal(r.plan.manifestHash,hash);assert.equal(r.journal.summary().actions,attempts);assert.equal(r.plan.terms.useBySlot,'26000');const result=await r.runApplication();assert.deepEqual(result.completedCases,['D0','D1','D2']);assert.equal(result.summary.totals.gross,'60000');f.setSlot(29000);assert.deepEqual(await r.sealApplicationDeadlines(),sealed);assert.equal(r.journal.getCheckpoint('application-deadlines').useBySlot,'26000');
});
test('application plan cannot open the journal with an uncommitted or extended seal',t=>{
 const {f}=setup(t);const r=f.create();r.close();const seal=makeApplicationSeal({manifestHash:f.plan.manifestHash,program:f.manifest.identities.program,deploymentSignature:'unconfirmed',deploymentSlot:'100',sealedAtSlot:'101'});assert.throws(()=>f.create({applicationSeal:seal}),{code:'APPLICATION_SEAL_NOT_DURABLE'});assert.throws(()=>f.create({applicationSeal:{...seal,useBySlot:'99999'}}),{code:'APPLICATION_SEAL'});
});
test('a closed original run is rejected read-only before signer or network access',t=>{
 const {dir}=setup(t),path=join(dir,'closed.sqlite'),db=new DatabaseSync(path);db.exec("CREATE TABLE actions(id TEXT PRIMARY KEY,state TEXT);INSERT INTO actions VALUES('buffer:close-aborted','FinalizedSuccess');");db.close();const before=readFileSync(path);assert.throws(()=>assertRunNotClosed(path),{code:'RUN_ALREADY_CLOSED'});assert.deepEqual(readFileSync(path),before);
});
