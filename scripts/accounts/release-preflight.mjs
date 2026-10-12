import {parseArgs} from 'node:util';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {runAccountsReleasePreflight} from '../../packages/accounts/release-preflight.mjs';

export async function main({argv = process.argv.slice(2), config = process.env,
  fetchImpl = globalThis.fetch, write = text => process.stdout.write(text)} = {}) {
  try {
    const {values} = parseArgs({args: argv, options: {
      'expected-origin': {type: 'string'}, health: {type: 'boolean'}, help: {type: 'boolean'},
    }, strict: true, allowPositionals: false});
    if (values.help) {
      write('Usage: node scripts/accounts/release-preflight.mjs --expected-origin https://EXACT-PREVIEW-HOST [--health]\n');
      return 0;
    }
    const report = await runAccountsReleasePreflight({config, expectedOrigin: values['expected-origin'],
      health: values.health === true, fetchImpl});
    write(`${JSON.stringify(report, null, 2)}\n`);
    return report.ok ? 0 : 1;
  } catch {
    // parseArgs and network errors can contain arbitrary input. Never echo them.
    write('{"ok":false,"error":"preflight_arguments_or_execution_invalid"}\n');
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = await main();
}
