// Browser-safe: no publisher key, Node imports, payment code or creative rewriting.
function visible(element) {
  if (!element || element.hidden || element.closest?.('[hidden],[aria-hidden="true"]')) return false;
  const window = element.ownerDocument?.defaultView;
  if (!window?.getComputedStyle) return true; // Non-browser adapters must provide their own observation.
  for (let current = element; current?.nodeType === 1; current = current.parentElement) {
    const style = window.getComputedStyle(current);
    if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || Number(style.opacity) === 0) return false;
  }
  return element.getClientRects().length > 0;
}
function destinationURL(award) {
  const url = new URL(award.creative.destinationURL);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('invalid_destination');
  return url.href;
}
/** An owned-app DOM observation, never proof of a human view or attention. */
export function inspectPlacement(node, award) {
  const label = node?.querySelector('[data-sponsored-label]');
  const copy = node?.querySelector('[data-creative-copy]');
  const destination = node?.querySelector('[data-sponsored-destination]');
  let destinationMatches = false;
  try { destinationMatches = destination?.href === destinationURL(award); } catch { /* Reject malformed creative. */ }
  return {
    creativeHash: award.creativeHash,
    domInserted: !!node?.isConnected && node.dataset.awardId === award.id &&
      copy?.textContent === award.creative.approvedText && destinationMatches && visible(node) && visible(copy),
    sponsoredLabelPresent: label?.textContent === 'Sponsored' && visible(label),
  };
}

export function createSponsoredCard({document, award, className = 'axp-sponsored-card'}) {
  const url = destinationURL(award);
  const node = document.createElement('aside');
  node.className = className; node.dataset.awardId = award.id;
  node.dataset.sponsoredCard = ''; node.setAttribute('aria-label', 'Sponsored placement');
  const label = document.createElement('span'); label.dataset.sponsoredLabel = ''; label.textContent = 'Sponsored';
  const copy = document.createElement('p'); copy.dataset.creativeCopy = ''; copy.textContent = award.creative.approvedText;
  const link = document.createElement('a'); link.dataset.sponsoredDestination = ''; link.href = url;
  link.target = '_blank'; link.rel = 'sponsored noopener noreferrer'; link.textContent = award.brandName || 'Visit sponsor';
  node.append(label, copy, link);
  return node;
}

/** Dedupe in-flight and successful observations. Failed posts can be retried explicitly. */
export function createRenderAcknowledger({post}) {
  const outcomes = new Map();
  return async function acknowledge({node, award, deliveryToken}) {
    const observed = inspectPlacement(node, award);
    if (!observed.domInserted || !observed.sponsoredLabelPresent) throw new Error('render_not_observed');
    if (!deliveryToken) throw new Error('delivery_token_required');
    const previous = outcomes.get(award.id);
    if (previous) {
      if (previous.creativeHash !== award.creativeHash || previous.deliveryToken !== deliveryToken) throw new Error('award_binding_conflict');
      return previous.promise;
    }
    const promise = Promise.resolve().then(() => post(`/awards/${encodeURIComponent(award.id)}/render`, observed, deliveryToken));
    const pending = {creativeHash: award.creativeHash, deliveryToken, promise};
    outcomes.set(award.id, pending);
    try { return await promise; }
    catch (error) { if (outcomes.get(award.id) === pending) outcomes.delete(award.id); throw error; }
  };
}
