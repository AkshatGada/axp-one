// Working app example. Startup has no exchange/provider/payment side effects.
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {resolve} from 'node:path';
import {AXPPublisher} from '../index.mjs';
import {localConfiguration,repositoryRoot} from '../../config/local.mjs';

const port = Number(process.env.AXP_EXAMPLE_PORT ?? '3433');
if (!Number.isSafeInteger(port) || port < 1024 || port > 65535) throw new Error('invalid_example_port');
const origin = `http://127.0.0.1:${port}`;
const csrf = randomBytes(32).toString('hex');
const config = localConfiguration();
const apiKey = config.AXP_PUBLISHER_API_KEY || readFileSync(resolve(repositoryRoot,config.AXP_PRODUCT_STATE_DIR || 'local-state/product','publisher-api-key'), 'utf8').trim();
const exchangeURL = (process.env.AXP_EXCHANGE_URL ?? 'http://127.0.0.1:3430/api/product').replace(/\/$/, '');
const axp = new AXPPublisher({apiKey, baseURL: exchangeURL});
async function exchangeJSON(path, options = {}) {
  const response = await fetch(`${exchangeURL}${path}`, {...options, redirect: 'error', signal: AbortSignal.timeout(40000)});
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value.error === 'string' ? value.error : 'exchange_request_failed');
  return value;
}
const staticFiles = new Map([
  ['/', ['text/html; charset=utf-8', new URL('./index.html', import.meta.url)]],
  ['/app.mjs', ['text/javascript; charset=utf-8', new URL('./app.mjs', import.meta.url)]],
  ['/sdk/financial.mjs', ['text/javascript; charset=utf-8', new URL('../financial.mjs', import.meta.url)]],
  ['/sdk/browser.mjs', ['text/javascript; charset=utf-8', new URL('../browser.mjs', import.meta.url)]],
]);
function json(res, status, body) {res.writeHead(status, {'content-type': 'application/json', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff'}); res.end(JSON.stringify(body));}
async function body(req) {
  let bytes = 0; const chunks = [];
  for await (const chunk of req) {bytes += chunk.length; if (bytes > 8192) throw new Error('request_too_large'); chunks.push(chunk);}
  try {return JSON.parse(Buffer.concat(chunks).toString('utf8'));} catch {throw new Error('invalid_json');}
}
createServer(async (req, res) => {
  try {
    const path = new URL(req.url, origin).pathname;
    if (req.method === 'GET' && staticFiles.has(path)) {
      const [contentType, file] = staticFiles.get(path);
      res.writeHead(200, {'content-type': contentType, 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'content-security-policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'"});
      res.end(readFileSync(file)); return;
    }
    if (req.method === 'GET' && path === '/config') {
      const config = await exchangeJSON('/publisher/config');
      return json(res, 200, {csrf, mode: config.mode, financialMode: config.financialMode, organic: config.organic, engine: config.engine});
    }
    if (req.method !== 'POST') return json(res, 404, {error: 'not_found'});
    if (req.headers.origin !== origin || req.headers['x-example-csrf'] !== csrf) return json(res, 403, {error: 'app_auth_required'});
    const data = await body(req);
    if (path === '/api/answer') {
      if (typeof data.question !== 'string' || !data.question.trim() || data.question.length > 1200) return json(res, 400, {error: 'invalid_question'});
      const {csrf: exchangeCSRF} = await exchangeJSON('/bootstrap');
      const answer = await exchangeJSON('/demo/answer', {method: 'POST', headers: {'content-type': 'application/json', 'x-axp-csrf': exchangeCSRF}, body: JSON.stringify({question: data.question, sessionId: data.sessionId, turnId: data.turnId})});
      if (answer.answerMode !== 'actual-api-model' || answer.advertiserMaterialIncluded !== false || answer.replayed) throw new Error('fresh_live_answer_required');
      return json(res, 200, answer);
    }
    if (path === '/api/ad') return json(res, 200, await axp.requestAd(data));
    if (path === '/api/render') return json(res, 200, await axp.acknowledgeRender(data));
    if (path === '/api/fail') return json(res, 200, await axp.failRender(data));
    return json(res, 404, {error: 'not_found'});
  } catch (error) {json(res, error.code ? 502 : 400, {error: error.code ?? 'invalid_request'});}
}).listen(port, '127.0.0.1', () => {
  console.log(`Publisher SDK example: ${origin}`);
  console.log('Organic answer: independent DeepSeek. Ad requests use the configured exchange. Provider requests run only on send.');
});
