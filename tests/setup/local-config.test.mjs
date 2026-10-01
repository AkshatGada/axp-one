import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {jevApiKey, testWalletPath, nativeSDKRoot} from '../../packages/config/local.mjs';

test('deployment environment supplies provider configuration without .env.local', () => {
  const root = mkdtempSync(join(tmpdir(), 'axp-config-'));
  try {
    assert.equal(jevApiKey({root, env: {JEV_API_KEY: 'fixture-only'}}), 'fixture-only');
    assert.equal(testWalletPath({root, env: {}}), join(root, 'local-state/secrets/test-wallets.json'));
    assert.equal(nativeSDKRoot({root, env: {}}), join(root, 'local-state/phase4-sdk'));
    assert.throws(() => jevApiKey({root, env: {}}), /^Error: jev_key_unavailable$/);
  } finally {rmSync(root, {recursive: true});}
});

test('ignored local provider alias and relative path settings are portable', () => {
  const root = mkdtempSync(join(tmpdir(), 'axp-config-'));
  try {
    writeFileSync(join(root, '.env.local'), 'TYPESAFE_API_KEY="fixture-local"\nAXP_TEST_WALLET_PATH=local-state/secrets/test-wallets.json\nAXP_PAYMENT_SDK_ROOT=local-state/sdk\n');
    assert.equal(jevApiKey({root, env: {}}), 'fixture-local');
    assert.equal(jevApiKey({root, env: {JEV_API_KEY: 'fixture-env'}}), 'fixture-env');
    assert.equal(nativeSDKRoot({root, env: {}}), join(root, 'local-state/sdk'));
    assert.equal(testWalletPath({root, env: {}}), join(root, 'local-state/secrets/test-wallets.json'));
  } finally {rmSync(root, {recursive: true});}
});
