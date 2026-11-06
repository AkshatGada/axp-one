import {openSync, closeSync, readFileSync, fstatSync, constants} from 'node:fs';
import {loadArcSDK} from './sdk.mjs';
import {arcCheck, sameAddress} from './network.mjs';
export function readArcWallet(path) {
  const fd = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  let wallet;
  try {
    const stat = fstatSync(fd);
    arcCheck(stat.isFile() && (stat.mode & 0o777) === 0o600 && stat.uid === process.getuid() && stat.size <= 16384, 'arc_wallet_permissions');
    wallet = JSON.parse(readFileSync(fd, 'utf8'));
  } finally { closeSync(fd); }
  arcCheck(wallet.network === 'arc-testnet', 'arc_wallet_network');
  const {accounts} = loadArcSDK();
  for (const role of ['payer', 'publisher']) {
    arcCheck(/^0x[0-9a-f]{64}$/i.test(wallet[role]?.privateKey ?? ''), 'arc_wallet_invalid');
    arcCheck(sameAddress(accounts.privateKeyToAccount(wallet[role].privateKey).address, wallet[role].address), 'arc_wallet_identity_mismatch');
  }
  arcCheck(!sameAddress(wallet.payer.address, wallet.publisher.address), 'arc_wallets_not_distinct');
  return wallet;
}
export function arcWalletIdentities(path) {
  const wallet = readArcWallet(path);
  return {payer: wallet.payer.address.toLowerCase(), payee: wallet.publisher.address.toLowerCase()};
}
