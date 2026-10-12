import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import {AccountApiError, AccountsClient} from './client.ts';

const source = name => readFileSync(new URL(name, import.meta.url), 'utf8');

test('account sign-in keeps its action and financial mode visible, with service detail collapsed', () => {
  const ui = source('AccountConsole.tsx');
  const welcome = ui.slice(ui.indexOf('className="account-welcome"'), ui.indexOf('{authenticated && !tokenHash && <>'));
  assert.match(welcome, /Welcome to AXP/);
  assert.match(welcome, /Simulated accounting\. No money moves on this server\./);
  assert.match(welcome, /<AuthForm/);
  assert.doesNotMatch(welcome, /Write a Sponsored card, choose the conversations/);
  assert.match(ui, /<details id="account-readiness"[^>]*open=\{!ready\}/);
  assert.match(ui, /disclosure\.open = true/); // Saved section links still reveal their target.
});

test('technical setup is on demand without hiding unsupported-category or payment limits', () => {
  assert.match(source('AccountForms.tsx'), /Unsupported entries block ad serving/);
  assert.match(source('AccountForms.tsx'), /<summary>Supported ad categories<\/summary>/);
  assert.match(source('newResourceForms.tsx'), /<summary>SDK installation and server example<\/summary>/);
  assert.match(source('AppIntegration.tsx'), /filter\(\(\[, passed\]\) => !passed\)/);
  assert.match(source('AppIntegration.tsx'), /aria-label="Setup to complete"/);
  assert.match(source('servingResources.tsx'), /Simulated totals\. No payment has taken place\./);
});

test('busy account responses explain explicit recovery and never replay sign-in', async () => {
  assert.match(new AccountApiError(429, 'product_busy_retry').message, /Refresh account/);
  let calls = 0;
  const client = new AccountsClient(async () => {
    calls++;
    return new Response(JSON.stringify({error:'product_busy_retry'}), {status:429});
  });
  await assert.rejects(client.signin({email:'fixture@example.test',password:'fixture-only-password'}), {code:'product_busy_retry'});
  assert.equal(calls, 1);
});

test('public desktop/mobile navigation and the shared dashboard link to the account console', () => {
  const masthead = source('../../../../marketing/src/v11/shell/Masthead.tsx');
  assert.equal([...masthead.matchAll(/href="\/account\/">Sign in<\/a>/g)].length, 2);
  assert.match(source('../advertiser-dashboard/AdvertiserDashboard.tsx'), /href="\/account\/">Your account/);
});
