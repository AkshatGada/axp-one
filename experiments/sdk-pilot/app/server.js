import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { AXPPublisher } from '@axp/publisher-sdk';
import { validateReceiptResult } from '@axp/publisher-sdk/receipt';
import { FixtureAnswerProvider } from './answer-provider.js';
import { Store } from './store.js';
import { pilotFetch } from './fault-fetch.js';

const assets = new Map([
  ['/', [new URL('./public/index.html', import.meta.url), 'text/html']],
  ['/style.css', [new URL('./public/style.css', import.meta.url), 'text/css']],
  ['/app.js', [new URL('./public/app.js', import.meta.url), 'text/javascript']],
  ['/sdk/browser.mjs', [new URL(import.meta.resolve('@axp/publisher-sdk/browser')), 'text/javascript']],
  ['/sdk/receipt.mjs', [new URL(import.meta.resolve('@axp/publisher-sdk/receipt')), 'text/javascript']],
  ['/sdk/errors.mjs', [new URL('./node_modules/@axp/publisher-sdk/errors.mjs', import.meta.url), 'text/javascript']],
]);
class RequestError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export function validateMessages(messages) {
  if (!Array.isArray(messages) || !messages.length || messages.length > 41 || messages.length % 2 !== 1)
    throw new RequestError(400, 'Invalid organic history.');
  return messages.map((m, i) => {
    const role = i % 2 ? 'assistant' : 'user';
    if (m?.role !== role || typeof m.content !== 'string' || !m.content.trim() || m.content.length > 4000)
      throw new RequestError(400, 'Invalid organic message.');
    return { role, content: m.content.trim() };
  });
}
async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') throw new RequestError(415, 'Use application/json.');
  const chunks = []; let size = 0;
  for await (const c of request) { size += c.length; if (size > 32768) throw new RequestError(413, 'Request too large.'); chunks.push(c); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw new RequestError(400, 'Invalid JSON.'); }
}
function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body));
}
const errorCode = error => /^[a-z][a-z0-9_]{0,99}$/.test(error?.code) ? error.code : 'ad_unconfirmed';
function receiptBinding(result) {
  return {awardId:result.award.id,creativeHash:result.award.creativeHash,priceBaseUnits:result.award.priceBaseUnits,
    financialMode:result.award.financialMode ?? result.award.mode ?? result.financialMode ?? result.mode};
}
function publicTurn(t) {
  const value = { id:t.id, content:t.content, answer:t.answer, answerState:t.answer_state,
    adState:t.ad_state, deliveryState:t.delivery_state, errorCode:t.error_code, receipt:t.receipt };
  if (t.ad_state === 'awarded' && t.delivery_state === 'reserved' && Date.now() < t.ad_result.award.expiresAt) {
    value.award = t.ad_result.award; value.deliveryToken = t.ad_result.deliveryToken;
  } else if (t.receipt && t.ad_result?.status === 'awarded') {
    value.award = t.ad_result.award; // Historical display only: never expose a token or re-acknowledge.
  } else if (t.ad_state === 'awarded' && t.delivery_state === 'reserved') value.deliveryState = 'expired';
  return value;
}

export function createChatServer({ provider = new FixtureAnswerProvider(), publisher, store = new Store(':memory:') } = {}) {
  const activeAds = new Map(), activeAnswers = new Map(), activeRenders = new Map();
  function saveResult(turn, result) {
    store.update(turn.id, { ad_state:result.status === 'error' ? 'unknown' : result.status,
      ad_result:result.status === 'error' ? null : result, error_code:result.error?.code ?? null,
      delivery_state:result.status === 'awarded' ? 'reserved' : null });
  }
  async function recover(turn) {
    if (!turn.input || activeAds.has(turn.id) || activeRenders.has(turn.id) || turn.receipt) return;
    try {
      if (!turn.ad_result) {
        const status = await publisher.lookupOpportunity(turn.input);
        if (status.status !== 'resolved') { store.update(turn.id, {ad_state:status.status}); return; }
        saveResult(turn,status.result); turn = store.turn(turn.id,turn.session_id);
      }
      if (turn.ad_result?.status === 'awarded') {
        const result = turn.ad_result;
        const delivery = await publisher.lookupDelivery({awardId:result.award.id,deliveryToken:result.deliveryToken});
        if (delivery.status === 'accepted') {
          validateReceiptResult(delivery.result,receiptBinding(result));
          store.update(turn.id, {receipt:delivery.result,delivery_state:'accepted',error_code:null});
        } else store.update(turn.id, {delivery_state:delivery.status,error_code:null});
      }
    } catch (failure) { store.update(turn.id, {error_code:errorCode(failure)}); }
  }
  const server = http.createServer(async (request,response) => {
    response.setHeader('Cache-Control','no-store'); response.setHeader('X-Content-Type-Options','nosniff');
    response.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const pathname = new URL(request.url,'http://localhost').pathname;
      if (pathname.startsWith('/api/')) {
        const owner = request.headers.cookie?.match(/(?:^|;\s*)pilot_owner=([a-f0-9]{64})(?:;|$)/)?.[1];
        let session = store.session(owner);
        if (pathname === '/api/session' && request.method === 'GET') {
          if (!session) { session = store.createSession(); response.setHeader('Set-Cookie',`pilot_owner=${session.owner}; HttpOnly; SameSite=Strict; Path=/`); }
          return json(response,200,{sessionId:session.id,csrf:session.csrf,turns:store.turns(session.id).map(publicTurn)});
        }
        if (!session) throw new RequestError(401,'Open a chat session first.');
        if (request.method === 'POST') {
          if (request.headers['x-app-csrf'] !== session.csrf) throw new RequestError(403,'Invalid session CSRF token.');
          if (request.headers.origin && request.headers.origin !== `http://${request.headers.host}`) throw new RequestError(403,'Use the same app origin.');
        }
        if (pathname === '/api/session' && request.method === 'POST') {
          session = store.createSession(); response.setHeader('Set-Cookie',`pilot_owner=${session.owner}; HttpOnly; SameSite=Strict; Path=/`);
          return json(response,200,{sessionId:session.id,csrf:session.csrf,turns:[]});
        }
        if (pathname === '/api/chat') {
          if (request.method !== 'POST') throw new RequestError(405,'Use POST.');
          const body = await readJson(request);
          if (typeof body?.content !== 'string' || !body.content.trim() || body.content.length > 1600 || typeof body.consent !== 'boolean' ||
            typeof body.requestId !== 'string' || !/^[\w-]{1,120}$/.test(body.requestId)) throw new RequestError(400,'Send content, a stable requestId and explicit boolean consent.');
          const content = body.content.trim(), previous = store.turns(session.id);
          if (!previous.some(t => t.request_id === body.requestId) && (previous.length >= 21 || previous.some(t => t.answer_state === 'pending')))
            throw new RequestError(409,'Wait for the answer or start a new chat.');
          let admission;
          try { admission = store.admit(session,{...body,content}); } catch { throw new RequestError(409,'The saved turn cannot be changed.'); }
          const {turn,fresh} = admission;
          if (fresh) {
            if (turn.input) {
              const task = (async()=> {
                try { saveResult(turn,publisher ? await publisher.requestAd(turn.input) : {status:'error',error:{code:'unavailable'}}); }
                catch { store.update(turn.id,{ad_state:'unknown',error_code:'ad_unconfirmed'}); }
              })().finally(()=>activeAds.delete(turn.id));
              activeAds.set(turn.id,task);
            }
            const task = (async()=> {
              try {
                const history = previous.filter(t => t.answer_state === 'complete').flatMap(t => [
                  {role:'user',content:t.content},{role:'assistant',content:t.answer}]);
                const answer = await provider.answer({messages:validateMessages([...history,{role:'user',content}])});
                if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000) throw new Error('invalid_answer');
                store.update(turn.id,{answer,answer_state:'complete'});
              } catch { store.update(turn.id,{answer_state:'error'}); }
            })().finally(()=>activeAnswers.delete(turn.id)); activeAnswers.set(turn.id,task);
          }
          await activeAnswers.get(turn.id);
          const saved = store.turn(turn.id,session.id);
          return json(response,saved.answer_state === 'error' ? 502 : 200,{turn:publicTurn(saved)});
        }
        const match = pathname.match(/^\/api\/turns\/([\w-]+)(?:\/(recover|render))?$/);
        if (match) {
          const turn = store.turn(match[1],session.id);
          if (!turn) throw new RequestError(404,'Turn not found.');
          if (!match[2] && request.method === 'GET') return json(response,200,{turn:publicTurn(turn)});
          if (match[2] === 'recover' && request.method === 'POST') {
            await recover(turn); return json(response,200,{turn:publicTurn(store.turn(turn.id,session.id))});
          }
          if (match[2] === 'render' && request.method === 'POST') {
            const body = await readJson(request), result = turn.ad_result;
            if (result?.status !== 'awarded' || body.awardId !== result.award.id || body.deliveryToken !== result.deliveryToken ||
              body.observation?.creativeHash !== result.award.creativeHash || body.observation?.domInserted !== true || body.observation?.sponsoredLabelPresent !== true)
              throw new RequestError(400,'render_not_observed_or_bound');
            if (turn.receipt) return json(response,200,turn.receipt);
            if (activeRenders.has(turn.id)) return json(response,200,await activeRenders.get(turn.id));
            if (turn.delivery_state !== 'reserved' || Date.now() >= result.award.expiresAt) throw new RequestError(409,'Recover the original award before acknowledging.');
            store.update(turn.id,{delivery_state:'submitting'});
            const task = (async()=> {
              try {
                const receipt = await publisher.acknowledgeRender({awardId:result.award.id,deliveryToken:result.deliveryToken,observation:body.observation});
                validateReceiptResult(receipt,receiptBinding(result));
                store.update(turn.id,{receipt,delivery_state:'accepted',error_code:null}); return receipt;
              } catch (failure) {
                store.update(turn.id,{delivery_state:'unknown',error_code:errorCode(failure)});
                throw new RequestError(502,'Delivery unconfirmed. Recover this existing award; do not repurchase.');
              }
            })().finally(()=>activeRenders.delete(turn.id)); activeRenders.set(turn.id,task);
            return json(response,200,await task);
          }
          throw new RequestError(405,'Method not allowed.');
        }
        throw new RequestError(404,'Not found.');
      }
      const asset = assets.get(pathname);
      if (!asset) throw new RequestError(404,'Not found.');
      if (!['GET','HEAD'].includes(request.method)) throw new RequestError(405,'Use GET or HEAD.');
      const data = await readFile(asset[0]); response.writeHead(200,{'Content-Type':`${asset[1]}; charset=utf-8`});
      response.end(request.method === 'HEAD' ? undefined : data);
    } catch (failure) { json(response,failure instanceof RequestError ? failure.status : 500,
      {error:failure instanceof RequestError ? failure.message : 'Something went wrong. Please try again.'}); }
  });
  server.appIdle = ()=>Promise.allSettled([...activeAds.values(),...activeAnswers.values(),...activeRenders.values()]);
  server.store = store; return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.umask(0o077);
  process.loadEnvFile(fileURLToPath(new URL('../../../local-state/sdk-pilot/integrator.env',import.meta.url)));
  const baseURL = process.env.AXP_EXCHANGE_URL || 'http://127.0.0.1:3472/api/product', endpoint = new URL(baseURL);
  if (!['localhost','127.0.0.1','[::1]'].includes(endpoint.hostname) || endpoint.protocol !== 'http:') throw new Error('Loopback exchange required.');
  const publisher = new AXPPublisher({apiKey:process.env.AXP_PUBLISHER_API_KEY,baseURL,timeoutMs:3000,receiptTimeoutMs:3000,fetch:pilotFetch(process.env.PILOT_TRANSPORT_FAULT)});
  const port = Number(process.env.PORT ?? 3473);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');
  const store = new Store(process.env.PILOT_STORE || fileURLToPath(new URL('./.state/pilot.sqlite',import.meta.url)));
  const server = createChatServer({publisher,store});
  server.listen(port,'127.0.0.1',()=>console.log(`Fixture pilot ready: http://127.0.0.1:${server.address().port} (no live models or payments)`));
  process.on('SIGTERM',()=> { server.close(async()=> { await server.appIdle(); store.close(); process.exit(0); }); server.closeAllConnections(); });
}
