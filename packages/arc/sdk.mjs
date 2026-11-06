import {createRequire} from 'node:module';
const requireSDK = createRequire(new URL('../../tooling/arc-sdk/package.json', import.meta.url));
let sdk;
export function loadArcSDK() {
  if (sdk) return sdk;
  try {
    const viem = requireSDK('viem'), accounts = requireSDK('viem/accounts');
    const client = requireSDK('@circle-fin/x402-batching/client');
    const server = requireSDK('@circle-fin/x402-batching/server');
    sdk = {viem, accounts, client, server};
    return sdk;
  } catch {
    throw Object.assign(new Error('arc_sdk_unavailable'), {code: 'arc_sdk_unavailable'});
  }
}
