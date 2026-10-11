import { postJSON, showPlacement } from './sponsorship.js';

const form = document.querySelector('#composer');
const input = document.querySelector('#message');
const send = document.querySelector('#send');
const reset = document.querySelector('#reset');
const log = document.querySelector('#messages');
const status = document.querySelector('#status');
const error = document.querySelector('#error');
let messages = [];
let busy = false;
let adSession = null;
let conversation = 0;
let submission = null;
const sponsorConsent = document.querySelector('#sponsor-consent');

async function startAdSession() {
  const version = ++conversation;
  adSession = null;
  try {
    const session = await postJSON('/api/axp/session', {});
    if (version === conversation && session.enabled) adSession = session;
  } catch { /* Organic chat remains available when optional setup fails. */ }
}
void startAdSession();

function appendMessage(role, content) {
  document.querySelector('#empty')?.remove();
  const article = document.createElement('article');
  article.className = `message ${role}`;
  const label = document.createElement('h2');
  label.textContent = role === 'user' ? 'You' : 'Fixture responder';
  const text = document.createElement('p');
  text.textContent = content;
  article.append(label, text);
  log.append(article);
  log.scrollTop = log.scrollHeight;
  return article;
}

function setBusy(value) {
  busy = value;
  send.disabled = value;
  reset.disabled = value;
  input.readOnly = value;
  form.setAttribute('aria-busy', String(value));
  send.textContent = value ? 'Sending…' : 'Send message';
  status.textContent = value ? 'Waiting for the fixture responder…' : '';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy) return;
  const content = input.value.trim();
  if (!content) {
    input.setCustomValidity('Please enter a message.');
    input.reportValidity();
    return;
  }
  error.hidden = true;
  const next = [...messages, { role: 'user', content }];
  const version = conversation;
  const session = sponsorConsent.checked ? adSession : null;
  const canonical = JSON.stringify(next);
  if (!submission || submission.canonical !== canonical) submission = { canonical, id: crypto.randomUUID() };
  const pending = appendMessage('user', content);
  setBusy(true);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: next, ...(session ? { axp: { csrf: session.csrf, submissionId: submission.id } } : {}) }),
      signal: controller.signal,
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || 'Unable to send your message.');
    if (typeof body.answer !== 'string' || !body.answer.trim()) throw new Error('The server returned an invalid answer.');
    messages = [...next, { role: 'assistant', content: body.answer }];
    appendMessage('assistant', body.answer);
    submission = null;
    if (body.axp?.turnId && body.axp.status === 'pending') {
      const slot = document.createElement('section');
      slot.className = 'sponsored-slot';
      slot.setAttribute('aria-label', 'Optional synthetic Sponsored placement');
      log.append(slot);
      void showPlacement({ document, slot, turnId: body.axp.turnId, csrf: session.csrf,
        isCurrent: () => version === conversation }).catch(() => {
          slot.textContent = 'Sponsored placement unavailable. Your fixture reply is unchanged.';
        });
    } else if (body.axp?.reason) {
      const note = document.createElement('p');
      note.className = 'placement-status';
      note.textContent = body.axp.reason;
      log.append(note);
    }
    input.value = '';
  } catch (failure) {
    pending.remove();
    error.textContent = failure.name === 'AbortError'
      ? 'The request timed out. Your message is still in the box; try sending it again.'
      : `${failure.message} Your message is still in the box; you can retry.`;
    error.hidden = false;
  } finally {
    clearTimeout(timeout);
    setBusy(false);
    if (document.activeElement === document.body || document.activeElement === send) input.focus();
  }
});

input.addEventListener('input', () => input.setCustomValidity(''));
input.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault();
    if (!busy) form.requestSubmit();
  }
});

reset.addEventListener('click', () => {
  if (busy) return;
  messages = [];
  submission = null;
  void startAdSession();
  log.replaceChildren();
  const empty = document.createElement('p');
  empty.id = 'empty';
  empty.textContent = 'Your conversation starts here.';
  log.append(empty);
  input.value = '';
  input.setCustomValidity('');
  error.hidden = true;
  status.textContent = 'New chat started.';
  input.focus();
});
