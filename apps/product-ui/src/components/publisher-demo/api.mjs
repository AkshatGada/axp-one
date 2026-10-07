// Same-origin reference-app transport. Deliberately has no publisher API key.
export async function productRequest(path, {body, csrf, deliveryToken, timeoutMs = 16000, fetch: fetchImpl = globalThis.fetch} = {}) {
  if (!/^\/[a-zA-Z0-9/_-]+$/.test(path)) throw new Error('invalid_product_path');
  const controller = new AbortController(); let timeout;
  try {
    return await Promise.race([
      new Promise((_, reject) => { timeout = setTimeout(() => {controller.abort(); reject(new Error('request_timeout'));}, timeoutMs); }),
      (async () => {
        const response = await fetchImpl(`/api/product${path}`, {
          method: body === undefined ? 'GET' : 'POST', signal: controller.signal, credentials: 'same-origin', redirect: 'error', cache: 'no-store',
          headers: {'content-type': 'application/json', ...(csrf ? {'x-axp-csrf': csrf} : {}), ...(deliveryToken ? {'x-axp-delivery-token': deliveryToken} : {})},
          ...(body === undefined ? {} : {body: JSON.stringify(body)}),
        });
        let value;
        try { value = await response.json(); } catch { throw new Error('invalid_api_response'); }
        if (!response.ok) throw new Error(typeof value?.error === 'string' ? value.error : value?.error?.code || value?.code || `http_${response.status}`);
        return value;
      })(),
    ]);
  } finally { clearTimeout(timeout); }
}
