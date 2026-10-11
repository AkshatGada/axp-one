// Forward a real local request, then lose/corrupt its response; never retry.
export function pilotFetch(fault, forward = globalThis.fetch) {
  let used = false;
  return async (url, options) => {
    const local = new URL(url);
    if (!['127.0.0.1','localhost','[::1]'].includes(local.hostname) || local.protocol !== 'http:') throw new Error('loopback_only');
    const response = await forward(url, options);
    const match = !used && response.ok && options.method === 'POST' && (
      (fault === 'lost-opportunity' && local.pathname.endsWith('/opportunities')) ||
      (['lost-receipt','malformed-receipt'].includes(fault) && local.pathname.endsWith('/render')));
    if (match) {
      used = true; await response.text();
      if (fault === 'malformed-receipt') return new Response('{}', { status:200 });
      throw new Error('deliberately_lost_local_response');
    }
    return response;
  };
}
