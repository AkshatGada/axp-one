import {createRequire} from 'node:module';
const require=createRequire(new URL('../../tooling/hsp-sdk/package.json',import.meta.url));
export const loadHspDependency=async name=>import(require.resolve(name));
