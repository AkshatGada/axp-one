import { createSponsoredCard, createRenderAcknowledger } from '/sdk/browser.mjs';
const form = document.querySelector('#composer'), input = document.querySelector('#message');
const send = document.querySelector('#send'), reset = document.querySelector('#reset');
const log = document.querySelector('#messages'), status = document.querySelector('#status');
const error = document.querySelector('#error'), consent = document.querySelector('#consent');
let session, busy = true, retryDraft;
const views = new Map();
async function api(path, body) {
  const response = await fetch(path, body === undefined ? {} : {
    method:'POST', headers:{'content-type':'application/json','x-app-csrf':session.csrf}, body:JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.error || 'Request unconfirmed. Recover the existing turn.');
  return value;
}
function appendMessage(role, content) {
  document.querySelector('#empty')?.remove();
  const article = document.createElement('article'); article.className = `message ${role}`;
  const label = document.createElement('h2'); label.textContent = role === 'user' ? 'You' : 'Fixture responder';
  const text = document.createElement('p'); text.textContent = content;
  article.append(label,text); log.append(article); log.scrollTop = log.scrollHeight; return article;
}
function setBusy(value) {
  busy = value; send.disabled = value; reset.disabled = value; input.readOnly = value;
  form.setAttribute('aria-busy',String(value)); send.textContent = value ? 'Sending…' : 'Send message';
  status.textContent = value ? 'Waiting for the independent fixture answer…' : '';
}
function showError(failure) { error.textContent = failure.message; error.hidden = false; }
function renderTurn(turn) {
  let view = views.get(turn.id);
  if (!view) {
    appendMessage('user',turn.content);
    const article = appendMessage('assistant',turn.answer || 'Answer unavailable; this turn remains saved.');
    const note = document.createElement('p'); note.className = 'ad-status';
    const recover = document.createElement('button'); recover.type = 'button'; recover.textContent = 'Recover existing outcome';
    recover.addEventListener('click',async()=> {
      recover.disabled = true;
      try { renderTurn((await api(`/api/turns/${turn.id}/recover`,{})).turn); }
      catch (failure) { showError(failure); } finally { recover.disabled = false; }
    });
    article.append(note,recover); view = {article,note,recover}; views.set(turn.id,view);
  }
  view.note.textContent = turn.receipt
    ? `Insertion accepted · ${turn.receipt.financialMode || turn.receipt.mode || 'mode unknown'} · charge ${turn.receipt.charge.id}. Not human attention or finalized payout.`
    : `Ad: ${turn.deliveryState || turn.adState}${turn.errorCode ? ` (${turn.errorCode})` : ''}.`;
  view.recover.hidden = ['sharing_off','question_too_long','no_fill'].includes(turn.adState) || !!turn.receipt || ['failed','expired'].includes(turn.deliveryState);
  if (turn.award && !view.card && view.article.isConnected) {
    const card = createSponsoredCard({document,award:turn.award}); view.card = card; view.article.append(card);
    if (turn.receipt) return; // Saved accepted card is history, not a new delivery.
    const acknowledge = createRenderAcknowledger({post:async(_path,observation,deliveryToken)=>api(`/api/turns/${turn.id}/render`,{
      awardId:turn.award.id,deliveryToken,observation,
    })});
    acknowledge({node:card,award:turn.award,deliveryToken:turn.deliveryToken})
      .then(receipt=> { if (card.isConnected) renderTurn({...turn,receipt,deliveryState:'accepted'}); })
      .catch(()=> { view.note.textContent = 'Insertion unconfirmed. Recover the existing award; no replacement purchase.'; view.recover.hidden = false; });
  }
  if (!turn.award && !turn.receipt && view.card) { view.card.remove(); view.card = null; }
}
async function follow(turnId, sessionId) {
  for (let i=0;i<24 && session.id === sessionId;i++) {
    const {turn} = await api(`/api/turns/${turnId}`);
    if (session.id !== sessionId) return;
    renderTurn(turn); if (turn.adState !== 'requesting') return;
    await new Promise(resolve=>setTimeout(resolve,250));
  }
}
form.addEventListener('submit',async event=> {
  event.preventDefault(); if (busy) return;
  const content = input.value.trim(); if (!content) { input.reportValidity(); return; }
  const draft = retryDraft?.content === content ? retryDraft : {content,consent:consent.checked,requestId:crypto.randomUUID()};
  retryDraft = draft; consent.checked = false; error.hidden = true; setBusy(true);
  try {
    const {turn} = await api('/api/chat',draft); renderTurn(turn); input.value = ''; retryDraft = undefined;
    follow(turn.id,session.id).catch(showError);
  } catch (failure) { showError(new Error(`${failure.message} Retry preserves this request identity and consent; New chat starts separately.`)); }
  finally { setBusy(false); input.focus(); }
});
input.addEventListener('input',()=> { if (retryDraft && input.value.trim() !== retryDraft.content) {
  input.value = retryDraft.content; showError(new Error('Resolve/retry the saved request or start a new chat before changing it.'));
} });
input.addEventListener('keydown',event=> { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); if (!busy) form.requestSubmit(); } });
reset.addEventListener('click',async()=> {
  if (busy) return; setBusy(true);
  try { session = await api('/api/session',{}); views.clear(); log.replaceChildren(); input.value = ''; retryDraft = undefined; consent.checked = false; error.hidden = true; }
  catch (failure) { showError(failure); } finally { setBusy(false); }
});
setBusy(true);
try { session = await api('/api/session'); session.turns.forEach(renderTurn); setBusy(false); }
catch (failure) { showError(failure); status.textContent = 'Reload to restore your local session.'; }
