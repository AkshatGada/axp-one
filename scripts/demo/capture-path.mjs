import {lstatSync} from 'node:fs';
import {basename, isAbsolute, resolve} from 'node:path';

// Explicit, version-scoped operator input; never assume a macOS temp directory.
export function captureDirectory(input, version) {
  const error = `explicit_${version === 'phase5' ? '' : `${version}_`}capture_directory_required`;
  if (!['phase5', 'v2', 'v3'].includes(version) || typeof input !== 'string'
    || !isAbsolute(input) || !new RegExp(`^axp-${version}-capture\\.[A-Za-z0-9]+$`).test(basename(input))) throw Error(error);
  let stat;
  try {stat = lstatSync(input);} catch {throw Error(error);}
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw Error(error);
  return resolve(input);
}
