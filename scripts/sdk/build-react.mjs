import {readFileSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';

// Build-time tooling only; the published SDK has no TypeScript runtime dependency.
const require = createRequire(new URL('../../apps/product-ui/package.json', import.meta.url));
const ts = require('typescript');
const source = new URL('../../packages/publisher-sdk/react.tsx', import.meta.url);
const target = new URL('../../packages/publisher-sdk/react.mjs', import.meta.url);
const result = ts.transpileModule(readFileSync(source, 'utf8'), {
  fileName: 'react.tsx', reportDiagnostics: true,
  compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, newLine: ts.NewLineKind.LineFeed},
});
if (result.diagnostics?.some(d => d.category === ts.DiagnosticCategory.Error)) throw new Error('React adapter compilation failed');
const output = '// Generated from react.tsx by scripts/sdk/build-react.mjs.\n' + result.outputText;
if (process.argv.includes('--check')) {
  if (readFileSync(target, 'utf8') !== output) throw new Error('React adapter is stale; rebuild it');
} else writeFileSync(target, output);
