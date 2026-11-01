// Server entry point. Never import into a browser bundle or send this instance to a model.
import {PublisherSDKError} from './errors.mjs';
import {validateReceiptResult} from './receipt.mjs';
export {PublisherSDKError} from './errors.mjs';

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
function requireId(value, key, max = 120) {
  requireString(value, `invalid_${key}`, max);
  if (!/^[-\w]+$/.test(value)) throw new PublisherSDKError(`invalid_${key}`);
}
function deliveryInput(input) {
  const {awardId, deliveryToken} = input ?? {};
  requireString(awardId, 'award_required', 200);
  requireString(deliveryToken, 'delivery_token_required');
  if (/[\r\n]/.test(deliveryToken)) throw new PublisherSDKError('invalid_delivery_token');
  return {awardId, deliveryToken};
}
function opportunityInput(input) {
  const {question, sessionId, turnId, placementId = 'chat-sponsored-card', requiredCapabilities, excludedCategories, settlementNetwork} = input ?? {};
  requireString(question, 'invalid_question', 1200);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(question)) throw new PublisherSDKError('invalid_question');
  for (const [key, value] of Object.entries({sessionId, turnId, placementId})) {
    requireId(value, key);
  }
  const body = {question: question.trim(), sessionId, turnId, placementId};
  if (settlementNetwork !== undefined) {
    if (!['solana-devnet', 'tempo-testnet', 'hsk-testnet'].includes(settlementNetwork)) throw new PublisherSDKError('invalid_settlementNetwork');
    body.settlementNetwork = settlementNetwork;
  }
  for (const [key, value] of Object.entries({requiredCapabilities, excludedCategories})) {
    if (value === undefined) continue;
    if (!Array.isArray(value) || value.length > 17 || value.some(v => typeof v !== 'string' || !/^[-\w]{1,100}$/.test(v.trim())))
      throw new PublisherSDKError(`invalid_${key}`);
    body[key] = [...new Set(value.map(v => v.trim()))].sort();
  }
  return body;
}
function validateOpportunityResult(value) {
  if (!value || !['awarded', 'no_fill'].includes(value.status) || typeof value.opportunityId !== 'string' || !value.opportunityId.trim())
    throw new PublisherSDKError('invalid_response');
  if (value.status === 'awarded') {
    const a = value.award;
    if (!a || typeof a.id !== 'string' || !a.id.trim() || !/^[a-f0-9]{64}$/.test(a.creativeHash) || !a.creative ||
      typeof a.creative.approvedText !== 'string' || !a.creative.approvedText ||
      typeof a.creative.destinationURL !== 'string' || typeof a.priceBaseUnits !== 'string' || !/^(0|[1-9][0-9]*)$/.test(a.priceBaseUnits) ||
      !Number.isSafeInteger(a.expiresAt) || a.expiresAt < 0 || typeof value.deliveryToken !== 'string' || !value.deliveryToken.trim())
      throw new PublisherSDKError('invalid_response');
    if (BigInt(a.priceBaseUnits) > (1n << 64n) - 1n) throw new PublisherSDKError('invalid_response');
    let destination;
    try { destination = new URL(a.creative.destinationURL); } catch { throw new PublisherSDKError('invalid_response'); }
    if (destination.protocol !== 'https:' || destination.username || destination.password) throw new PublisherSDKError('invalid_response');
  }
  if (value.status === 'no_fill' && (value.award !== undefined || value.deliveryToken !== undefined))
    throw new PublisherSDKError('invalid_response');
  return value;
}
function validateOpportunityStatus(value) {
  if (!value || value.schemaVersion !== 'publisher-opportunity-status.v1' ||
    !['not_found', 'pending', 'unknown', 'resolved'].includes(value.status)) throw new PublisherSDKError('invalid_response');
  if (value.status === 'resolved') {
    validateOpportunityResult(value.result);
    if (value.awardStatus !== undefined && (value.result.status !== 'awarded' ||
      !['reserved', 'expired', 'failed', 'delivered'].includes(value.awardStatus))) throw new PublisherSDKError('invalid_response');
  } else if (value.result !== undefined || value.awardStatus !== undefined) throw new PublisherSDKError('invalid_response');
  return value;
}
function validateDeliveryStatus(value, awardId) {
  if (!value || value.schemaVersion !== 'publisher-award-status.v1' || value.awardId !== awardId ||
    typeof value.financialMode !== 'string' || !value.financialMode.trim()) throw new PublisherSDKError('invalid_response');
  if (value.status === 'accepted') {
    validateReceiptResult(value.result, {awardId});
    if ([value.result.financialMode, value.result.receipt.mode, value.result.charge.mode]
      .some(mode => mode !== undefined && mode !== value.financialMode))
      throw new PublisherSDKError('invalid_response');
  } else if (!['reserved', 'expired', 'failed'].includes(value.status) || value.result !== undefined ||
    !Number.isSafeInteger(value.expiresAt) || value.expiresAt < 0) throw new PublisherSDKError('invalid_response');
  return value;
}

export class AXPPublisher {
  #key; #baseURL; #fetch; #timeout; #receiptTimeout;
  constructor({apiKey, baseURL = 'https://axp.one/api/product', timeoutMs = 15000, receiptTimeoutMs = 45000, fetch: fetchImpl = globalThis.fetch} = {}) {
    if (typeof window !== 'undefined') throw new PublisherSDKError('server_only');
    requireString(apiKey, 'publisher_key_required');
    if (/[\r\n]/.test(apiKey)) throw new PublisherSDKError('invalid_publisher_key');
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw new PublisherSDKError('invalid_timeout');
    if (!Number.isSafeInteger(receiptTimeoutMs) || receiptTimeoutMs < 1 || receiptTimeoutMs > 120000) throw new PublisherSDKError('invalid_receipt_timeout');
    if (typeof fetchImpl !== 'function') throw new PublisherSDKError('fetch_required');
    this.#key = apiKey; this.#baseURL = endpoint(baseURL); this.#fetch = fetchImpl; this.#timeout = timeoutMs; this.#receiptTimeout = receiptTimeoutMs;
  }
  async #request(path, body, deliveryToken, timeoutMs = this.#timeout, method = 'POST') {
    const controller = new AbortController();
    let timeout;
    const deadline = new Promise((_, reject) => {
      timeout = setTimeout(() => { controller.abort(); reject(new PublisherSDKError('timeout')); }, timeoutMs);
    });
    try {
      return await Promise.race([deadline, (async () => {
        const response = await this.#fetch(`${this.#baseURL}${path}`, {
          method, redirect: 'error', signal: controller.signal, cache: 'no-store',
          headers: {...(method === 'POST' ? {'content-type': 'application/json'} : {}), 'x-axp-publisher-key': this.#key,
            ...(deliveryToken ? {'x-axp-delivery-token': deliveryToken} : {})},
          ...(method === 'POST' ? {body: JSON.stringify(body)} : {}),
        });
        if (!response.ok) {
          let code = 'http_error';
          try {
            const value = await response.json();
            if (typeof value?.error === 'string' && /^[a-z][a-z0-9_]{0,99}$/.test(value.error)) code = value.error;
          } catch { /* Preserve HTTP status without exposing arbitrary response text. */ }
          throw new PublisherSDKError(code, {status: response.status});
        }
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
  /** Read only; pending/unknown never trigger another purchase. Errors throw. */
  async lookupOpportunity(input) {
    const {sessionId, turnId} = input ?? {};
    requireId(sessionId, 'sessionId'); requireId(turnId, 'turnId');
    const query = new URLSearchParams({sessionId, turnId});
    return validateOpportunityStatus(await this.#request(`/publisher/opportunities?${query}`, undefined, undefined, this.#timeout, 'GET'));
  }
  /** Read only; requires the existing award's delivery capability. Errors throw. */
  async lookupDelivery(input) {
    const {awardId, deliveryToken} = deliveryInput(input);
    return validateDeliveryStatus(await this.#request(`/awards/${encodeURIComponent(awardId)}/status`, undefined, deliveryToken, this.#receiptTimeout, 'GET'), awardId);
  }
  /** Call from your backend after receiving the DOM observation and bound delivery capability. */
  async acknowledgeRender(input = {}) {
    const {awardId, deliveryToken} = deliveryInput(input), {observation} = input;
    if (!observation || observation.domInserted !== true || observation.sponsoredLabelPresent !== true ||
      typeof observation.creativeHash !== 'string' || !/^[a-f0-9]{64}$/.test(observation.creativeHash)) throw new PublisherSDKError('render_not_observed');
    const result = await this.#request(`/awards/${encodeURIComponent(awardId)}/render`, {
      creativeHash: observation.creativeHash, domInserted: true, sponsoredLabelPresent: true,
    }, deliveryToken, this.#receiptTimeout);
    return validateReceiptResult(result, {awardId, creativeHash: observation.creativeHash});
  }
  async failRender(input = {}) {
    const {awardId, deliveryToken} = deliveryInput(input), {reason = 'render_failed'} = input;
    requireString(reason, 'reason_required', 100);
    const result = await this.#request(`/awards/${encodeURIComponent(awardId)}/fail`, {reason}, deliveryToken);
    if (result?.status !== 'failed' || result.award?.id !== awardId) throw new PublisherSDKError('invalid_fail_response');
    return result;
  }
}
