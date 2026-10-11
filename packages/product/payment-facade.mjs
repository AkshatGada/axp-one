// Trusted per-channel routing. Native execution mode is independent of settlement rail.
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {ContractError,settlementNetwork} from '../contracts/index.mjs';
import {createProductPayments} from './payments.mjs';
const TEMPO_TOKEN='0x20c0000000000000000000000000000000000000';
let defaultTempoFactory,tempoImportError=null;
// The optional adapter has no eager SDK/network work. Missing dependencies disable
// only Tempo, including when an operator opens a legacy Solana snapshot.
if(existsSync(fileURLToPath(new URL('./tempo-payments.mjs',import.meta.url)))) {
  try{defaultTempoFactory=(await import('./tempo-payments.mjs')).createTempoProductPayments;}
  catch(e){tempoImportError=e;}
}
const reason=e=>typeof e?.code==='string'&&/^[a-z_0-9]+$/.test(e.code)?e.code:'tempo_adapter_unavailable';
export function createProductPaymentFacade({exchange,tempoEnabled=false,tempoSigningEnabled=false,tempoWalletPath,tempoOptions={},tempoFactory=defaultTempoFactory,solanaFactory=createProductPayments,...options}={}) {
  const solana=solanaFactory({exchange,...options});let tempo=null,tempoError=tempoImportError;
  if(tempoEnabled)try{if(tempoOptions.configurationError)throw Object.assign(new Error(tempoOptions.configurationError),{code:tempoOptions.configurationError});if(typeof tempoFactory!=='function')throw Object.assign(new Error('tempo_adapter_unavailable'),{code:'tempo_adapter_unavailable'});tempo=tempoFactory({exchange,...options,...tempoOptions,walletPath:tempoWalletPath,signingEnabled:tempoSigningEnabled});}catch(e){tempoError=e;}
  const tempoStatus=()=>{const status=readTempo(w=>w.status());return {mode:'devnet',network:'tempo-testnet',chainId:42431,token:TEMPO_TOKEN,tokenSymbol:'PathUSD',decimals:6,ready:false,signingEnabled:false,reason:tempo?null:tempoEnabled?reason(tempoError):'tempo_disabled',...status};};
  // Projection failures must not turn a healthy Solana workspace into an outage.
  // Keep every frozen obligation; disable only the failing invocation's rail.
  const disableTempo=error=>{const old=tempo;tempo=null;tempoError=error;try{old?.dispose();}catch{}};
  const readTempo=fn=>{if(!tempo)return null;try{return fn(tempo);}catch(e){disableTempo(e);return null;}};
  const forNetwork=network=>{settlementNetwork(network);if(network==='solana-devnet')return solana;if(tempo)return tempo;throw new ContractError(tempoEnabled?reason(tempoError):'tempo_disabled',undefined,409);};
  const networkOf=id=>exchange.require('channels',id).settlementNetwork??'solana-devnet';
  const worker=id=>forNetwork(networkOf(id));
  const facade={identities:solana.identities,identitiesFor:network=>forNetwork(network).identities,networkStatus:network=>settlementNetwork(network)==='tempo-testnet'?tempoStatus():solana.status(),disableNetwork:(network,code)=>{if(network!=='tempo-testnet')throw new ContractError('settlement_network_invalid');disableTempo(new ContractError(code));},status:()=>({...solana.status(),networks:{'solana-devnet':{tokenSymbol:'USDC',decimals:6,...solana.status()},'tempo-testnet':tempoStatus()}}),
    freeze:campaign=>forNetwork(campaign.settlementNetwork??'solana-devnet').freeze(campaign),
    projection:id=>networkOf(id)==='tempo-testnet'?readTempo(w=>w.projection(id)):solana.projection(id),
    evidence:id=>{const rail=networkOf(id),payment=rail==='tempo-testnet'?readTempo(w=>w.evidence(id)):solana.evidence(id);if(payment)return {tokenSymbol:rail==='tempo-testnet'?'PathUSD':'USDC',decimals:6,canPayout:false,canClose:payment.canSettle===true,...payment};if(rail!=='tempo-testnet'||tempo)return payment;const c=exchange.require('channels',id);return {...tempoStatus(),channelId:id,payee:c.payee,token:c.token??TEMPO_TOKEN,phase:'unavailable',reconciliationRequired:true,canReconcile:false,canSettle:false,canPayout:false,canClose:false,depositBaseUnits:c.depositBaseUnits,acceptedBaseUnits:String(exchange.totals({channelId:id}).accepted),authorizedBaseUnits:c.authorizedBaseUnits,settledBaseUnits:c.settledBaseUnits,refundBaseUnits:c.refundBaseUnits};},
    // Metadata refresh is one rollbackable transaction. Worker sync may also
    // change charge statuses and belongs to explicit financial operations.
    sync:id=>networkOf(id)==='tempo-testnet'?readTempo(()=>exchange.syncNetworkChannel(id)):solana.sync(id),
    payout:id=>{if(networkOf(id)!=='tempo-testnet')throw new ContractError('payout_unsupported',undefined,409);return worker(id).payout(id);},
    dispose:()=>{try{tempo?.dispose();}finally{solana.dispose();}},
    // Existing operator/test callers inspect the Solana store; keep its identity.
    store:solana.store,
  };
  for(const method of ['open','drain','authorize','close','reconcile'])facade[method]=id=>worker(id)[method](id);
  return facade;
}
