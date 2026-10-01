// One unsigned native ABI simulation per environment; never loads a wallet key.
import {mkdirSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {loadNativeSDK} from '../../packages/payments/sdk-loader.mjs';

const mode=process.argv[2];
if(!['devnet','sandbox'].includes(mode))throw new Error('choose_devnet_or_sandbox');
const settings={devnet:{rpc:'https://api.devnet.solana.com',genesisHash:'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',mint:'4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'},sandbox:{rpc:'https://402.surfnet.dev:8899',genesisHash:'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'}};
const payer='D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST',payee='DB4GyrEU7KPXzC4oYfKPfvct5Ja2pxXa7WZnREk3URsV',program='CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',tokenProgram='TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const file=resolve(`artifacts/phase4/feasibility-${mode}.json`);
if(existsSync(file))throw new Error('feasibility_attempt_already_recorded');
const network={mode,...settings[mode],program,tokenProgram,payer,payee};
async function call(method,params=[]) {
  const r=await fetch(network.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)});
  if(!r.ok)throw new Error(`rpc_http_${r.status}`);const data=await r.json();if(data.error)throw new Error(`${method}:${JSON.stringify(data.error)}`);return data.result;
}
const result={schemaVersion:'axp.phase4-feasibility.v1',network,startedAt:new Date().toISOString(),signed:false,broadcast:false,compatible:false};
mkdirSync(resolve('artifacts/phase4'),{recursive:true});
try {
  if(await call('getGenesisHash')!==network.genesisHash)throw new Error('genesis_mismatch');
  const programAccount=(await call('getAccountInfo',[program,{encoding:'base64',commitment:'finalized'}])).value;
  if(!programAccount?.executable)throw new Error('program_unavailable');
  result.programAccountHash=createHash('sha256').update(Buffer.from(programAccount.data[0],'base64')).digest('hex');
  const sdk=await loadNativeSDK(),{kit,token,paymentChannels,onChain,generated}=sdk;
  const payerSigner=kit.createNoopSigner(kit.address(payer)),payeeSigner=kit.createNoopSigner(kit.address(payee));
  const [payerAta]=await token.findAssociatedTokenPda({owner:kit.address(payer),mint:kit.address(network.mint),tokenProgram:kit.address(tokenProgram)});
  const [payeeAta]=await token.findAssociatedTokenPda({owner:kit.address(payee),mint:kit.address(network.mint),tokenProgram:kit.address(tokenProgram)});
  // Explicit test-only faucet, not a token transfer or fabricated channel account.
  if(mode==='sandbox') {
    const balance=await call('getBalance',[payer,{commitment:'finalized'}]);
    if(balance.value===0)await call('surfnet_setAccount',[payer,{lamports:20000000,data:'',executable:false,owner:'11111111111111111111111111111111',rentEpoch:0}]);
    const ata=(await call('getAccountInfo',[payerAta,{encoding:'base64',commitment:'finalized'}])).value;
    if(!ata)await call('surfnet_setTokenAccount',[payer,network.mint,{amount:20000,state:'initialized'},tokenProgram]);
    result.sandboxFaucet='Existing disposable payer only, at most .020 test SOL and .020 test USDC; no channel state injected.';
  }
  const latest=await call('getLatestBlockhash',[{commitment:'confirmed'}]);
  const request={amount:'1',currency:network.mint,recipient:payee,suggestedDeposit:'20000',methodDetails:{network:mode==='sandbox'?'mainnet':'devnet',channelProgram:program,recentBlockhash:latest.value.blockhash,recentSlot:String(latest.context.slot),gracePeriodSeconds:900,feePayer:false}};
  const parameters={request,payer,signer:payerSigner,authorizedSigner:payer,deposit:'20000',salt:String(Date.now()),tokenProgram,programAddress:kit.address(program)};
  const open=await paymentChannels.derivePaymentChannelOpen(parameters);
  const [channelAta]=await token.findAssociatedTokenPda({owner:kit.address(open.channelId),mint:kit.address(network.mint),tokenProgram:kit.address(tokenProgram)});
  const [eventAuthority]=await generated.findEventAuthorityPda({programAddress:kit.address(program)});
  const opening=generated.getOpenInstruction({associatedTokenProgram:kit.address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),authorizedSigner:kit.address(payer),channel:kit.address(open.channelId),channelTokenAccount:channelAta,eventAuthority,mint:kit.address(network.mint),openArgs:{deposit:20000n,gracePeriod:900,openSlot:BigInt(open.openSlot),recipients:[],salt:BigInt(open.salt)},payee:kit.address(payee),payer:payerSigner,payerTokenAccount:payerAta,rent:kit.address('SysvarRent111111111111111111111111111111111'),rentPayer:payerSigner,selfProgram:kit.address(program),tokenProgram:kit.address(tokenProgram)},{programAddress:kit.address(program)});
  const treasury=kit.address('Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP');
  const [treasuryAta]=await token.findAssociatedTokenPda({owner:treasury,mint:kit.address(network.mint),tokenProgram:kit.address(tokenProgram)});
  const setup=[{owner:kit.address(payee),ata:payeeAta},{owner:treasury,ata:treasuryAta}].map(({owner,ata})=>token.getCreateAssociatedTokenIdempotentInstruction({payer:payerSigner,ata,owner,mint:kit.address(network.mint),tokenProgram:kit.address(tokenProgram)}));
  const seal=onChain.buildSettleAndSealInstructions({channelId:open.channelId,merchantSigner:payeeSigner,programId:kit.address(program)});
  const distribute=await onChain.buildDistributeInstruction({channelState:{channelId:open.channelId,payer,payee},mint:network.mint,rentPayer:payer,tokenProgram,splits:[],programId:kit.address(program)});
  const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayerSigner(payerSigner,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions([...setup,opening,...seal.instructions,distribute],m));
  const wire=kit.getBase64EncodedWireTransaction(await kit.partiallySignTransactionMessageWithSigners(message));
  const simulation=await call('simulateTransaction',[wire,{encoding:'base64',sigVerify:false,commitment:'confirmed'}]);
  result.simulation={err:simulation.value.err,logs:simulation.value.logs,unitsConsumed:simulation.value.unitsConsumed,channelId:open.channelId};
  result.compatible=simulation.value.err===null;
  result.protocol='native MPP session open + zero-charge seal + distribute ABI; no settlement broadcast';
} catch(error) { result.error=error.message; }
result.completedAt=new Date().toISOString();writeFileSync(file,JSON.stringify(result,null,2));
console.log(JSON.stringify({mode,compatible:result.compatible,error:result.error??result.simulation?.err,evidence:file}));
