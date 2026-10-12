// Generated from react.tsx by scripts/sdk/build-react.mjs.
"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from 'react';
import { inspectPlacement } from './browser.mjs';
/** Optional React source adapter. Style natively and send observations through your same-origin server. */
export function SponsoredCard({ award, deliveryToken, acknowledge, onReceipt, onError, className = 'axp-sponsored-card' }) {
    const ref = useRef(null);
    const callbacks = useRef({ acknowledge, onReceipt, onError });
    callbacks.current = { acknowledge, onReceipt, onError };
    let destination = null;
    try {
        const url = new URL(award.creative.destinationURL);
        if (url.protocol === 'https:' && !url.username && !url.password)
            destination = url;
    }
    catch { }
    useEffect(() => {
        const node = ref.current;
        if (!node) {
            callbacks.current.onError?.(new Error('render_not_observed'));
            return;
        }
        const observation = inspectPlacement(node, award);
        if (!observation.domInserted || !observation.sponsoredLabelPresent) {
            callbacks.current.onError?.(new Error('render_not_observed'));
            return;
        }
        void callbacks.current.acknowledge({ node, award, deliveryToken }).then(result => callbacks.current.onReceipt?.(result), error => callbacks.current.onError?.(error));
    }, [award, deliveryToken]);
    if (!destination)
        return null;
    return _jsxs("aside", { ref: ref, className: className, "data-award-id": award.id, "data-sponsored-card": "", "aria-label": "Sponsored placement", children: [_jsx("span", { "data-sponsored-label": "", children: "Sponsored" }), _jsx("p", { "data-creative-copy": "", children: award.creative.approvedText }), _jsx("a", { "data-sponsored-destination": "", href: destination.href, target: "_blank", rel: "sponsored noopener noreferrer", children: award.brandName || 'Visit sponsor' })] });
}
