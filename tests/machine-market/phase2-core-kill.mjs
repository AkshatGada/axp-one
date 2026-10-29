// Child-only crash fixture. Keys are freshly generated in memory, never persisted.
import { generateKeyPairSync,sign } from 'node:crypto';
import { createOutbox } from '../../packages/machine-market/native/outbox.mjs';
import { base58Encode } from '../../packages/machine-market/native/codec.mjs';
import { DatabaseSync } from 'node:sqlite';
import { createTradingStore } from '../../packages/machine-market/native/trading.mjs';
import { setup } from './native-trading-fixtures.test.mjs';
import { deriveMatchPda,deriveOrderUsePda,deriveMarketPda,domainHash,operationId } from '../../packages/machine-market/native/domain.mjs';
if(process.argv[2]&&['trading','callback','fence'].includes(process.argv[3])){
if(process.argv[3]==='trading'){
  const f=setup({after(){}},{mode:'native',filenameOverride:process.argv[2]});const sql=new DatabaseSync(process.argv[2]);sql.prepare("INSERT INTO native_registered VALUES(?,'Series','2')").run(f.series);for(const u of f.units)sql.prepare("INSERT INTO native_registered VALUES(?,'Unit','2')").run(u);sql.close();f.admit(f.order('issuer',{side:1}));const bid=f.admit(f.order('buyerA')),m=f.store.getMatch(bid.matchId),i=m.instruction;
  const accounts={payer:m.payer,beneficiary:m.beneficiary,seller:m.seller,matcher:f.run.matcher,collector:f.run.collector,market:f.run.market,series:m.series,unit:m.unit,match:deriveMatchPda({...f.run,matchId:m.id}).address,buyUse:deriveOrderUsePda({...f.run,actor:m.beneficiary,nonce:i.buyNonce}).address,sellUse:deriveOrderUsePda({...f.run,actor:m.seller,nonce:i.sellNonce}).address};
  const context={currentSlot:'3',walletContext:f.store.captureWallet(m.payer),operatorContext:f.store.captureWallet(f.run.matcher)},op=f.store.native.prepare({instruction:i,accounts,feePayer:f.run.matcher,blockhash:base58Encode(Buffer.alloc(32,70)),lastValidBlockHeight:'100',feeReserve:'100',rentReserve:'1000',contextSlot:'3',context});
  f.store.native.sign(op.id,{expectedVersion:op.version,currentSlot:'3',context,afterFence(){process.send({stage:'trading',run:f.run,operationId:op.id,matchId:m.id});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);},signers:{}});
}else{
const pairs=Array.from({length:6},()=>generateKeyPairSync('ed25519')),keys=pairs.map(p=>base58Encode(p.publicKey.export({type:'spki',format:'der'}).subarray(-32))),hex=n=>Buffer.alloc(32,n).toString('hex');
const run={genesis:hex(1),program:base58Encode(Buffer.alloc(32,2)),market:'',initializer:keys[0],marketNonce:hex(3),matcher:keys[0],gateway:keys[0],collector:keys[5],issuer:keys[1],buyerA:keys[2],buyerB:keys[3],sponsor:keys[4]};run.market=deriveMarketPda(run).address;
const box=createOutbox({filename:process.argv[2],run,authorize(){}}),instruction={type:'Init',operationId:operationId({domain:domainHash(run),type:'Init',marketNonce:run.marketNonce}),marketNonce:run.marketNonce,genesis:run.genesis,matcher:run.matcher,gateway:run.gateway,collector:run.collector,issuer:run.issuer,buyerA:run.buyerA,buyerB:run.buyerB,sponsor:run.sponsor};const op=box.prepare({instruction,accounts:{initializer:run.initializer,market:run.market},feePayer:run.matcher,blockhash:base58Encode(Buffer.alloc(32,4)),lastValidBlockHeight:'100',feeReserve:'100',rentReserve:'1000',contextSlot:'2',context:{}});
const pause=stage=>{process.send({stage,run,operationId:op.id});Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0);};
box.sign(op.id,{expectedVersion:op.version,currentSlot:'3',afterFence(){if(process.argv[3]==='fence')pause('fence');},signers:{[run.matcher](bytes){pause('callback');return sign(null,bytes,pairs[0].privateKey);}}});

}

}
