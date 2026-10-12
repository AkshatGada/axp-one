import test from 'node:test';
import assert from 'node:assert/strict';
import {accountViews, accountViewForFragment} from './navigation.ts';

test('account view fragments preserve every sidebar destination', () => {
  for (const view of accountViews) assert.equal(accountViewForFragment(`#${view}`), view);
});

test('saved campaign and app section links restore their owning view after reload', () => {
  for (const section of ['advertiser-profile','owned-campaigns','campaign-editor','campaign-preview','campaign-approve','campaign-serving','campaign-activity'])
    assert.equal(accountViewForFragment(`#${section}`), 'advertiser');
  for (const section of ['ai-apps','app-credentials','app-integrate','app-readiness','app-report'])
    assert.equal(accountViewForFragment(`#${section}`), 'app');
  assert.equal(accountViewForFragment('#own-wallet-funding'), 'wallet');
  for (const section of ['personal-profile','organizations','account-readiness'])
    assert.equal(accountViewForFragment(`#${section}`), 'settings');
});

test('unknown fragments and nonlocal values cannot select another account view', () => {
  for (const fragment of ['', '#main', '#unknown', '#app-report-extra', '#__proto__', '#constructor', '#%61pp', 'app', 'https://example.test/#app'])
    assert.equal(accountViewForFragment(fragment), null);
});
