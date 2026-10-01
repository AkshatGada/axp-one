import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {nativeSDKRoot} from '../config/local.mjs';

export async function loadNativeSDK(root=nativeSDKRoot()) {
  const manifest=JSON.parse(readFileSync(join(root,'manifest.json'),'utf8'));
  if(!manifest.imported||manifest.sourceCommit!=='c294f8903f18efc746584e3cc2961d6033b8365c'||manifest.packageVersion!=='0.11.0')throw new Error('native_sdk_not_verified');
  const base=join(root,'node_modules/@solana/mpp/dist');
  for(const [source,,expected] of manifest.moduleHashes) {
    const emitted=readFileSync(join(base,source.replace(/\.ts$/,'.js')));
    if(createHash('sha256').update(emitted).digest('hex')!==expected)throw new Error('native_sdk_changed');
  }
  const req=createRequire(join(root,'package.json'));
  const module=path=>import(pathToFileURL(join(base,path)));
  return {manifest,kit:await import(pathToFileURL(req.resolve('@solana/kit'))),
    token:await import(pathToFileURL(req.resolve('@solana-program/token'))),
    paymentChannels:await module('client/PaymentChannels.js'),sessionClient:await module('client/Session.js'),
    sessionServer:await module('server/Session.js'),onChain:await module('server/session/on-chain.js'),
    generated:await module('generated/payment-channels/index.js'),voucher:await module('shared/voucher.js')};
}
