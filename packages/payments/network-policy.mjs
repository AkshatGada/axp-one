import { fail } from './voucher.mjs';
export const DEVNET_CONFIG = Object.freeze({
  mode: 'devnet', network: 'devnet', rpc: 'https://api.devnet.solana.com',
  genesisHash: 'EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG',
  program: 'CHNLxYvVA28MJP9PrFuDXccuoGXAx7jBacfLEkahyGsX',
  mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  tokenProgram: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', decimals: 6,
  sdkTreasury: 'Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP',
});
/** A policy check, not proof that the deployed treasury or ABI matches the SDK. */
export function validateDevnetConfig(config, { observedGenesisHash, expectedPayee, deployedTreasury } = {}) {
  for (const field of ['mode', 'network', 'rpc', 'program', 'mint', 'tokenProgram', 'decimals', 'sdkTreasury', 'genesisHash']) if (config[field] !== DEVNET_CONFIG[field]) fail('terms_mismatch');
  if (observedGenesisHash !== undefined && observedGenesisHash !== DEVNET_CONFIG.genesisHash) fail('terms_mismatch');
  if (expectedPayee !== undefined && config.payee !== expectedPayee) fail('terms_mismatch');
  if (deployedTreasury !== undefined && deployedTreasury !== DEVNET_CONFIG.sdkTreasury) fail('terms_mismatch');
  return { status: 'unverified', mode: 'devnet', reasonCode: 'compatibility_unverified' };
}
