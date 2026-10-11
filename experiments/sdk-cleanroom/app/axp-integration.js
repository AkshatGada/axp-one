import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { AXPPublisher } from './vendor/publisher-sdk/index.mjs';

const SESSION_TTL = 60 * 60 * 1000;
const MAX_SESSIONS = 100;
const MAX_TURNS = 100;
const COOKIE = 'axp_chat';

export class IntegrationError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function equal(a, b) {
  return typeof a === 'string' && typeof b === 'string' &&
    Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

function sameOrigin(request) {
  // Derive the trusted origin from the listening socket, never an arbitrary Host.
  const port = request.socket.localPort;
  const allowed = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (!allowed.includes(request.headers.host) || request.headers.origin !== `http://${request.headers.host}` ||
      (request.headers['sec-fetch-site'] && request.headers['sec-fetch-site'] !== 'same-origin')) {
    throw new IntegrationError(403, 'Same-origin browser request required.');
  }
}

export function configuredPublisher(env = process.env) {
  if (!env.AXP_EXCHANGE_URL && !env.AXP_PUBLISHER_API_KEY) return null;
  // This exercise must not accidentally use the SDK's hosted default.
  if (env.AXP_EXCHANGE_URL !== 'http://127.0.0.1:3470/api/product' || !env.AXP_PUBLISHER_API_KEY) {
    throw new Error('AXP requires the operator loopback URL and a server-only publisher key.');
  }
  return new AXPPublisher({ baseURL: env.AXP_EXCHANGE_URL, apiKey: env.AXP_PUBLISHER_API_KEY,
    timeoutMs: 15000, receiptTimeoutMs: 45000 });
}

export function createIntegration(publisher, { now = Date.now } = {}) {
  const sessions = new Map();
  function cookieId(request) {
    return request.headers.cookie?.split(';').map(value => value.trim())
      .find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  }
  async function release(turn) {
    if (!turn.result?.award || turn.receiptAttempted || turn.released) return;
    if (turn.releasing) return turn.releasing;
    turn.releasing = Promise.resolve().then(() => publisher.failRender({
      awardId: turn.result.award.id, deliveryToken: turn.result.deliveryToken, reason: 'render_failed',
    })).then(() => { turn.released = true; }).finally(() => { turn.releasing = null; });
    return turn.releasing;
  }
  function retire(session) {
    session.active = false;
    for (const turn of session.turns.values()) {
      turn.cancelled = true;
      // Uncertain receipts must never be turned into insertion failures.
      void release(turn).catch(() => {}); // Expiry is the documented fallback.
    }
  }
  function sweep() {
    for (const [id, session] of sessions) {
      if (session.expires <= now()) { retire(session); sessions.delete(id); }
    }
  }
  function authenticate(request, csrf) {
    sameOrigin(request);
    sweep();
    const session = sessions.get(cookieId(request));
    if (!session?.active || !equal(session.csrf, csrf)) throw new IntegrationError(403, 'Chat session expired or invalid.');
    return session;
  }
  function ownedTurn(session, turnId) {
    const turn = [...session.turns.values()].find(value => value.id === turnId);
    if (!turn || turn.cancelled) throw new IntegrationError(404, 'Placement not found in this conversation.');
    return turn;
  }
  return {
    bootstrap(request, response) {
      sameOrigin(request);
      if (request.headers['x-app-init'] !== '1') throw new IntegrationError(403, 'App initialization header required.');
      if (!publisher) return { enabled: false };
      sweep();
      const oldId = cookieId(request);
      const old = sessions.get(oldId);
      if (old) { retire(old); sessions.delete(oldId); }
      if (sessions.size >= MAX_SESSIONS) throw new IntegrationError(503, 'Sponsored placement sessions are at capacity.');
      const id = randomBytes(32).toString('hex');
      const session = { id: randomUUID(), csrf: randomBytes(32).toString('hex'), active: true,
        expires: now() + SESSION_TTL, turns: new Map() };
      sessions.set(id, session);
      response.setHeader('Set-Cookie', `${COOKIE}=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=3600`);
      return { enabled: true, csrf: session.csrf, financialMode: 'synthetic' };
    },
    begin(request, metadata, messages) {
      if (!metadata || !publisher) return null;
      const session = authenticate(request, metadata.csrf);
      if (typeof metadata.submissionId !== 'string' || !/^[a-f0-9-]{36}$/.test(metadata.submissionId)) {
        throw new IntegrationError(400, 'A stable submission ID is required.');
      }
      const canonical = JSON.stringify(messages);
      const previous = session.turns.get(metadata.submissionId);
      if (previous) {
        if (previous.canonical !== canonical) throw new IntegrationError(409, 'Submission input changed. Start a new turn.');
        return previous;
      }
      if (session.turns.size >= MAX_TURNS) throw new IntegrationError(429, 'Start a new chat for more placements.');
      const turn = { id: randomUUID(), canonical, cancelled: false };
      session.turns.set(metadata.submissionId, turn);
      const question = messages.at(-1).content;
      if (question.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/u.test(question)) {
        turn.result = { status: 'skipped', reason: 'Only plain-text messages up to 1,200 characters are shared.' };
        turn.task = Promise.resolve(turn.result);
      } else {
        // Store canonical identity before dispatch; no automatic purchase retry.
        turn.task = Promise.resolve().then(() => publisher.requestAd({ question, sessionId: session.id,
          turnId: turn.id, placementId: 'chat-sponsored-card' }))
          .then(async result => {
            turn.result = result;
            if (turn.cancelled) await release(turn).catch(() => {});
            return result;
          }).catch(() => (turn.result = { status: 'error', error: { code: 'request_failed' } }));
      }
      return turn;
    },
    descriptor(turn) {
      return turn ? { turnId: turn.id, status: turn.cancelled ? 'skipped' : 'pending' } : undefined;
    },
    cancel(turn) {
      if (!turn) return;
      turn.cancelled = true;
      void release(turn).catch(() => {});
    },
    async handle(path, request, body) {
      const session = authenticate(request, request.headers['x-app-csrf']);
      const turn = ownedTurn(session, body?.turnId);
      if (path === '/api/axp/placement') {
        const result = await turn.task;
        if (!session.active || turn.cancelled) throw new IntegrationError(410, 'Conversation has ended.');
        if (result.status === 'awarded') {
          if (result.award.expiresAt <= now()) {
            turn.cancelled = true;
            await release(turn).catch(() => {});
            return { status: 'error', error: { code: 'award_expired' } };
          }
          if ((result.financialMode ?? result.mode) !== 'synthetic') {
            turn.cancelled = true;
            await release(turn).catch(() => {});
            return { status: 'error', error: { code: 'unexpected_financial_mode' } };
          }
          return { status: 'awarded', award: result.award, deliveryToken: result.deliveryToken, financialMode: 'synthetic' };
        }
        // Deliberately omit advertiser traces and private buying context.
        return { status: result.status, ...(result.reason ? { reason: result.reason } : {}),
          ...(result.error ? { error: { code: result.error.code } } : {}) };
      }
      const result = turn.result;
      if (result?.status !== 'awarded' || !equal(body.awardId, result.award.id) ||
          !equal(body.deliveryToken, result.deliveryToken)) throw new IntegrationError(403, 'Award binding mismatch.');
      if (path === '/api/axp/fail') {
        if (turn.receiptAttempted) throw new IntegrationError(409, 'Delivery may already be accepted; retry the same receipt.');
        turn.cancelled = true;
        await release(turn);
        return { status: 'failed' };
      }
      if (turn.released || turn.releasing) throw new IntegrationError(409, 'Insertion failure already reported.');
      const observation = body.observation;
      if (observation?.domInserted !== true || observation.sponsoredLabelPresent !== true ||
          !equal(observation.creativeHash, result.award.creativeHash)) {
        throw new IntegrationError(400, 'Exact insertion and Sponsored disclosure must be observed.');
      }
      turn.receiptAttempted = true;
      // Retry forwards the SAME stored capability. Exchange owns one-charge idempotency.
      const receipt = await publisher.acknowledgeRender({ awardId: result.award.id,
        deliveryToken: result.deliveryToken, observation: { creativeHash: result.award.creativeHash,
          domInserted: true, sponsoredLabelPresent: true } });
      return { status: receipt.status, charge: { id: receipt.charge.id, amountBaseUnits: receipt.charge.amountBaseUnits },
        financialMode: receipt.financialMode ?? receipt.mode ?? result.financialMode ?? result.mode, replayed: receipt.replayed };
    },
  };
}
