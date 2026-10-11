import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {mergeStaticTree, publishProductStatic, verifyPageAssets} from '../../scripts/build-site/product-static.mjs';

function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), 'axp-site-'));
  t.after(() => rmSync(dir, {recursive: true, force: true}));
  const put = (path, text) => { mkdirSync(dirname(join(dir, path)), {recursive: true}); writeFileSync(join(dir, path), text); };
  return {dir, put};
}

test('root products share root asset URLs without replacing landing or exposing recorded pages', t => {
  const {dir, put} = fixture(t);
  for (const page of ['advertiser-dashboard', 'publisher-demo', 'publisher-demo/integration']) {
    put(`product/${page}/index.html`, '<script src="/_next/static/chunks/product-123.js"></script>');
    put(`product/${page}/index.txt`, `rsc:${page}`);
  }
  put('product/index.html', 'recorded explorer');
  put('product/settlement/index.html', 'recorded settlement');
  put('product/_next/static/chunks/product-123.js', 'product chunk');
  put('product/_next/static/chunks/shared-456.js', 'shared chunk');
  put('static/index.html', 'landing');
  put('static/_next/static/chunks/shared-456.js', 'shared chunk');
  put('static/mvp/index.html', 'MVP replay');
  publishProductStatic(join(dir, 'product'), join(dir, 'static'));
  assert.equal(readFileSync(join(dir, 'static/index.html'), 'utf8'), 'landing');
  assert.equal(readFileSync(join(dir, 'static/mvp/index.html'), 'utf8'), 'MVP replay');
  assert.equal(readFileSync(join(dir, 'static/publisher-demo/integration/index.txt'), 'utf8'), 'rsc:publisher-demo/integration');
  assert.ok(existsSync(join(dir, 'static/_next/static/chunks/product-123.js')));
  assert.ok(!existsSync(join(dir, 'static/settlement')));
});

test('different bytes under the same asset name fail instead of corrupting landing hydration', t => {
  const {dir, put} = fixture(t);
  put('source/chunk.js', 'product'); put('target/chunk.js', 'landing');
  assert.throws(() => mergeStaticTree(join(dir, 'source'), join(dir, 'target')), /static_asset_collision/);
  assert.equal(readFileSync(join(dir, 'target/chunk.js'), 'utf8'), 'landing');
});

test('a recorded base-path export cannot masquerade as the root product export', t => {
  const {dir, put} = fixture(t);
  put('product/advertiser-dashboard/index.html', '<script src="/mvp/_next/static/chunks/a.js"></script>');
  assert.throws(() => publishProductStatic(join(dir, 'product'), join(dir, 'static')), /product_base_path_invalid/);
});

test('missing product and SDK guide exports fail the production build', t => {
  const {dir, put} = fixture(t);
  assert.throws(() => publishProductStatic(join(dir, 'product'), join(dir, 'static')), /missing_product_export/);
  for (const page of ['advertiser-dashboard', 'publisher-demo']) put(`product/${page}/index.html`, '<script src="/_next/static/chunks/a.js"></script>');
  assert.throws(() => publishProductStatic(join(dir, 'product'), join(dir, 'static')), /missing_product_sdk_guide/);
});

test('static assembly rejects symlinks outside the selected export', t => {
  const {dir, put} = fixture(t);
  put('private/secret.txt', 'do not publish'); mkdirSync(join(dir, 'source'));
  symlinkSync(join(dir, 'private/secret.txt'), join(dir, 'source/leak.txt'));
  assert.throws(() => mergeStaticTree(join(dir, 'source'), join(dir, 'target')), /static_symlink_not_allowed/);
  assert.ok(!existsSync(join(dir, 'target/leak.txt')));
});

test('assets are checked in their actual landing, product and nested MVP namespaces', t => {
  const {dir, put} = fixture(t);
  for (const prefix of ['', '/mvp', '/mvp/first-recording']) {
    const page = `${prefix.slice(1)}${prefix ? '/' : ''}index.html`;
    put(`static/${page}`, `<script src="${prefix}/_next/static/chunks/app.js"></script><link href="${prefix}/_next/static/css/main.css"/>`);
    put(`static${prefix}/_next/static/chunks/app.js`, 'js');
    put(`static${prefix}/_next/static/css/main.css`, 'css');
    assert.equal(verifyPageAssets(join(dir, 'static'), page), 2);
  }
  put('static/publisher-demo/index.html', '<script src="/_next/static/chunks/missing.js"></script>');
  assert.throws(() => verifyPageAssets(join(dir, 'static'), 'publisher-demo/index.html'), /static_page_asset_missing/);
});
