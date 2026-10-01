import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {captureDirectory} from '../../scripts/demo/capture-path.mjs';

test('capture inputs use an explicit portable directory, not a particular Mac temp path', () => {
  for (const version of ['phase5', 'v2', 'v3']) {
    const path = mkdtempSync(join(tmpdir(), `axp-${version}-capture.`));
    try {
      assert.equal(captureDirectory(path, version), path);
      assert.throws(() => captureDirectory(undefined, version), /capture_directory_required/);
      assert.throws(() => captureDirectory(`axp-${version}-capture.ABC`, version), /capture_directory_required/);
      assert.throws(() => captureDirectory(path, 'unrecognized'), /capture_directory_required/);
    } finally {rmSync(path, {recursive: true});}
  }
});
