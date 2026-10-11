import test from 'node:test';
import assert from 'node:assert/strict';
import {suggestedPrompts} from './suggested-prompts.mjs';

test('chat suggestions match their labels when server presets start with developer tools', () => {
  const developer = 'Recommend a developer tool for building a TypeScript API.';
  const wallet = 'Compare hardware wallets with offline key storage.';
  assert.deepEqual(suggestedPrompts([developer, wallet]), [
    {label: 'Compare hardware wallets', question: wallet},
    {label: 'Explore developer tools', question: developer},
  ]);
});

test('missing categories use matching defaults rather than unrelated server presets', () => {
  const prompts = suggestedPrompts(['Find a hotel in Tokyo.']);
  assert.match(prompts[0].question, /hardware wallets/i);
  assert.match(prompts[1].question, /developer tool/i);
  assert.deepEqual(suggestedPrompts(), prompts);
});
