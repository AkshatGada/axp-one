// Reference-app delivery observation, not human viewability or ad absorption.
export function inspectPlacement(node,award) {
  const label=node?.querySelector('[data-sponsored-label]');
  const copy=node?.querySelector('[data-creative-copy]');
  return {domInserted:!!node?.isConnected&&node.dataset.awardId===award.id&&copy?.textContent===award.creative.approvedText,sponsoredLabelPresent:label?.textContent==='Sponsored',creativeHash:award.creativeHash};
}
export async function acknowledgePlacement({node,award,post}) {
  const observed=inspectPlacement(node,award);
  if(!observed.domInserted||!observed.sponsoredLabelPresent)throw new Error('render_not_observed');
  return post(`/v1/awards/${encodeURIComponent(award.id)}/render`,observed);
}
