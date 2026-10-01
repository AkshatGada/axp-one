// Public identities from the completed Phase4 packet. No wallet/key access.
import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {loadNativeSDK} from './sdk-loader.mjs';

export const V3_NETWORK=Object.freeze({mode:'sandbox',network:'solana-payment-sandbox',rpc:'https://402.surfnet.dev:8899',
  genesisHash:'5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d',
  program:'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',mint:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  tokenProgram:'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',payer:'D7GzU2o43V4whHJG1pv7k1o3UTU9yuC3Hohp1mdii6ST',
  payee:'DB4GyrEU7KPXzC4oYfKPfvct5Ja2pxXa7WZnREk3URsV'});
const TREASURY='Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP';
const sha=v=>createHash('sha256').update(v).digest('hex');
const check=(ok,reason)=>{if(!ok)throw Object.assign(new Error(reason),{reasonCode:reason});};

/** Bounded read-only RPC and one optional unsigned open/zero-seal/distribute.
 * Never uses surfnet_set*, a faucet, sendTransaction, or a wallet signer.
 * Positive-close feasibility is historical, not a fresh voucher simulation.
 */
export async function inspectV3PaymentEnvironment({simulate=true,expected=null,rpcCall,sdkProvider=loadNativeSDK}={}) {
  const result={schemaVersion:'axp.v3-payment-feasibility.v1',network:{...V3_NETWORK},observedAt:new Date().toISOString(),
    signed:false,broadcast:false,funded:false,compatible:false,zeroCloseCompatibility:'unknown',
    positiveCloseCompatibility:'historical_phase4_only'};
  try {
    const {kit,token,paymentChannels,onChain,generated,manifest}=await sdkProvider();
    result.sdk={sourceCommit:manifest.sourceCommit,packageVersion:manifest.packageVersion};
    const rpc=async(method,params=[])=>{
      // Optional trusted offline-fixture seam; no write RPC exists here.
      if(rpcCall)return rpcCall(method,params);
      const response=await fetch(V3_NETWORK.rpc,{method:'POST',redirect:'error',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(15000)});
      check(response.ok,'rpc_unavailable');const body=await response.json();check(!body.error,'rpc_error');return body.result;
    };
    check(await rpc('getGenesisHash')===V3_NETWORK.genesisHash,'genesis_mismatch');
    const account=async address=>(await rpc('getAccountInfo',[address,{encoding:'base64',commitment:'finalized'}])).value;
    const program=await account(V3_NETWORK.program);check(program?.executable,'program_unavailable');
    const data=Buffer.from(program.data[0],'base64');result.programAccountHash=sha(data);
    check(program.owner==='BPFLoaderUpgradeab1e11111111111111111111111'&&data.readUInt32LE(0)===2,'program_loader_invalid');
    result.programDataAddress=kit.getAddressDecoder().decode(data.subarray(4,36));
    const programData=await account(result.programDataAddress);check(programData?.owner===program.owner,'program_data_invalid');
    result.programDataHash=sha(Buffer.from(programData.data[0],'base64'));
    const historicalPath=resolve('artifacts/phase4/frozen-environment.json');
    if(existsSync(historicalPath)) {
      const historical=JSON.parse(readFileSync(historicalPath,'utf8')).terms;
      result.historicalDeploymentComparison={evidence:'artifacts/phase4/frozen-environment.json',
        programAccountHashMatches:historical.programAccountHash===result.programAccountHash,
        programDataHashComparison:historical.programDataHash===undefined?'unavailable_phase4_did_not_record_program_data_hash':historical.programDataHash===result.programDataHash?'identical':'different'};
    }
    for(const k of ['programAccountHash','programDataHash'])if(expected)check(result[k]===expected[k],'deployment_changed');
    const parsed=async address=>(await rpc('getAccountInfo',[address,{encoding:'jsonParsed',commitment:'finalized'}])).value;
    const mint=await parsed(V3_NETWORK.mint);
    check(mint?.owner===V3_NETWORK.tokenProgram&&mint.data?.parsed?.type==='mint'&&mint.data.parsed.info.decimals===6&&mint.data.parsed.info.isInitialized,'mint_invalid');
    result.mintDecimals=6;
    const ata=async owner=>(await token.findAssociatedTokenPda({owner:kit.address(owner),mint:kit.address(V3_NETWORK.mint),tokenProgram:kit.address(V3_NETWORK.tokenProgram)}))[0];
    const accounts={payer:await ata(V3_NETWORK.payer),payee:await ata(V3_NETWORK.payee),treasury:await ata(TREASURY)};
    result.accounts=accounts;
    const balances={};let missingCloseAccounts=0;
    for(const [role,owner] of [['payer',V3_NETWORK.payer],['payee',V3_NETWORK.payee],['treasury',TREASURY]]) {
      const a=await parsed(accounts[role]);
      if(!a){balances[`${role}BaseUnits`]='0';if(role!=='payer')missingCloseAccounts++;continue;}
      const info=a.data?.parsed?.info;
      check(a.owner===V3_NETWORK.tokenProgram&&info?.mint===V3_NETWORK.mint&&info.owner===owner&&info.state==='initialized'&&info.tokenAmount.decimals===6,'token_account_invalid');
      balances[`${role}BaseUnits`]=info.tokenAmount.amount;
    }
    balances.payerLamports=String((await rpc('getBalance',[V3_NETWORK.payer,{commitment:'finalized'}])).value);result.balances=balances;
    const tokenRent=BigInt(await rpc('getMinimumBalanceForRentExemption',[165]));
    const channelRent=BigInt(await rpc('getMinimumBalanceForRentExemption',[generated.getChannelEncoder().fixedSize]));
    result.openReserveLamports=(channelRent+tokenRent+5000n).toString();
    // Two required signatures; conservative repeated ATA-rent reservation per close.
    result.closeReserveLamports=(10000n+BigInt(missingCloseAccounts)*tokenRent).toString();
    result.aggregateFeeRentReserveLamports=(2n*(BigInt(result.openReserveLamports)+BigInt(result.closeReserveLamports))).toString();
    result.requiredDepositBaseUnits='40000';
    result.balancesSufficient=BigInt(balances.payerBaseUnits)>=40000n&&BigInt(balances.payerLamports)>=BigInt(result.aggregateFeeRentReserveLamports);
    check(BigInt(result.aggregateFeeRentReserveLamports)<=20000000n,'fee_cap_exceeded');
    if(simulate&&!result.balancesSufficient) {
      result.zeroCloseCompatibility='blocked_insufficient_test_balance';
      check(false,'insufficient_test_balances');
    }
    if(simulate) {
      const latest=await rpc('getLatestBlockhash',[{commitment:'confirmed'}]);
      const payer=kit.createNoopSigner(kit.address(V3_NETWORK.payer)),payee=kit.createNoopSigner(kit.address(V3_NETWORK.payee));
      const request={amount:'1',currency:V3_NETWORK.mint,recipient:V3_NETWORK.payee,suggestedDeposit:'20000',methodDetails:{network:'mainnet',channelProgram:V3_NETWORK.program,recentBlockhash:latest.value.blockhash,recentSlot:String(latest.context.slot),gracePeriodSeconds:900,feePayer:false}};
      const open=await paymentChannels.derivePaymentChannelOpen({request,payer:V3_NETWORK.payer,authorizedSigner:V3_NETWORK.payer,deposit:'20000',salt:String(Date.now()),tokenProgram:V3_NETWORK.tokenProgram,programAddress:kit.address(V3_NETWORK.program)});
      const channelAta=await ata(open.channelId),[eventAuthority]=await generated.findEventAuthorityPda({programAddress:kit.address(V3_NETWORK.program)});
      const opening=generated.getOpenInstruction({associatedTokenProgram:kit.address('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL'),authorizedSigner:kit.address(V3_NETWORK.payer),channel:kit.address(open.channelId),channelTokenAccount:channelAta,eventAuthority,mint:kit.address(V3_NETWORK.mint),openArgs:{deposit:20000n,gracePeriod:900,openSlot:BigInt(open.openSlot),recipients:[],salt:BigInt(open.salt)},payee:kit.address(V3_NETWORK.payee),payer,payerTokenAccount:accounts.payer,rent:kit.address('SysvarRent111111111111111111111111111111111'),rentPayer:payer,selfProgram:kit.address(V3_NETWORK.program),tokenProgram:kit.address(V3_NETWORK.tokenProgram)},{programAddress:kit.address(V3_NETWORK.program)});
      const setup=[[V3_NETWORK.payee,accounts.payee],[TREASURY,accounts.treasury]].map(([owner,ata])=>token.getCreateAssociatedTokenIdempotentInstruction({payer,ata,owner:kit.address(owner),mint:kit.address(V3_NETWORK.mint),tokenProgram:kit.address(V3_NETWORK.tokenProgram)}));
      const seal=onChain.buildSettleAndSealInstructions({channelId:open.channelId,merchantSigner:payee,programId:kit.address(V3_NETWORK.program)});
      const distribute=await onChain.buildDistributeInstruction({channelState:{channelId:open.channelId,payer:V3_NETWORK.payer,payee:V3_NETWORK.payee},mint:V3_NETWORK.mint,rentPayer:V3_NETWORK.payer,tokenProgram:V3_NETWORK.tokenProgram,splits:[],programId:kit.address(V3_NETWORK.program)});
      const message=kit.pipe(kit.createTransactionMessage({version:0}),m=>kit.setTransactionMessageFeePayer(V3_NETWORK.payer,m),m=>kit.setTransactionMessageLifetimeUsingBlockhash({...latest.value,lastValidBlockHeight:BigInt(latest.value.lastValidBlockHeight)},m),m=>kit.appendTransactionMessageInstructions([...setup,opening,...seal.instructions,distribute],m));
      const wire=kit.getBase64EncodedWireTransaction(kit.compileTransaction(message));
      const simulation=await rpc('simulateTransaction',[wire,{encoding:'base64',sigVerify:false,commitment:'confirmed'}]);
      result.simulation={err:simulation.value.err,logs:simulation.value.logs,unitsConsumed:simulation.value.unitsConsumed,slot:simulation.context.slot};
      // If open failed, seal/distribute never ran. Do not label zero-close failed.
      const failedIndex=simulation.value.err?.InstructionError?.[0];
      result.zeroCloseCompatibility=simulation.value.err===null?'passed_unsigned_simulation':typeof failedIndex==='number'&&failedIndex<3?'unknown':'failed_unsigned_simulation';
      if(simulation.value.logs?.some(line=>line.includes('Error: insufficient funds'))) {
        result.zeroCloseCompatibility='blocked_insufficient_test_balance';check(false,'insufficient_test_usdc');
      }
      check(simulation.value.err===null,'zero_close_simulation_failed');
    }
    result.compatible=true;result.status='checked';
  } catch(e) {result.status='blocked';result.reasonCode=e.reasonCode??'feasibility_unavailable';}
  return result;
}
