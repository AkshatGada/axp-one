import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,realpathSync,rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {fixture} from './helpers/devnet-fixture.mjs';
import {LIMITS,validateManifest,APPROVED_PAYER,ELF_BYTES,ELF_HASH} from '../../packages/machine-market/devnet/manifest.mjs';
function setup(t,priorFeesLamports){const dir=realpathSync(mkdtempSync(join(tmpdir(),'axp-prior-fees-')));t.after(()=>rmSync(dir,{recursive:true,force:true}));return fixture({filename:join(dir,'journal.sqlite'),priorFeesLamports});}
test('875000 prior fees are reserved before signing and counted once through current payer conservation',async t=>{
 const f=setup(t,'875000'),r=f.create();t.after(()=>r.close());const initial=r.journal.summary();assert.equal(f.signCalls.length,0);assert.equal(initial.priorFeeSpendLamports,'875000');assert.equal(initial.totals.fee,'875000');assert.equal(initial.peak,'1525240');assert.equal(String(LIMITS.fees-BigInt(initial.totals.fee)),'14125000');
 const result=await r.run(),sum=result.summary,current=result.evidence.actions.reduce((n,o)=>n+BigInt(o.actual.fee),0n);assert.equal(BigInt(sum.totals.fee),current+875000n);assert.equal(sum.currentRunFeeLiabilityLamports,String(current));assert.equal(BigInt(sum.peak),BigInt(sum.totals.fee)+BigInt(sum.totals.rent)+BigInt(sum.totals.fixture)+650240n);assert.equal(BigInt(r.journal.getCheckpoint('initial').payerBalance)-BigInt(f.raw.get(f.manifest.identities.payer).lamports),current+BigInt(sum.totals.rent));
});
test('carried fees can reject the next native reservation before any signer callback',async t=>{
 const f=setup(t,'14950001'),r=f.create();t.after(()=>r.close());await assert.rejects(r.prepare('buffer:create'),{code:'BUDGET_FEE'});assert.equal(f.signCalls.length,0);assert.equal(f.sent.length,0);assert.equal(r.journal.summary().actions,0);assert.equal(r.journal.summary().totals.fee,'14950001');
});

test('live deferred retry cannot omit or zero the known prior fee spend',t=>{
 const f=setup(t,'875000'),m=structuredClone(f.manifest);m.provenance='reviewed-devnet-run';m.identities.payer=APPROVED_PAYER;m.elf={bytes:ELF_BYTES,sha256:ELF_HASH};m.deadlinePolicy='after-deployment-v1';m.useBySlot=null;m.readValidUntilSlot=null;delete m.authorization.priorFeesLamports;assert.throws(()=>validateManifest(m),{code:'PRIOR_FEE_BINDING_REQUIRED'});m.authorization.priorFeesLamports='0';assert.throws(()=>validateManifest(m),{code:'PRIOR_FEE_BINDING_REQUIRED'});m.authorization.priorFeesLamports='875000';assert.equal(validateManifest(m).manifest.authorization.priorFeesLamports,'875000');
});
