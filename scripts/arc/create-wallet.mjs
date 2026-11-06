// Explicit one-time isolated testnet signer creation. Refuses to replace a wallet.
import {mkdirSync, writeFileSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {loadArcSDK} from '../../packages/arc/sdk.mjs';
const path = resolve(process.env.AXP_ARC_WALLET_PATH ?? 'local-state/arc/secrets/arc-wallet.json');
if (!path.includes(`${resolve('local-state')}/`)) throw Error('Use ignored local-state for disposable testnet keys.');
const {accounts} = loadArcSDK();
const identity = () => {
  const privateKey = accounts.generatePrivateKey();
  return {address: accounts.privateKeyToAccount(privateKey).address, privateKey};
};
const wallet = {network: 'arc-testnet', payer: identity(), publisher: identity()};
mkdirSync(dirname(path), {recursive: true, mode: 0o700});
writeFileSync(path, JSON.stringify(wallet), {mode: 0o600, flag: 'wx'});
console.log(JSON.stringify({network: wallet.network, payer: wallet.payer.address, publisher: wallet.publisher.address, message: 'Private keys saved only in ignored private state. Fund payer using the Circle Arc Testnet USDC faucet.'}, null, 2));
