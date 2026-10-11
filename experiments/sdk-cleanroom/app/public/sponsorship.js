import { createSponsoredCard, createRenderAcknowledger, inspectPlacement } from '../vendor/publisher-sdk/browser.mjs';

// All exchange traffic goes through our own authenticated same-origin backend.
export async function postJSON(path, body, csrf, timeoutMs = 18000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(path, { method: 'POST', credentials: 'same-origin',
      headers: { 'content-type': 'application/json', ...(csrf ? { 'x-app-csrf': csrf } : { 'x-app-init': '1' }) },
      body: JSON.stringify(body), signal: controller.signal });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Sponsored request failed.');
    return result;
  } finally { clearTimeout(timer); }
}

export async function showPlacement({ document, slot, turnId, csrf, isCurrent, post = postJSON }) {
  const note = document.createElement('p');
  note.className = 'placement-status';
  note.setAttribute('role', 'status');
  note.textContent = 'Checking optional Sponsored placement · fixture decisions · synthetic credits…';
  slot.append(note);
  let ad;
  try { ad = await post('/api/axp/placement', { turnId }, csrf); }
  catch { note.textContent = 'Sponsored placement unavailable or timed out. Your fixture reply is unchanged.'; return; }
  if (ad.status !== 'awarded') {
    if (ad.status === 'no_fill') slot.remove();
    else note.textContent = ad.reason || `Sponsored placement unavailable (${ad.error?.code || ad.status}). Your fixture reply is unchanged.`;
    return;
  }
  const binding = { turnId, awardId: ad.award.id, deliveryToken: ad.deliveryToken };
  async function failInsertion() {
    try {
      await post('/api/axp/fail', binding, csrf);
      note.textContent = 'Sponsored insertion failed; reservation release confirmed.';
    } catch {
      note.textContent = 'Sponsored insertion failed; release unconfirmed. Reservation may remain until expiry.';
    }
  }
  if (!isCurrent() || !slot.isConnected) { await failInsertion(); return; }
  let card;
  try {
    card = createSponsoredCard({ document, award: ad.award });
    slot.append(card);
    const observation = inspectPlacement(card, ad.award);
    if (!observation.domInserted || !observation.sponsoredLabelPresent) throw new Error('render_not_observed');
  } catch {
    card?.remove();
    await failInsertion();
    return;
  }
  const retry = document.createElement('button');
  retry.type = 'button';
  retry.textContent = 'Retry same receipt';
  retry.hidden = true;
  slot.append(retry);
  const acknowledge = createRenderAcknowledger({
    post: (_path, observation, deliveryToken) => post('/api/axp/render',
      { ...binding, observation, deliveryToken }, csrf, 50000),
  });
  async function record() {
    retry.disabled = true;
    note.textContent = 'Fixture Sponsored copy inserted · synthetic delivery receipt pending…';
    try {
      const receipt = await acknowledge({ node: card, award: ad.award, deliveryToken: ad.deliveryToken });
      if (receipt.status !== 'accepted' || receipt.financialMode !== 'synthetic') throw new Error('unexpected_receipt');
      note.textContent = `Synthetic delivery accepted · ${receipt.charge.amountBaseUnits} base units of test credits accrued. Not a payout or proof of human attention.`;
      retry.hidden = true;
    } catch {
      // Never fail or repurchase after uncertain delivery. An explicit retry uses
      // the original node, approved creative, award, turn and delivery capability.
      note.textContent = 'Synthetic delivery unconfirmed. It may already be accepted. Retry only this same receipt; no new placement will be purchased.';
      retry.hidden = false;
    } finally { retry.disabled = false; }
  }
  retry.addEventListener('click', () => { if (!retry.disabled) void record(); });
  await record();
}
