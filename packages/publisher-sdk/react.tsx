"use client";
import { useEffect, useRef } from 'react';
import type { Award, ReceiptResult } from './index.mjs';
import { inspectPlacement } from './browser.mjs';

/** Optional React source adapter. Style natively and send observations through your same-origin server. */
export function SponsoredCard({award, deliveryToken, acknowledge, onReceipt, onError, className = 'axp-sponsored-card'}: {
  award: Award; deliveryToken: string;
  acknowledge: (input: {node: HTMLElement; award: Award; deliveryToken: string}) => Promise<ReceiptResult>;
  onReceipt?: (receipt: ReceiptResult) => void; onError?: (error: unknown) => void; className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const callbacks = useRef({acknowledge, onReceipt, onError});
  callbacks.current = {acknowledge, onReceipt, onError};
  let destination: URL | null = null;
  try { const url = new URL(award.creative.destinationURL); if (url.protocol === 'https:' && !url.username && !url.password) destination = url; } catch {}
  useEffect(() => {
    const node = ref.current;
    if (!node) {callbacks.current.onError?.(new Error('render_not_observed')); return;}
    const observation = inspectPlacement(node, award);
    if (!observation.domInserted || !observation.sponsoredLabelPresent) { callbacks.current.onError?.(new Error('render_not_observed')); return; }
    void callbacks.current.acknowledge({node, award, deliveryToken}).then(result => callbacks.current.onReceipt?.(result), error => callbacks.current.onError?.(error));
  }, [award, deliveryToken]);
  if (!destination) return null;
  return <aside ref={ref} className={className} data-award-id={award.id} data-sponsored-card="" aria-label="Sponsored placement">
    <span data-sponsored-label="">Sponsored</span>
    <p data-creative-copy="">{award.creative.approvedText}</p>
    <a data-sponsored-destination="" href={destination.href} target="_blank" rel="sponsored noopener noreferrer">{award.brandName || 'Visit sponsor'}</a>
  </aside>;
}
