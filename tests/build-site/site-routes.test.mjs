import test from 'node:test';
import assert from 'node:assert/strict';
import {siteRoutes} from '../../scripts/build-site/site-routes.mjs';

const routes = siteRoutes();
const beforeFiles = routes.slice(0, routes.findIndex(r => r.handle === 'filesystem'));
const firstTerminal = path => beforeFiles.find(r => r.src && new RegExp(r.src).test(path) && !r.continue);

test('both API surfaces route to the function ahead of static files', () => {
  for (const path of ['/api', '/api/live', '/api/runs/run-1', '/api/product/health', '/api/product/demo/answer', '/api/product/campaigns/campaign-1/launch']) assert.equal(firstTerminal(path)?.dest, '/api/index');
  assert.equal(firstTerminal('/apiary'), undefined);
});

test('root product routes and SDK alias redirect without intercepting nested pages', () => {
  for (const [path, destination] of [['/mvp', '/mvp/'], ['/advertiser-dashboard', '/advertiser-dashboard/'], ['/publisher-demo', '/publisher-demo/'], ['/sdk', '/publisher-demo/integration/'], ['/sdk/', '/publisher-demo/integration/']]) {
    assert.deepEqual(firstTerminal(path), {src: firstTerminal(path).src, status: 308, headers: {Location: destination}});
  }
  for (const path of ['/', '/mvp/', '/mvp/first-recording/', '/advertiser-dashboard/', '/publisher-demo/', '/publisher-demo/integration/']) assert.equal(firstTerminal(path), undefined);
});

test('each build asset namespace gets immutable caching, APIs never do', () => {
  const cache = routes.find(r => r.headers?.['Cache-Control']);
  for (const prefix of ['', '/mvp', '/mvp/first-recording']) assert.ok(new RegExp(cache.src).test(`${prefix}/_next/static/chunks/test.js`));
  for (const path of ['/api/product/health', '/publisher-demo/', '/mvp/live/']) assert.ok(!new RegExp(cache.src).test(path));
});

test('missing MVP pages keep the MVP 404 rather than showing the landing as a successful page', () => {
  const errors = routes.slice(routes.findIndex(r => r.handle === 'error') + 1);
  const match = errors.find(r => new RegExp(r.src).test('/mvp/missing/'));
  assert.equal(match.status, 404); assert.equal(match.dest, '/mvp/404.html');
  assert.equal(siteRoutes({mvp404: '/404.html'}).find(r => r.status === 404).dest, '/404.html');
});
