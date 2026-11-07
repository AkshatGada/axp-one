// Bundle the pinned official SDK's runtime rather than shipping its ~96 MB of
// source/types/tests alongside the existing Solana and Tempo dependencies.
import {createRequire} from 'node:module';
import {mkdirSync,copyFileSync} from 'node:fs';
import {join,resolve} from 'node:path';
const requireBuild=createRequire(new URL('../../tooling/arc-preview/package.json',import.meta.url));
export function bundleArcSDK(root,destination) {
  const {buildSync}=requireBuild('esbuild');
  mkdirSync(destination,{recursive:true});
  copyFileSync(join(root,'tooling/arc-sdk/package.json'),join(destination,'package.json'));
  buildSync({stdin:{contents:`module.exports={viem:require('viem'),accounts:require('viem/accounts'),client:require('@circle-fin/x402-batching/client'),server:require('@circle-fin/x402-batching/server')};`,resolveDir:resolve(root,'tooling/arc-sdk')},
    outfile:join(destination,'sdk.cjs'),bundle:true,platform:'node',format:'cjs',target:'node22',logLevel:'silent'});
}
