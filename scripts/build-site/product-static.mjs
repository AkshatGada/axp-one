// Publish only user-operated products from the root-base-path Next export.
// The landing retains / and its own assets; recorded explorations retain /mvp/.
import {cpSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {join, dirname, resolve, sep} from 'node:path';

export const PRODUCT_PAGES = ['advertiser-dashboard', 'publisher-demo'];

export function mergeStaticTree(source, destination) {
  mkdirSync(destination, {recursive: true});
  for (const entry of readdirSync(source, {withFileTypes: true})) {
    const from = join(source, entry.name), to = join(destination, entry.name);
    if (entry.isDirectory()) {
      if (existsSync(to) && !statSync(to).isDirectory()) throw Error(`static_asset_collision:${to}`);
      mergeStaticTree(from, to);
    } else if (entry.isFile()) {
      if (existsSync(to)) {
        if (!statSync(to).isFile() || !readFileSync(from).equals(readFileSync(to))) throw Error(`static_asset_collision:${to}`);
      } else {
        mkdirSync(dirname(to), {recursive: true});
        cpSync(from, to);
      }
    } else throw Error(`static_symlink_not_allowed:${from}`);
  }
}

export function publishProductStatic(productOut, staticDir) {
  for (const page of PRODUCT_PAGES) {
    const html = join(productOut, page, 'index.html');
    if (!existsSync(html)) throw Error(`missing_product_export:${page}`);
    const text = readFileSync(html, 'utf8');
    if (!text.includes('/_next/static/') || text.includes('/mvp/_next/')) throw Error(`product_base_path_invalid:${page}`);
    mergeStaticTree(join(productOut, page), join(staticDir, page));
  }
  if (!existsSync(join(productOut, 'publisher-demo/integration/index.html'))) throw Error('missing_product_sdk_guide');
  // Next chunk names are content-addressed. Never silently overwrite a landing chunk.
  mergeStaticTree(join(productOut, '_next'), join(staticDir, '_next'));
}

export function verifyPageAssets(staticDir, page) {
  const text = readFileSync(join(staticDir, page), 'utf8');
  const urls = new Set([...text.matchAll(/(?:src|href)="([^"?#]+\/_next\/static\/[^"?#]+)"/g)].map(match => match[1]));
  // The root asset prefix starts with /_next, without a preceding path segment.
  for (const match of text.matchAll(/(?:src|href)="(\/_next\/static\/[^"?#]+)"/g)) urls.add(match[1]);
  if (!urls.size) throw Error(`static_page_has_no_assets:${page}`);
  for (const url of urls) {
    const file = resolve(staticDir, '.' + decodeURIComponent(url));
    if (!file.startsWith(resolve(staticDir) + sep) || !existsSync(file) || !statSync(file).isFile()) throw Error(`static_page_asset_missing:${page}:${url}`);
  }
  return urls.size;
}
