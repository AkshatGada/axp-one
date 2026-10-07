import {ContractError} from '../contracts/index.mjs';

export const PRODUCT_ORGANIC_MODEL = 'deepseek-flash';
const fail = code => {throw new ContractError(code);};

// The product's interactive answer path is separate from the frozen V3 harness.
// One call, no retries, no ad inputs, no canned fallback and no reasoning text.
export function createProductOrganic({apiKey, fetchImpl = fetch, now = Date.now} = {}) {
  if (typeof apiKey !== 'string' || apiKey.trim().length < 20) fail('organic_key_unavailable');
  return async ({suppliedPrompt}) => {
    const started = now();
    if (typeof suppliedPrompt !== 'string' || !suppliedPrompt.trim() || suppliedPrompt.length > 4000) fail('organic_prompt_invalid');
    let response;
    try {
      response = await fetchImpl('https://api.deepseek.com/chat/completions', {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(35000),
        headers: {Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
        body: JSON.stringify({model: PRODUCT_ORGANIC_MODEL, messages: [{role: 'user', content: suppliedPrompt}],
          thinking: {type: 'disabled'}, temperature: 0.5, max_tokens: 1600, stream: false}),
      });
    } catch {fail('organic_transport_unavailable');}
    if (!response.ok) fail(`organic_http_${response.status}`);
    const body = await response.text();
    if (body.length > 65536 || body.includes(apiKey)) fail('organic_response_invalid');
    let value;
    try {value = JSON.parse(body);} catch {fail('organic_response_invalid');}
    if (typeof value.model !== 'string' || !value.model.startsWith(PRODUCT_ORGANIC_MODEL) || /pro/i.test(value.model)) fail('organic_model_mismatch');
    const choice = value.choices?.[0], message = choice?.message;
    if (choice?.finish_reason === 'length') fail('organic_truncated');
    if (choice?.finish_reason !== 'stop' || message?.tool_calls?.length || typeof message?.content !== 'string') fail('organic_response_invalid');
    const fenced = message.content.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
    let result;
    try {result = JSON.parse(fenced ? fenced[1] : message.content);} catch {fail('organic_response_not_json');}
    if (!result || Object.keys(result).length !== 1 || typeof result.answer !== 'string' || !result.answer.trim() || result.answer.length > 12000) fail('organic_response_shape');
    if (!Number.isSafeInteger(value.usage?.prompt_tokens) || !Number.isSafeInteger(value.usage?.completion_tokens)) fail('organic_usage_missing');
    return {answer: result.answer, model: PRODUCT_ORGANIC_MODEL, providerModel: value.model,
      usage: {inputTokens: value.usage.prompt_tokens, outputTokens: value.usage.completion_tokens}, elapsedMs: now() - started};
  };
}
