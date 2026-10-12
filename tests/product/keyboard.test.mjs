import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {handleComposerKeyDown} from '../../apps/product-ui/src/components/publisher-demo/keyboard.mjs';

function press(key, changes = {}) {
  let prevented = 0, submitted = 0;
  const target = {value: '', form: {requestSubmit() { submitted++; }}};
  const event = {key, shiftKey: false, ctrlKey: false, altKey: false, metaKey: false,
    nativeEvent: {isComposing: false}, currentTarget: target,
    preventDefault() { prevented++; }, ...changes};
  handleComposerKeyDown(event);
  return {prevented, submitted, value: event.currentTarget.value};
}

test('Tab and Shift+Tab leave empty and populated composers unchanged and preserve native navigation', () => {
  for (const shiftKey of [false, true]) {
    assert.deepEqual(press('Tab', {shiftKey}), {prevented: 0, submitted: 0, value: ''});
    const target = {value: 'My own question', form: {requestSubmit() { throw new Error('unexpected submit'); }}};
    assert.deepEqual(press('Tab', {shiftKey, currentTarget: target}), {prevented: 0, submitted: 0, value: 'My own question'});
    assert.equal(target.value, 'My own question');
  }
});

test('Enter submits once; newline, composition and modified Enter preserve native behavior', () => {
  assert.deepEqual(press('Enter'), {prevented: 1, submitted: 1, value: ''});
  for (const change of [{shiftKey: true}, {ctrlKey: true}, {altKey: true}, {metaKey: true}, {nativeEvent: {isComposing: true}}]) {
    assert.deepEqual(press('Enter', change), {prevented: 0, submitted: 0, value: ''});
  }
});

test('product components contain no demo autofill and retain explicit examples and the tested keyboard handler', () => {
  const root = new URL('../../apps/product-ui/src/components/', import.meta.url);
  const editor = readFileSync(new URL('advertiser-dashboard/CampaignEditor.tsx', root), 'utf8');
  const dashboard = readFileSync(new URL('advertiser-dashboard/AdvertiserDashboard.tsx', root), 'utf8');
  const chat = readFileSync(new URL('publisher-demo/PublisherDemo.tsx', root), 'utf8');
  assert.doesNotMatch(editor + dashboard, /demoMode|Demo autofill|fillStep|isDemoAutofillKey|missingDemoValues/);
  assert.doesNotMatch(editor, /onKeyDown=/);
  assert.doesNotMatch(chat, /event\.key === 'Tab'|suggested prompt<\/|<kbd>Tab<\/kbd>/);
  assert.match(editor, /Start with an example/);
  assert.match(chat, /onClick=\{\(\) => choosePrompt\(prompt\)\}/);
  assert.match(chat, /onKeyDown=\{handleComposerKeyDown\}/);
});
