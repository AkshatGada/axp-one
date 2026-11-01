// Public, non-secret settlement metadata. Financial terms remain server-owned.
export const SOLANA_NETWORK = 'solana-devnet';
export const TEMPO_NETWORK = 'tempo-testnet';
export const SETTLEMENT_NETWORKS = Object.freeze({
  'hsk-testnet': Object.freeze({network:'hsk-testnet',label:'HSK Testnet · HSP QA',chainId:133,decimals:6,canPayout:false,paymentModel:'direct'}),
  [SOLANA_NETWORK]: Object.freeze({network:SOLANA_NETWORK,label:'Solana Devnet',tokenSymbol:'Test USDC',decimals:6,canPayout:false}),
  [TEMPO_NETWORK]: Object.freeze({network:TEMPO_NETWORK,label:'Tempo Testnet',chainId:42431,token:'0x20c0000000000000000000000000000000000000',tokenSymbol:'PathUSD',decimals:6,escrow:'0x4d50500000000000000000000000000000000000',rpcURL:'https://rpc.moderato.tempo.xyz',explorerURL:'https://explore.testnet.tempo.xyz',canPayout:true}),
});
export function settlementNetwork(value, fallback=SOLANA_NETWORK) {
  const network=value??fallback;
  if(!Object.hasOwn(SETTLEMENT_NETWORKS,network))throw Object.assign(new Error('settlement_network_invalid'),{code:'settlement_network_invalid',status:400});
  return network;
}
