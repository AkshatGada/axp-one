import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { FixtureAnswerProvider } from './answer-provider.js';

const MAX_BODY_BYTES = 32 * 1024;
const assets = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/style.css', ['style.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

class RequestError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function validateMessages(messages) {
  if (!Array.isArray(messages) || messages.length < 1 || messages.length > 41 || messages.length % 2 !== 1) {
    throw new RequestError(400, 'Send an alternating conversation ending with a user message (up to 21 turns).');
  }
  return messages.map((message, index) => {
    const expectedRole = index % 2 === 0 ? 'user' : 'assistant';
    if (!message || message.role !== expectedRole || typeof message.content !== 'string' ||
        !message.content.trim() || message.content.length > 4000) {
      throw new RequestError(400, 'Messages must alternate user/assistant and contain 1–4000 characters of text.');
    }
    return { role: expectedRole, content: message.content.trim() };
  });
}

async function readJson(request) {
  if (request.headers['content-type']?.split(';')[0].trim() !== 'application/json') {
    throw new RequestError(415, 'Use application/json.');
  }
  let size = 0;
  const chunks = [];
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new RequestError(413, 'Conversation is too large. Start a new chat.');
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new RequestError(400, 'Invalid JSON.');
  }
}

function json(response, status, body) {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

export function createChatServer({ provider = new FixtureAnswerProvider() } = {}) {
  return http.createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const pathname = new URL(request.url, 'http://localhost').pathname;
      if (pathname === '/api/chat') {
        if (request.method !== 'POST') {
          response.setHeader('Allow', 'POST');
          return json(response, 405, { error: 'Use POST.' });
        }
        const body = await readJson(request);
        const messages = validateMessages(body?.messages);
        let answer;
        try {
          answer = await provider.answer({ messages });
          if (typeof answer !== 'string' || !answer.trim() || answer.length > 4000) {
            throw new Error('Invalid provider answer');
          }
        } catch {
          return json(response, 502, { error: 'The answer provider could not respond. Please try again.' });
        }
        return json(response, 200, { answer });
      }

      const asset = assets.get(pathname);
      if (!asset) return json(response, 404, { error: 'Not found.' });
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.setHeader('Allow', 'GET, HEAD');
        return json(response, 405, { error: 'Use GET or HEAD.' });
      }
      const content = await readFile(new URL(`./public/${asset[0]}`, import.meta.url));
      response.writeHead(200, { 'Content-Type': asset[1] });
      response.end(request.method === 'HEAD' ? undefined : content);
    } catch (error) {
      json(response, error instanceof RequestError ? error.status : 500, {
        error: error instanceof RequestError ? error.message : 'Something went wrong. Please try again.',
      });
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3471);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }
  const server = createChatServer();
  server.on('error', (error) => {
    console.error(`Unable to start chat server: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`Fixture chat: http://127.0.0.1:${port} (deterministic fixture; no AI provider)`);
  });
}
