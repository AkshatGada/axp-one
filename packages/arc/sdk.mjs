import {createRequire} from 'node:module';
import {existsSync} from 'node:fs';
const requireSDK = createRequire(new URL('../../tooling/arc-sdk/package.json', import.meta.url));
let sdk;
export function loadArcSDK() {
  if (sdk) return sdk;
  try {
    if(existsSync(new URL('../../tooling/arc-sdk/sdk.cjs',import.meta.url)))return sdk=requireSDK('./sdk.cjs');
    const viem = requireSDK('viem'), accounts = requireSDK('viem/accounts');
    const client = requireSDK('@circle-fin/x402-batching/client');
    const server = requireSDK('@circle-fin/x402-batching/server');
    sdk = {viem, accounts, client, server};
    return sdk;
  } catch {
    throw Object.assign(new Error('arc_sdk_unavailable'), {code: 'arc_sdk_unavailable'});
  }
}
