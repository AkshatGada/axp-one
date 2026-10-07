// Server entry point. Never import into a browser bundle or send this instance to a model.
export class PublisherSDKError extends Error {
  constructor(code, {status, cause} = {}) {
    super(code, {cause}); this.name = 'PublisherSDKError'; this.code = code;
    if (status !== undefined) this.status = status;
  }
}

function endpoint(baseURL) {
  let url;
  try { url = new URL(baseURL); } catch { throw new PublisherSDKError('invalid_base_url'); }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash)
    throw new PublisherSDKError('invalid_base_url');
  return url.href.replace(/\/$/, '');
}
function requireString(value, code, max = 4096) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw new PublisherSDKError(code);
}
function opportunityInput(input) {
  const {question, sessionId, turnId, placementId = 'chat-sponsored-card', requiredCapabilities, excludedCategories} = input ?? {};
  requireString(question, 'invalid_question', 1200);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(question)) throw new PublisherSDKError('invalid_question');
  for (const [key, value] of Object.entries({sessionId, turnId, placementId})) {
    requireString(value, `invalid_${key}`, 120);
    if (!/^[-\w]+$/.test(value)) throw new PublisherSDKError(`invalid_${key}`);
  }
  const body = {question, sessionId, turnId, placementId};
  for (const [key, value] of Object.entries({requiredCapabilities, excludedCategories})) {
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > 30 || value.some(v => typeof v !== 'string' || !v.trim() || v.length > 100))
      throw new PublisherSDKError(`invalid_${key}`);
    body[key] = [...value];
  }
  return body;
}
function validateOpportunityResult(value) {
  if (!value || !['awarded', 'no_fill'].includes(value.status) || typeof value.opportunityId !== 'string')
    throw new PublisherSDKError('invalid_response');
  if (value.status === 'awarded') {
    const a = value.award;
    if (!a || typeof a.id !== 'string' || !/^[a-f0-9]{64}$/.test(a.creativeHash) || !a.creative ||
      typeof a.creative.approvedText !== 'string' || !a.creative.approvedText ||
      typeof a.creative.destinationURL !== 'string' || typeof a.priceBaseUnits !== 'string' || !/^(0|[1-9][0-9]*)$/.test(a.priceBaseUnits) ||
      !Number.isSafeInteger(a.expiresAt) || typeof value.deliveryToken !== 'string' || !value.deliveryToken)
      throw new PublisherSDKError('invalid_response');
    if (BigInt(a.priceBaseUnits) > (1n << 64n) - 1n) throw new PublisherSDKError('invalid_response');
    let destination;
    try { destination = new URL(a.creative.destinationURL); } catch { throw new PublisherSDKError('invalid_response'); }
    if (destination.protocol !== 'https:' || destination.username || destination.password) throw new PublisherSDKError('invalid_response');
  }
  return value;
}

export class AXPPublisher {
  #key; #baseURL; #fetch; #timeout; #receiptTimeout;
  constructor({apiKey, baseURL = 'http://127.0.0.1:3430/api/product', timeoutMs = 15000, receiptTimeoutMs = 45000, fetch: fetchImpl = globalThis.fetch} = {}) {
    if (typeof window !== 'undefined') throw new PublisherSDKError('server_only');
    requireString(apiKey, 'publisher_key_required');
    if (/[\r\n]/.test(apiKey)) throw new PublisherSDKError('invalid_publisher_key');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new PublisherSDKError('invalid_timeout');
    if (!Number.isSafeInteger(receiptTimeoutMs) || receiptTimeoutMs < 1 || receiptTimeoutMs > 120000) throw new PublisherSDKError('invalid_receipt_timeout');
    if (typeof fetchImpl !== 'function') throw new PublisherSDKError('fetch_required');
    this.#key = apiKey; this.#baseURL = endpoint(baseURL); this.#fetch = fetchImpl; this.#timeout = timeoutMs; this.#receiptTimeout = receiptTimeoutMs;
  }
  async #request(path, body, deliveryToken, timeoutMs = this.#timeout) {
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new PublisherSDKError('timeout')); }, timeoutMs);
    });
    try {
      return await Promise.race([deadline, (async () => {
        const response = await this.#fetch(`${this.#baseURL}${path}`, {
          method: 'POST', redirect: 'error', signal: controller.signal,
          headers: {'content-type': 'application/json', 'x-axp-publisher-key': this.#key,
            ...(deliveryToken ? {'x-axp-delivery-token': deliveryToken} : {})},
          body: JSON.stringify(body),
        });
        if (!response.ok) throw new PublisherSDKError('http_error', {status: response.status});
        try { return await response.json(); } catch { throw new PublisherSDKError('invalid_response'); }
      })()]);
    } catch (error) {
      if (error instanceof PublisherSDKError) throw error;
      throw new PublisherSDKError('network_error');
    } finally { clearTimeout(timeout); }
  }
  /** Fail open. The explicit error status preserves debugging without blocking the answer. No retries. */
  async requestAd(input) {
    try { return validateOpportunityResult(await this.#request('/opportunities', opportunityInput(input))); }
    catch (error) { return {status: 'error', error: {code: error.code ?? 'request_failed', ...(error.status ? {status: error.status} : {})}}; }
  }
  /** Call from your backend after receiving the DOM observation and bound delivery capability. */
  async acknowledgeRender({awardId, deliveryToken, observation}) {
    requireString(awardId, 'award_required', 200); requireString(deliveryToken, 'delivery_token_required');
    if (!observation || observation.domInserted !== true || observation.sponsoredLabelPresent !== true ||
      typeof observation.creativeHash !== 'string' || !observation.creativeHash) throw new PublisherSDKError('render_not_observed');
    const result = await this.#request(`/awards/${encodeURIComponent(awardId)}/render`, {
      creativeHash: observation.creativeHash, domInserted: true, sponsoredLabelPresent: true,
    }, deliveryToken, this.#receiptTimeout);
    if (result?.status !== 'accepted' || typeof result.charge?.id !== 'string' ||
      typeof result.charge?.amountBaseUnits !== 'string' || !/^(0|[1-9][0-9]*)$/.test(result.charge.amountBaseUnits) ||
      !/^[a-f0-9]{64}$/.test(result.receiptHash) || !result.receipt || typeof result.signature !== 'string' ||
      result.receipt.awardId !== awardId || result.receipt.creativeHash !== observation.creativeHash)
      throw new PublisherSDKError('invalid_receipt_response');
    return result;
  }
  async failRender({awardId, deliveryToken, reason = 'render_failed'}) {
    requireString(awardId, 'award_required', 200); requireString(deliveryToken, 'delivery_token_required');
    requireString(reason, 'reason_required', 100);
    return this.#request(`/awards/${encodeURIComponent(awardId)}/fail`, {reason}, deliveryToken);
  }
}
