// Dedicated Arc pages always address their own durable workspace.
export function productAPIBase(pathname=globalThis.location?.pathname??'') {
  return pathname.startsWith('/arc/')?'/api/arc':'/api/product';
}
