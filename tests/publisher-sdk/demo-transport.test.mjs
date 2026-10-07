import test from 'node:test';
import assert from 'node:assert/strict';
import {productRequest} from '../../apps/product-ui/src/components/publisher-demo/api.mjs';

test('reference browser transport uses same-origin CSRF and scoped delivery token without server key', async () => {
  let observed;
  const result = await productRequest('/demo/awards/award-1/render', {body: {domInserted: true}, csrf: 'browser-csrf', deliveryToken: 'scoped-token', fetch: async (url, options) => {observed = {url, options}; return {ok: true, json: async () => ({status: 'accepted'})};}});
  assert.equal(result.status, 'accepted'); assert.equal(observed.url, '/api/product/demo/awards/award-1/render');
  assert.equal(observed.options.headers['x-axp-csrf'], 'browser-csrf');
  assert.equal(observed.options.headers['x-axp-delivery-token'], 'scoped-token');
  assert.equal('x-axp-publisher-key' in observed.options.headers, false);
  assert.equal(observed.options.credentials, 'same-origin');
});
test('browser transport times out once, preserves explicit API errors, and refuses external paths', async () => {
  let calls = 0;
  await assert.rejects(productRequest('/demo/chat', {timeoutMs: 10, fetch: () => {calls++; return new Promise(() => {});}}), /request_timeout/);
  assert.equal(calls, 1);
  await assert.rejects(productRequest('/demo/chat', {fetch: async () => ({ok: false, status: 409, json: async () => ({error: 'turn_conflict'})})}), /turn_conflict/);
  await assert.rejects(productRequest('https://remote.example/steal', {fetch: () => {calls++;}}), /invalid_product_path/);
  assert.equal(calls, 1);
});
