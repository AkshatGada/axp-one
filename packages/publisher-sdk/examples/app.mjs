import {financialModeOf, moneyUnit} from '/sdk/financial.mjs';
import {createSponsoredCard, createRenderAcknowledger} from '/sdk/browser.mjs';
const $ = id => document.getElementById(id);
const randomId = prefix => `${prefix}-${crypto.randomUUID()}`;
let sessionId = sessionStorage.getItem('axp-example-session') || randomId('session');
let csrf;
function session() {sessionStorage.setItem('axp-example-session', sessionId); $('session').textContent = `Session: ${sessionId}. Frequency scope changes only with a new conversation; campaign spend remains.`;}
session();
function element(tag, text, parent) {const node = document.createElement(tag); node.textContent = text; parent?.append(node); return node;}
async function post(path, body) {
  const response = await fetch(path, {method: 'POST', signal: AbortSignal.timeout(path === '/api/render' ? 45000 : 40000), headers: {'content-type': 'application/json', 'x-example-csrf': csrf}, body: JSON.stringify(body)});
  const value = await response.json(); if (!response.ok) throw new Error(value.error || 'request_failed'); return value;
}
const acknowledge = createRenderAcknowledger({post: (path, observation, deliveryToken) => {
  const awardId = path.split('/')[2];
  return post('/api/render', {awardId, observation, deliveryToken});
}});
function setBusy(busy) {$('send').disabled = busy; $('reset').disabled = busy;}
$('reset').onclick = () => {sessionId = randomId('session'); session(); $('turns').replaceChildren();};
$('chat').onsubmit = async event => {
  event.preventDefault(); const question = $('question').value.trim(); if (!question) return;
  const input = {question, sessionId, turnId: randomId('turn'), placementId: 'chat-sponsored-card'};
  setBusy(true); $('question').value = ''; $('status').textContent = 'Answer and ad request started independently.';
  const turn = element('article', '', $('turns'));
  element('h2', question, turn);
  const answer = element('p', 'Answer request in progress.', turn);
  const sponsor = element('div', '', turn);
  const adStatus = element('p', 'Ad request in progress.', turn);
  const details = element('details', '', turn); element('summary', 'Inspect decisions and receipt', details);
  const trace = element('pre', '', details);
  let organicSucceeded = false;
  const organicTask = post('/api/answer', input).then(value => {organicSucceeded = true; answer.textContent = `${value.answer}\n\nFresh ${value.model || 'DeepSeek'} answer. No sponsor material.`;}, error => {answer.textContent = `Organic provider failed: ${error.message}. No fixture answer replaces it.`;});
  const adTask = (async () => {
    try {
      const ad = await post('/api/ad', input); trace.textContent = JSON.stringify({mode: ad.mode, trace: ad.trace, error: ad.error}, null, 2);
      if (ad.status !== 'awarded') {adStatus.textContent = ad.status === 'error' ? `Ad path failed: ${ad.error.code}. Your answer remains available.` : 'No sponsored placement. No delivery charge.'; return;}
      adStatus.textContent = 'Award ready. Waiting for the independent organic answer before insertion.';
      await organicTask;
      if (!organicSucceeded) {await post('/api/fail', {awardId: ad.award.id, deliveryToken: ad.deliveryToken, reason: 'organic_answer_failed'}); adStatus.textContent = 'Organic provider failed. No card inserted; reservation released.'; return;}
      const node = createSponsoredCard({document, award: ad.award}); sponsor.append(node);
      adStatus.textContent = 'Card inserted. Acknowledging exact copy and Sponsored label.';
      const receipt = await acknowledge({node, award: ad.award, deliveryToken: ad.deliveryToken});
      adStatus.textContent = `Delivery accepted. ${receipt.charge.amountBaseUnits} ${moneyUnit(financialModeOf(receipt, ad))} base units accrued. ${receipt.authorization ? `Authorization: ${receipt.authorization.status}. No payout implied. ` : ''}Receipt: ${receipt.charge.id}`;
      trace.textContent = JSON.stringify({mode: ad.mode, trace: ad.trace, receipt}, null, 2);
    } catch (error) {adStatus.textContent = `Ad or delivery path failed: ${error.message}. Organic response is independent.`;}
  })();
  await Promise.allSettled([organicTask, adTask]); setBusy(false); $('status').textContent = 'Turn complete. A new question creates a new turn.';
};
try {const response = await fetch('/config'); const config = await response.json(); csrf = config.csrf; if (!csrf) throw new Error('missing_csrf'); if (!config.organic?.ready || config.organic.execution !== 'actual-api-model') throw new Error('deepseek_setup_required'); setBusy(false); $('status').textContent = 'DeepSeek ready. Every send is a fresh live turn.';}
catch {$('status').textContent = 'Unable to connect to this reference app.';}
