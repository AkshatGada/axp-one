import {readFileSync, existsSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseEnv} from 'node:util';

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

// Server-side only. Do not serialize this configuration into client responses.
export function localConfiguration({env = process.env, root = repositoryRoot} = {}) {
  const path = resolve(root, '.env.local');
  const file = existsSync(path) ? parseEnv(readFileSync(path, 'utf8')) : {};
  return {...file, ...env};
}

export function jevApiKey(options) {
  const config = localConfiguration(options);
  const key = config.JEV_API_KEY || config.TYPESAFE_API_KEY;
  if (!key?.trim()) throw Error('jev_key_unavailable');
  return key;
}

export function testWalletPath(options) {
  const config = localConfiguration(options);
  return resolve(options?.root ?? repositoryRoot,
    config.AXP_TEST_WALLET_PATH || 'local-state/secrets/test-wallets.json');
}

export function nativeSDKRoot(options) {
  const config = localConfiguration(options);
  return resolve(options?.root ?? repositoryRoot,
    config.AXP_PAYMENT_SDK_ROOT || 'local-state/phase4-sdk');
}
