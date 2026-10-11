import { test } from 'node:test';
import assert from 'node:assert/strict';
import { showPlacement } from '../public/sponsorship.js';

// Minimal DOM adapter, not a claim of real-browser layout or accessibility QA.
function dom() {
  const document = {
    defaultView: { getComputedStyle(node) { return { display: node.display || 'block', visibility: 'visible', opacity: '1' }; } },
    createElement(tagName) {
      return { tagName, nodeType: 1, ownerDocument: document, dataset: {}, children: [], listeners: new Map(),
        textContent: '', hidden: false, disabled: false, parentElement: null,
        get isConnected() { return this.root === true || !!this.parentElement?.isConnected; },
        setAttribute() {},
        append(...children) {
          for (const child of children) {
            if (this.rejectCard && child.tagName === 'aside') throw new Error('fixture insertion failure');
            this.children.push(child); child.parentElement = this;
          }
        },
        remove() {
          if (this.parentElement) this.parentElement.children = this.parentElement.children.filter(child => child !== this);
          this.parentElement = null;
        },
        getClientRects() { return this.isConnected ? [{}] : []; },
        closest() {
          for (let node = this; node; node = node.parentElement) if (node.hidden) return node;
          return null;
        },
        querySelector(selector) {
          const key = { '[data-sponsored-label]': 'sponsoredLabel', '[data-creative-copy]': 'creativeCopy',
            '[data-sponsored-destination]': 'sponsoredDestination' }[selector];
          const visit = node => {
            for (const child of node.children) {
              if (key in child.dataset) return child;
              const found = visit(child); if (found) return found;
            }
          };
          return visit(this);
        },
        addEventListener(event, callback) { this.listeners.set(event, callback); },
      };
    },
  };
  const root = document.createElement('main'); root.root = true;
  const slot = document.createElement('section'); root.append(slot);
  return { document, slot, root };
}
function ad() {
  return { status: 'awarded', financialMode: 'synthetic', deliveryToken: 'fixture-token',
    award: { id: 'fixture-award', creativeHash: 'a'.repeat(64), brandName: 'Fixture sponsor',
      creative: { approvedText: '<script>not executable</script> Exact fixture copy', destinationURL: 'https://sponsor.example/' } } };
}
function accepted() {
  return { status: 'accepted', financialMode: 'synthetic', charge: { id: 'fixture-charge', amountBaseUnits: '10' } };
}
function options(view, post) { return { ...view, post, csrf: 'fixture-csrf', turnId: 'fixture-turn', isCurrent: () => true }; }

test('approved card is connected and exactly disclosed before acknowledgement; creative stays intact', async () => {
  const view = dom();
  const award = ad();
  const original = JSON.stringify(award);
  const calls = [];
  await showPlacement(options(view, async (path, body, csrf) => {
    calls.push({ path, body, csrf });
    if (path.endsWith('/placement')) return award;
    assert.equal(path, '/api/axp/render');
    const card = view.slot.children.find(child => child.tagName === 'aside');
    assert.ok(card.isConnected);
    assert.equal(card.querySelector('[data-sponsored-label]').textContent, 'Sponsored');
    assert.equal(card.querySelector('[data-creative-copy]').textContent, award.award.creative.approvedText);
    const link = card.querySelector('[data-sponsored-destination]');
    assert.equal(link.href, award.award.creative.destinationURL);
    assert.equal(link.rel, 'sponsored noopener noreferrer');
    assert.deepEqual(body, { turnId: 'fixture-turn', awardId: 'fixture-award', deliveryToken: 'fixture-token',
      observation: { creativeHash: 'a'.repeat(64), domInserted: true, sponsoredLabelPresent: true } });
    assert.equal(csrf, 'fixture-csrf');
    return accepted();
  }));
  assert.equal(JSON.stringify(award), original);
  assert.equal(calls.length, 2);
  assert.match(view.slot.children[0].textContent, /test credits accrued/);
  assert.match(view.slot.children[0].textContent, /Not a payout/);
});

test('no-fill removes only the optional slot; errors and timeouts do not alter organic DOM', async () => {
  for (const result of [{ status: 'no_fill' }, { status: 'error', error: { code: 'timeout' } }, null]) {
    const view = dom();
    const organic = view.document.createElement('article'); organic.textContent = 'Independent fixture answer'; view.root.append(organic);
    await showPlacement(options(view, async () => { if (!result) throw new Error('network failure'); return result; }));
    assert.equal(organic.textContent, 'Independent fixture answer');
    assert.ok(organic.isConnected);
    if (result?.status === 'no_fill') assert.equal(view.slot.isConnected, false);
    else assert.match(view.slot.children[0].textContent, /unavailable/);
  }
});

test('failed insertion, hidden disclosure and stale conversation report failure, never a receipt', async () => {
  for (const mode of ['insertion', 'hidden', 'stale']) {
    const view = dom();
    if (mode === 'insertion') view.slot.rejectCard = true;
    if (mode === 'hidden') {
      const create = view.document.createElement;
      view.document.createElement = tag => { const node = create(tag); if (tag === 'span') node.display = 'none'; return node; };
    }
    const calls = [];
    await showPlacement({ ...options(view, async (path, body) => {
      calls.push({ path, body });
      return path.endsWith('/placement') ? ad() : { status: 'failed' };
    }), isCurrent: () => mode !== 'stale' });
    assert.deepEqual(calls.map(call => call.path), ['/api/axp/placement', '/api/axp/fail']);
    assert.equal(calls[1].body.deliveryToken, 'fixture-token');
    assert.equal(view.slot.children.filter(child => child.tagName === 'aside').length, 0);
  }
});

test('uncertain receipt exposes explicit same-award retry without repurchase or failure report', async () => {
  const view = dom();
  const calls = [];
  let attempts = 0;
  await showPlacement(options(view, async (path, body) => {
    calls.push({ path, body });
    if (path.endsWith('/placement')) return ad();
    if (++attempts === 1) throw new Error('lost accepted response');
    return { ...accepted(), replayed: true };
  }));
  const retry = view.slot.children.find(child => child.tagName === 'button');
  assert.equal(retry.hidden, false);
  assert.match(view.slot.children[0].textContent, /may already be accepted/);
  retry.listeners.get('click')();
  // A double click during the request cannot create another post.
  retry.listeners.get('click')();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(retry.hidden, true);
  assert.equal(calls.filter(call => call.path.endsWith('/placement')).length, 1);
  const receipts = calls.filter(call => call.path.endsWith('/render'));
  assert.equal(receipts.length, 2);
  assert.deepEqual(receipts[0].body, receipts[1].body);
  assert.equal(calls.some(call => call.path.endsWith('/fail')), false);
  assert.equal(view.slot.children.filter(child => child.tagName === 'aside').length, 1);
});

test('release failure is labelled unconfirmed and falls back to reservation expiry', async () => {
  const view = dom(); view.slot.rejectCard = true;
  await showPlacement(options(view, async path => {
    if (path.endsWith('/placement')) return ad();
    throw new Error('release transport failure');
  }));
  assert.match(view.slot.children[0].textContent, /release unconfirmed/);
  assert.match(view.slot.children[0].textContent, /until expiry/);
});
