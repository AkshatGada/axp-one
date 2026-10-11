"use client";
import Link from 'next/link';
import {useCallback, useEffect, useRef, useState, type FormEvent} from 'react';
import {Ld} from '@axp/design-system/ledger';
import {productRequest} from './api.mjs';
import {createRenderAcknowledger, createSponsoredCard, inspectPlacement} from '../../../../../packages/publisher-sdk/browser.mjs';
import type {Award, OpportunityInput, OpportunityResult, ReceiptResult, RenderObservation} from '../../../../../packages/publisher-sdk/index.mjs';
import {boundPaymentIdentity, paymentState} from './payment-state.mjs';
import {PeekInside} from './PeekInside';
import {ChatDialog} from './ChatDialog';
import {AnswerText} from './AnswerText';
import {financialModeOf, type Config, type Answer, type Turn, type WorkspaceState, type PaymentAction, type BudgetCampaign} from './model';
import './publisher-demo.css';

const err = (error: unknown) => error instanceof Error ? error.message : 'request_failed';
const uid = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;
function loadSession() {
  try {const existing = sessionStorage.getItem('axp-publisher-session'); if (existing && /^session-[\w-]+$/.test(existing)) return existing;} catch {}
  return uid('session');
}
function storeSession(value: string) {try {sessionStorage.setItem('axp-publisher-session', value);} catch {}}

function NativeSponsor({award, deliveryToken, acknowledge, onObserved, onReceipt, onError}: {
  award: Award; deliveryToken: string;
  acknowledge: (node: HTMLElement, award: Award, deliveryToken: string) => Promise<ReceiptResult>;
  onObserved: (observation: RenderObservation) => void; onReceipt: (result: ReceiptResult) => void; onError: (error: unknown) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const callbacks = useRef({acknowledge, onObserved, onReceipt, onError}); callbacks.current = {acknowledge, onObserved, onReceipt, onError};
  useEffect(() => {
    const host = container.current; if (!host) return;
    let node: HTMLElement;
    try {node = createSponsoredCard({document, award, className: 'ld-ad pub-sponsored'}); host.replaceChildren(node);}
    catch (error) {callbacks.current.onError(error); return;}
    callbacks.current.onObserved(inspectPlacement(node, award));
    void callbacks.current.acknowledge(node, award, deliveryToken).then(result => callbacks.current.onReceipt(result), error => callbacks.current.onError(error));
    return () => {node.remove();};
  }, [award, deliveryToken]);
  return <div ref={container} data-placement-id="chat-sponsored-card" />;
}

export function PublisherDemo() {
  const [config, setConfig] = useState<Config>();
  const [connectionError, setConnectionError] = useState<string>();
  const csrf = useRef('');
  const [sessionId, setSessionId] = useState('');
  const [question, setQuestion] = useState('');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [adsEnabled, setAdsEnabled] = useState(true);
  const [requirement, setRequirement] = useState('');
  const [excluded, setExcluded] = useState('');
  const scrollIntent = useRef<{away: boolean; pointer: boolean; lastTop: number; touchY?: number} | null>(null);
  const conversation = useRef<HTMLDivElement>(null);
  const followingLatest = useRef(true);
  const composer = useRef<HTMLTextAreaElement>(null);
  const releasedAwards = useRef(new Set<string>());
  const acknowledger = useRef<ReturnType<typeof createRenderAcknowledger> | null>(null);
  if (!acknowledger.current) acknowledger.current = createRenderAcknowledger({post: (path, body, token) => productRequest<ReceiptResult>(`/demo${path}`, {body, csrf: csrf.current, deliveryToken: token, timeoutMs: 45000})});
  const patch = useCallback((turnId: string, update: Partial<Turn>) => setTurns(rows => rows.map(row => row.input.turnId === turnId ? {...row, ...update} : row)), []);
  const connect = useCallback(async () => {
    setConnectionError(undefined);
    try {
      const [bootstrap, info] = await Promise.all([productRequest<{csrf: string}>('/bootstrap'), productRequest<Config>('/publisher/config')]);
      if (!bootstrap.csrf || !info.publisherId || !info.placementId) throw new Error('publisher_configuration_missing');
      csrf.current = bootstrap.csrf; setConfig(info);
    } catch (error) {setConnectionError(err(error));}
  }, []);
  useEffect(() => {const value = loadSession(); setSessionId(value); storeSession(value); void connect();}, [connect]);
  const latestTurn = turns[turns.length - 1];
  useEffect(() => {
    const scroll = () => {if (!scrollIntent.current?.away && conversation.current) conversation.current.scrollTop = conversation.current.scrollHeight;};
    scroll();
    let frame = requestAnimationFrame(() => {scroll(); frame = requestAnimationFrame(scroll);});
    return () => cancelAnimationFrame(frame);
  }, [latestTurn?.input.turnId, latestTurn?.answer, latestTurn?.domObservation?.domInserted, latestTurn?.receipt?.charge.id]);
  async function snapshot(turnId: string, phase: 'budgetAfterAward' | 'budgetAfterDelivery') {
    patch(turnId, {budgetLoading: true});
    try {const budget = await productRequest<WorkspaceState>('/state'); patch(turnId, {[phase]: budget, budgetFetchedAt: Date.now(), budgetError: undefined});}
    catch (error) {patch(turnId, {budgetError: err(error)});}
    finally {patch(turnId, {budgetLoading: false});}
  }
  const paymentLock = useRef(false);
  async function paymentAction(turn: Turn, action: PaymentAction) {
    if (paymentLock.current || pending || turn.budgetLoading) return;
    const identity = boundPaymentIdentity(turn);
    if (!identity.campaignId || !identity.channelId || !turn.receipt) return;
    paymentLock.current = true;
    patch(turn.input.turnId, {paymentOperation: {action, pending: true, uncertain: turn.paymentOperation?.uncertain}});
    let submitted = false;
    try {
      // Refresh before any financial mutation; a historical turn cannot select a new channel.
      const latest = await productRequest<WorkspaceState>('/state');
      patch(turn.input.turnId, {budgetAfterDelivery: latest, budgetFetchedAt: Date.now(), budgetError: undefined});
      const campaign = latest.campaigns.find(c => c.id === identity.campaignId);
      const controls = paymentState(campaign, {...identity, uncertain: turn.paymentOperation?.uncertain});
      if (latest.financialMode !== 'devnet' || !controls[action]) throw new Error('Payment state changed. Inspect the refreshed records before continuing.');
      submitted = true;
      const result = await productRequest<{campaign: BudgetCampaign; paymentOperation?: {status?: string; reason?: string; reasonCode?: string}}>(`/campaigns/${encodeURIComponent(identity.campaignId)}/${action}`, {body: {}, csrf: csrf.current, timeoutMs: 60000});
      if (result.campaign?.id !== identity.campaignId || result.campaign.payment?.channelId !== identity.channelId) throw new Error('payment_identity_mismatch');
      const saved = {...latest, campaigns: latest.campaigns.map(c => c.id === identity.campaignId ? result.campaign : c)};
      const next = paymentState(result.campaign, identity);
      const blocked = result.paymentOperation?.status === 'blocked';
      const blockedReason = (result.paymentOperation?.reason ?? result.paymentOperation?.reasonCode ?? 'Payment checks blocked this action.').replaceAll('_', ' ');
      patch(turn.input.turnId, {budgetAfterDelivery: saved, budgetFetchedAt: Date.now(), paymentOperation: {action, pending: false, uncertain: next.needsReconcile, message: blocked ? `Payment action blocked: ${blockedReason}. Inspect the saved records.` : next.finalized ? 'Finalized on Solana Devnet. Publisher payout and refund are recorded below.' : action === 'reconcile' ? 'Saved payment identity checked. Inspect its current status.' : action === 'authorize' ? 'Accepted deliveries processed. Inspect the cumulative authorization.' : 'Close requested. Inspect status and refresh for finality.'}});
      // Refresh is read-only. Preserve the action response if this lookup is unavailable.
      await snapshot(turn.input.turnId, 'budgetAfterDelivery');
    } catch (error) {
      patch(turn.input.turnId, {paymentOperation: {action, pending: false, uncertain: submitted || turn.paymentOperation?.uncertain, error: submitted ? `Operation acknowledgement unavailable: ${err(error)}. Reconcile the saved identity before another payment action.` : err(error)}});
      if (submitted) await snapshot(turn.input.turnId, 'budgetAfterDelivery');
    } finally {paymentLock.current = false;}
  }
  // A failed organic call cannot turn a held award into a billable card.
  useEffect(() => {
    for (const turn of turns) {
      if (!turn.answerError || turn.ad?.status !== 'awarded' || releasedAwards.current.has(turn.ad.award.id)) continue;
      const ad = turn.ad; releasedAwards.current.add(ad.award.id);
      patch(turn.input.turnId, {awardRelease: 'pending'});
      void productRequest(`/demo/awards/${encodeURIComponent(ad.award.id)}/fail`, {body: {reason: 'organic_answer_failed'}, csrf: csrf.current, deliveryToken: ad.deliveryToken})
        .then(() => {patch(turn.input.turnId, {awardRelease: 'released', renderState: 'failed'}); void snapshot(turn.input.turnId, 'budgetAfterDelivery');}, error => patch(turn.input.turnId, {awardRelease: 'error', renderState: 'error', renderError: err(error)}));
    }
  }, [turns, patch]);

  async function requestAd(input: OpportunityInput) {
    patch(input.turnId, {adState: 'pending', adError: undefined});
    try {
      const ad = await productRequest<OpportunityResult>('/demo/chat', {body: input, csrf: csrf.current});
      if (!['awarded', 'no_fill'].includes(ad.status)) throw new Error('invalid_ad_response');
      patch(input.turnId, {ad, adReceivedAt: Date.now(), adState: 'done', ...(ad.status === 'awarded' ? {renderState: 'pending' as const} : {})});
      void snapshot(input.turnId, 'budgetAfterAward');
    } catch (error) {patch(input.turnId, {adError: err(error), adState: 'done'});}
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!question.trim() || pending || !organicReady || !config || !csrf.current) return;
    const input: OpportunityInput = {question: question.trim(), sessionId, turnId: uid('turn'), placementId: config.placementId,
      ...(requirement ? {requiredCapabilities: [requirement]} : {}), ...(excluded ? {excludedCategories: [excluded]} : {})};
    followingLatest.current = true;
    scrollIntent.current = {away: false, pointer: false, lastTop: 0};
    setTurns(rows => [...rows, {input, submittedAt: Date.now(), adState: adsEnabled ? 'pending' : 'disabled'}]); setSelected(undefined); setQuestion(''); setBusy(true);
    const answer = (async () => {
      try {
        const value = await productRequest<Answer>('/demo/answer', {body: {question: input.question, sessionId, turnId: input.turnId}, csrf: csrf.current, timeoutMs: 40000});
        if (!value.answer || value.advertiserMaterialIncluded !== false || value.answerMode !== 'actual-api-model' || value.replayed) throw new Error('fresh_live_answer_required');
        patch(input.turnId, {answer: value, answerReceivedAt: Date.now()});
      } catch (error) {patch(input.turnId, {answerError: err(error)});}
    })();
    const ad = adsEnabled ? requestAd(input) : Promise.resolve();
    await Promise.allSettled([answer, ad]); setBusy(false);
  }
  async function retryAd(turn: Turn) {setBusy(true); await requestAd(turn.input); setBusy(false);}
  async function retryRender(turn: Turn) {
    if (turn.ad?.status !== 'awarded') return;
    const ad = turn.ad;
    const node = document.querySelector<HTMLElement>(`[data-award-id="${CSS.escape(ad.award.id)}"]`);
    const observation = inspectPlacement(node, ad.award);
    if (!observation.domInserted || !observation.sponsoredLabelPresent) {patch(turn.input.turnId, {renderState: 'error', renderError: 'render_not_observed'}); return;}
    patch(turn.input.turnId, {renderState: 'pending', renderError: undefined, domObservation: observation});
    try {const receipt = await productRequest<ReceiptResult>(`/demo/awards/${encodeURIComponent(ad.award.id)}/render`, {body: observation, csrf: csrf.current, deliveryToken: ad.deliveryToken, timeoutMs: 45000}); patch(turn.input.turnId, {receipt, renderState: 'accepted', receiptReceivedAt: Date.now()}); void snapshot(turn.input.turnId, 'budgetAfterDelivery');}
    catch (error) {patch(turn.input.turnId, {renderState: 'error', renderError: err(error)});}
  }
  const pending = busy || turns.some(t => t.renderState === 'pending' || t.awardRelease === 'pending' || t.paymentOperation?.pending);
  const organicReady = config?.organic?.ready === true && config.organic.execution === 'actual-api-model';
  const financialMode = financialModeOf(config);
  const inspected = turns.find(t => t.input.turnId === selected);
  function fresh() {if (pending) return; const value = uid('session'); setSessionId(value); storeSession(value); setTurns([]); setSelected(undefined);}
  function choosePrompt(value: string) {setQuestion(value); composer.current?.focus();}
  function intent() {return scrollIntent.current ?? (scrollIntent.current = {away: false, pointer: false, lastTop: conversation.current?.scrollTop ?? 0});}
  function peek(turnId: string) {setSelected(turnId); void snapshot(turnId, 'budgetAfterDelivery');}

  return <div className="ld pub-demo pub-chat-app">
    <aside className="pub-sidebar" aria-label="Chat navigation">
      <Ld.Wordmark href="/" />
      <Ld.Button variant="secondary" onClick={fresh} disabled={pending || !sessionId}>New chat</Ld.Button>
      <div className="pub-chat-history">{turns.length ? <><span className="ld-label">This conversation</span>{turns.map((turn, i) => <a key={turn.input.turnId} href={`#chat-turn-${i + 1}`}>{turn.input.question}</a>)}</> : null}</div>
      <nav className="pub-sidebar-bottom" aria-label="Product"><button type="button" onClick={() => setSelected('settings')}>Chat settings</button><Link href="/advertiser-dashboard">Advertiser dashboard →</Link><Link href="/publisher-demo/integration">SDK integration →</Link><span className="ld-caption">axp.one publisher demo</span></nav>
    </aside>
    <main className="pub-chat-main" id="main">
      <header className="pub-chat-top"><div><h1>Chat</h1><span>{config?.organic?.model || 'DeepSeek'}</span></div><button type="button" className="pub-mobile-new" onClick={fresh} disabled={pending || !sessionId}>New chat</button><button type="button" onClick={() => setSelected('settings')} aria-label="Open chat settings">Settings ▾</button></header>
      {connectionError ? <div className="pub-chat-notice" role="alert"><b>Cannot connect to the exchange.</b><Ld.Button variant="ghost" onClick={() => void connect()}>Reconnect</Ld.Button><details><summary>Connection details</summary>{connectionError}</details></div> : null}
      {config && !organicReady && !connectionError ? <div className="pub-chat-notice" role="status">DeepSeek is unavailable. <Link href="/publisher-demo/integration">Check setup →</Link><Ld.Button variant="ghost" onClick={() => void connect()}>Check again</Ld.Button></div> : null}
      <div ref={conversation} className="pub-conversation" aria-live="polite" aria-atomic="false" tabIndex={0} aria-label="Conversation"
        onWheel={event => {const state = intent(), node = conversation.current; if (event.deltaY < 0) state.away = true; else if (node && node.scrollHeight - node.scrollTop - node.clientHeight - event.deltaY < 100) state.away = false;}}
        onPointerDown={() => {intent().pointer = true;}} onPointerUp={() => {intent().pointer = false;}}
        onTouchStart={event => {intent().touchY = event.touches[0]?.clientY;}}
        onTouchMove={event => {const state = intent(), y = event.touches[0]?.clientY; if (y !== undefined && state.touchY !== undefined && y > state.touchY) state.away = true; state.touchY = y;}}
        onKeyDown={event => {if (['ArrowUp', 'PageUp', 'Home'].includes(event.key) || event.key === ' ' && event.shiftKey) intent().away = true; else if (event.key === 'End') intent().away = false;}}
        onScroll={() => {const node = conversation.current, state = intent(); if (node && state.pointer) {if (node.scrollTop < state.lastTop) state.away = true; if (node.scrollHeight - node.scrollTop - node.clientHeight < 20) state.away = false;} if (node) state.lastTop = node.scrollTop;}}>
        <div className={`pub-thread${!turns.length ? ' pub-thread-empty' : ''}`}>
          {!turns.length ? <div className="pub-welcome"><h2>What are you exploring?</h2><div className="pub-examples">{(config?.sampleQuestions ?? ['Compare hardware wallets for Ethereum and Solana with offline key storage.', 'Recommend a developer tool to debug and build a TypeScript API.']).slice(0, 2).map((q, i) => <button key={q} type="button" onClick={() => choosePrompt(q)}>{i === 0 ? 'Compare hardware wallets' : 'Explore developer tools'} <span aria-hidden>→</span></button>)}</div></div> : turns.map((turn, index) => <article key={turn.input.turnId} id={`chat-turn-${index + 1}`} className="pub-turn" aria-label={`Turn ${index + 1}`}>
            <div className="pub-user"><span className="pub-sr-only">You</span><p>{turn.input.question}</p></div>
            <div className="pub-answer"><span className="pub-answer-brand">DeepSeek</span>
              {turn.answer ? <AnswerText text={turn.answer.answer} /> : turn.answerError ? <div role="alert"><p>The answer could not be generated.</p><Ld.Button variant="ghost" disabled={pending} onClick={() => choosePrompt(turn.input.question)}>Edit and try again</Ld.Button></div> : <p role="status" className="ld-muted">Waiting for DeepSeek…</p>}
            </div>
            {turn.ad?.status === 'awarded' && turn.answer ? <div className="pub-slot"><NativeSponsor award={turn.ad.award} deliveryToken={turn.ad.deliveryToken} acknowledge={(node, award, token) => acknowledger.current!({node, award, deliveryToken: token})} onObserved={domObservation => patch(turn.input.turnId, {domObservation})} onReceipt={receipt => {patch(turn.input.turnId, {receipt, renderState: 'accepted', receiptReceivedAt: Date.now(), renderError: undefined}); void snapshot(turn.input.turnId, 'budgetAfterDelivery');}} onError={error => patch(turn.input.turnId, {renderState: 'error', renderError: err(error)})} /></div> : turn.answer && turn.adState === 'pending' ? <span className="pub-slot-note" role="status">Checking sponsored suggestions…</span> : null}
            {turn.adState !== 'pending' && (turn.answer || turn.answerError) ? <div className="pub-turn-foot"><button type="button" onClick={() => peek(turn.input.turnId)} aria-haspopup="dialog">View internals <span aria-hidden>→</span></button>{turn.adError ? <span>Sponsored suggestion unavailable.</span> : turn.ad?.status === 'no_fill' ? <span>No sponsored suggestion.</span> : null}</div> : null}
          </article>)}
        </div>
      </div>
      <div className="pub-composer-wrap"><form className="pub-composer" onSubmit={event => void submit(event)}><label htmlFor="publisher-question" className="pub-sr-only">Your question</label><textarea ref={composer} id="publisher-question" value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={event => {if (event.nativeEvent.isComposing) return; if (event.key === 'Tab' && !event.shiftKey && !question.trim()) {event.preventDefault(); setQuestion(config?.sampleQuestions?.find(q => /hardware wallets?/i.test(q)) ?? 'Compare hardware wallets for Ethereum and Solana with offline key storage.');} else if (event.key === 'Enter' && !event.shiftKey) {event.preventDefault(); event.currentTarget.form?.requestSubmit();}}} placeholder="Ask anything" rows={2} maxLength={1200} required aria-describedby="publisher-send-hint" /><div className="pub-composer-foot"><span id="publisher-send-hint">{pending ? 'Request in progress' : <><kbd>Tab</kbd> suggested prompt</>}</span><button className="pub-send" type="submit" aria-label="Send question" disabled={pending || !organicReady || !config || !sessionId || !question.trim() || !!connectionError}>→</button></div></form><p className="pub-chat-disclosure">AI answers may be inaccurate. Sponsored suggestions are labelled.</p></div>
    </main>
    {inspected ? <ChatDialog title="Inside this turn" subtitle={`Turn ${turns.indexOf(inspected) + 1} · live request records`} onClose={() => setSelected(undefined)}><PeekInside turn={inspected} financialMode={financialMode} onRefreshBudget={() => void snapshot(inspected.input.turnId, inspected.receipt || inspected.awardRelease ? 'budgetAfterDelivery' : 'budgetAfterAward')} onPaymentAction={action => void paymentAction(inspected, action)} onRetryAd={() => void retryAd(inspected)} onRetryRender={() => void retryRender(inspected)} pending={pending} /></ChatDialog> : null}
    {selected === 'settings' ? <ChatDialog title="Chat settings" compact onClose={() => setSelected(undefined)}><div className="pub-stack"><label className="pub-check"><input type="checkbox" checked={adsEnabled} onChange={e => setAdsEnabled(e.target.checked)} disabled={pending} /> Enable sponsored suggestions</label><Ld.Field label="Required capability" hint="Optional. Campaigns must declare this capability."><select className="ld-select" value={requirement} onChange={e => setRequirement(e.target.value)} disabled={pending}><option value="">Infer from the question</option>{config?.capabilities?.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Ld.Field><Ld.Field label="Excluded category"><select className="ld-select" value={excluded} onChange={e => setExcluded(e.target.value)} disabled={pending}><option value="">No extra exclusion</option>{config?.capabilities?.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}</select></Ld.Field><div className="pub-between"><span className="ld-caption">Exchange mode</span><Ld.Tag tone="outline">{financialMode === 'devnet' ? 'Devnet · test USDC' : financialMode === 'synthetic' ? 'Synthetic test credits' : 'Connecting'}</Ld.Tag></div><details className="pub-details"><summary>Session and providers</summary><dl><dt>Session</dt><dd className="ld-mono">{sessionId}</dd><dt>Placement</dt><dd className="ld-mono">{config?.placementId}</dd><dt>Buyer</dt><dd>{config?.engine?.id} · {config?.engine?.ready ? 'Ready' : config?.engine?.reason || 'Unavailable'}</dd></dl><p className="ld-caption">A new chat changes the session. Campaign spend persists.</p><Link href="/publisher-demo/integration">SDK integration →</Link></details></div></ChatDialog> : null}
  </div>;
}
