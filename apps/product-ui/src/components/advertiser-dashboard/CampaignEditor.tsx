'use client';
import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { api, blankDraft, draftFields, decimal, toBaseUnits, type Bootstrap, type Campaign, type Draft, type Preview } from './model';
import { currencyUnit, nativePayments, networkLabel, paymentReadiness } from './payment';
const STEPS = ['Offer', 'Audience', 'Ad text', 'Budget', 'Review'];
const STEP_TITLES = ['What are you advertising?', 'Who should see it?', 'Write your Sponsored card', 'Set your limits', 'Review and launch'];
const STEP_HELP = [
  'The campaign name stays private. The brand and website appear on the card.',
  'Describe the conversations where your offer helps. Your buying agent uses this to decide when to bid.',
  'This exact text is shown if your campaign wins a placement. The app’s answer stays independent of it.',
  'You never spend more than these limits.',
  'Check everything once. After launch the campaign can compete in the example chat.',
];
type Props = { initial?: Campaign; bootstrap: Bootstrap; account: { name: string; websiteURL: string }; onSaved: () => Promise<void>; onClose: () => void; onLaunched: (campaign: Campaign) => void; onDirtyChange: (dirty: boolean) => void };
export function CampaignEditor({ initial, bootstrap, account, onSaved, onClose, onLaunched, onDirtyChange }: Props) {
  const direct=bootstrap.financialMode==='testnet';
  const native = nativePayments(bootstrap);
  const [draft, setDraft] = useState<Draft>(() => initial ? draftFields(initial) : {...blankDraft(),...(direct?{depositBaseUnits:'0',settlementNetwork:'hsk-testnet' as const}:{})});
  const network = draft.settlementNetwork ?? (direct?'hsk-testnet':'solana-devnet'), unit = currencyUnit(native, network), readiness = paymentReadiness(bootstrap, network);
  const [step, setStep] = useState(0), [hints, setHints] = useState(initial?.contextHints.join('\n') ?? '');
  const [money, setMoney] = useState({ maxBidBaseUnits: decimal(draft.maxBidBaseUnits), budgetCapBaseUnits: decimal(draft.budgetCapBaseUnits), depositBaseUnits: decimal(draft.depositBaseUnits) });
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [notice, setNoticeText] = useState(''), [noticeTone, setNoticeTone] = useState<'done' | 'error' | 'blocked'>('done'), [dirty, setDirty] = useState(!initial);
  const [question, setQuestion] = useState(''), [preview, setPreview] = useState<Preview | null>(null), [previewBusy, setPreviewBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const setNotice = (text: string, tone: 'done' | 'error' | 'blocked' = 'error') => { setNoticeText(text); setNoticeTone(tone); };
  const [capQuery, setCapQuery] = useState('');
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const [reviewed, setReviewed] = useState(false);
  const markDirty = () => { setDirty(true); setReviewed(false); };
  const patch = (key: keyof Draft, value: Draft[keyof Draft]) => { setDraft(d => ({ ...d, [key]: value })); markDirty(); setNotice(''); setPreview(null); setErrors(e => ({ ...e, [key]: '' })); };
  const complete = (): Draft => ({ ...draftFields(draft), contextHints: hints.split(/\n/).map(v => v.trim()).filter(Boolean), ...(direct?{settlementNetwork:'hsk-testnet',depositBaseUnits:'0'}:{}), ...Object.fromEntries(Object.entries(money).filter(([k])=>!direct||k!=='depositBaseUnits').map(([k, v]) => [k, v.trim() ? toBaseUnits(v) ?? '0' : draft[k as keyof typeof money]])) });
  function validate(until = step) {
    const e: Record<string, string> = {};
    if (until >= 0) {
      if (!draft.name.trim()) e.name = 'Give this campaign a name.';
      if (!draft.brandName.trim()) e.brandName = 'Add the brand shown on the Sponsored card.';
      try { const url = new URL(draft.websiteURL); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); } catch { e.websiteURL = 'Use a complete https website address.'; }
      if (!draft.productDescription.trim()) e.productDescription = 'Describe what you are offering.';
    }
    if (until >= 1) {
      const values = hints.split(/\n/).map(v => v.trim()).filter(Boolean);
      if (!values.length) e.contextHints = 'Add at least one hint.';
      else if (values.length > 6 || values.some(v => v.length > 400)) e.contextHints = 'Use up to 6 hints, with at most 400 characters each.';
      if (draft.declaredCapabilities.length > 12) e.declaredCapabilities = 'Choose up to 12 features.';
      else if (!draft.declaredCapabilities.length) e.declaredCapabilities = 'Choose at least one feature your product offers.';
    }
    if (until >= 2 && !draft.approvedText.trim()) e.approvedText = 'Add the exact text approved for the Sponsored card.';
    if (until >= 3) {
      for (const [key, value] of Object.entries(money)) if ((!direct||key!=='depositBaseUnits') && (!toBaseUnits(value) || BigInt(toBaseUnits(value)!) <= 0n)) e[key] = 'Enter a positive amount with up to 6 decimal places.';
      if (!Object.keys(e).some(k => k in money)) {
        if (bootstrap.limits) {
          const bid = BigInt(toBaseUnits(money.maxBidBaseUnits)!);
          if (bid < BigInt(bootstrap.limits.floorBaseUnits)) e.maxBidBaseUnits = `Minimum bid is ${decimal(bootstrap.limits.floorBaseUnits)} ${unit}.`;
          if (bid > BigInt(bootstrap.limits.maxBidBaseUnits)) e.maxBidBaseUnits = `Maximum bid is ${decimal(bootstrap.limits.maxBidBaseUnits)} ${unit}.`;
          for (const key of ['budgetCapBaseUnits', 'depositBaseUnits'] as const) { const ceiling = key === 'depositBaseUnits' ? readiness?.limits?.maxDepositBaseUnits ?? bootstrap.limits.maxBudgetBaseUnits : bootstrap.limits.maxBudgetBaseUnits; if (BigInt(toBaseUnits(money[key])!) > BigInt(ceiling)) e[key] = `Maximum amount is ${decimal(ceiling)} ${unit}.`; }
        }
        if (BigInt(toBaseUnits(money.maxBidBaseUnits)!) > BigInt(toBaseUnits(money.budgetCapBaseUnits)!)) e.maxBidBaseUnits = 'The maximum bid must fit within the spending limit.';
        if (!direct && BigInt(toBaseUnits(money.budgetCapBaseUnits)!) > BigInt(toBaseUnits(money.depositBaseUnits)!)) e.depositBaseUnits = `${native ? 'The channel deposit' : 'The amount set aside'} must cover the spending limit.`;
      }
    }
    setErrors(e);
    if (Object.keys(e).length) {
      const key = Object.keys(e)[0];
      const targetStep = ['name', 'brandName', 'websiteURL', 'productDescription'].includes(key) ? 0 : ['contextHints', 'declaredCapabilities'].includes(key) ? 1 : key === 'approvedText' ? 2 : 3;
      setStep(targetStep);
      requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[name="${key}"]`)?.focus());
      return false;
    }
    return true;
  }
  async function save(launch = false) {
    if (launch && !validate(4)) return;
    if (launch && !reviewed) { setNotice('Tick the review box before launching.', 'blocked'); return; }
    // Drafts may be incomplete; malformed monetary text cannot be silently saved as zero.
    const badMoney = Object.entries(money).find(([, v]) => Boolean(v.trim()) && toBaseUnits(v) === null);
    if (badMoney) { setErrors({ [badMoney[0]]: 'Use up to 6 decimal places.' }); setStep(3); return; }
    setBusy(true); setNotice('');
    let launchAttempted: Campaign | null = null;
    try {
      const result = await api<Campaign | { campaign: Campaign }>('/campaigns', bootstrap.csrf, complete());
      const saved = 'campaign' in result ? result.campaign : result;
      setDraft(d => ({ ...d, id: saved.id })); setDirty(false);
      if (launch) { await api(`/campaigns/${encodeURIComponent(saved.id)}/approve`, bootstrap.csrf, {}); launchAttempted = saved; const launched = await api<{campaign: Campaign}>(`/campaigns/${encodeURIComponent(saved.id)}/launch`, bootstrap.csrf, {}); await onSaved(); onLaunched(launched.campaign); }
      else { await onSaved(); setNotice('Draft saved. You can come back to it from Campaigns.', 'done'); }
    } catch (error) { if (native && launchAttempted) { await onSaved().catch(() => {}); onLaunched({...launchAttempted, payment: {...launchAttempted.payment, phase: 'unknown', reason: error instanceof Error ? error.message : 'Launch response unavailable'}}); } else setNotice(error instanceof Error ? error.message : 'Could not save the campaign.'); }
    finally { setBusy(false); }
  }
  async function testPreview() {
    if (!question.trim()) return;
    if (!validate(2)) return;
    const badMoney = Object.entries(money).find(([, v]) => Boolean(v.trim()) && toBaseUnits(v) === null);
    if (badMoney) { setErrors({ [badMoney[0]]: 'Use up to 6 decimal places.' }); setStep(3); return; }
    setPreviewBusy(true); setNotice('');
    try {
      const result = await api<Campaign | { campaign: Campaign }>('/campaigns', bootstrap.csrf, complete());
      const saved = 'campaign' in result ? result.campaign : result;
      setDraft(d => ({ ...d, id: saved.id })); setDirty(false); await onSaved();
      setPreview(await api<Preview>(`/campaigns/${encodeURIComponent(saved.id)}/preview`, bootstrap.csrf, { question }));
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Could not test this question.'); }
    finally { setPreviewBusy(false); }
  }
  function preset(index: number) {
    const p = bootstrap.presets[index]; if (!p) return;
    const value = { ...blankDraft(), ...p, ...(p.campaign ?? {}), id: draft.id,...(direct?{depositBaseUnits:'0',settlementNetwork:'hsk-testnet' as const}:{}) };
    setDraft(value); setHints(value.contextHints.join('\n')); setMoney({ maxBidBaseUnits: decimal(value.maxBidBaseUnits), budgetCapBaseUnits: decimal(value.budgetCapBaseUnits), depositBaseUnits: decimal(value.depositBaseUnits) }); setQuestion(p.exampleQuestion ?? ''); markDirty(); setPreview(null); setErrors({});
  }
  const input = (name: 'name' | 'brandName' | 'websiteURL', label: string, hint?: string) => <Ld.Field label={label} hint={hint} error={errors[name]}><input className="ld-input" name={name} value={draft[name]} onChange={e => patch(name, e.target.value)} maxLength={name === 'websiteURL' ? 500 : 120} type={name === 'websiteURL' ? 'url' : 'text'} aria-invalid={Boolean(errors[name])} autoComplete={name === 'brandName' ? 'organization' : 'off'} /></Ld.Field>;
  const leave = () => { if (!dirty || window.confirm('Leave this editor? Unsaved changes will be lost. Save your draft first to keep them.')) onClose(); };
  const goTo = (i: number) => { if (i <= step || validate(i - 1)) setStep(i); };
  const shownCaps = bootstrap.capabilities.filter(cap => `${cap.label} ${cap.description ?? ''}`.toLowerCase().includes(capQuery.toLowerCase()));
  const launchBlocked = native && readiness?.ready !== true;
  return <div className="ad-editor">
    <Ld.PageBar title={initial ? draft.name || 'Continue your campaign' : 'New campaign'} sub={`Shared demo campaign in ${account.name}`}
      crumbs={<button type="button" className="ad-text-button" disabled={busy || previewBusy} onClick={leave}>← Campaigns</button>}
      meta={<Ld.Tag tone={dirty ? 'warning' : 'success'}>{busy ? 'Saving…' : dirty ? 'Unsaved changes' : 'Draft saved'}</Ld.Tag>} />
    <Ld.Steps label="Campaign setup steps" steps={STEPS.map((label, i) => ({ title: label, state: i < step ? 'done' as const : i === step ? 'current' as const : 'todo' as const, onClick: () => goTo(i) }))} />
    <div className="ad-editor-grid">
      <form ref={form} onSubmit={e => { e.preventDefault(); if (step < 4) { if (validate()) setStep(s => s + 1); } else void save(true); }} noValidate>
        <Ld.Panel>
          <div className="ad-step-head">
            <span className="ld-caption">Step {step + 1} of 5</span>
            <h2 className="ld-section-title">{STEP_TITLES[step]}</h2>
            <p className="ld-secondary">{STEP_HELP[step]}</p>
          </div>
          <div className="ad-form-fields">
          {step === 0 && <>
            {!initial && bootstrap.presets.length > 0 && <Ld.Field label="Start with an example" hint="Fills every step with editable sample content."><select className="ld-select" defaultValue="" onChange={e => { if (e.target.value !== '') preset(Number(e.target.value)); }}><option value="">Start from scratch</option>{bootstrap.presets.map((p, i) => <option key={p.id ?? i} value={i}>{p.label ?? p.name ?? 'Example campaign'}</option>)}</select></Ld.Field>}
            {input('name', 'Campaign name', 'Only you see this.')}
            <div className="ad-field-pair">{input('brandName', 'Brand name', 'Shown on the card.')}{input('websiteURL', 'Destination website', 'Starts with https://')}</div>
            <Ld.Field label="What are you offering?" error={errors.productDescription} hint="The product, who it helps and why it is useful."><textarea className="ld-textarea" name="productDescription" rows={4} maxLength={1200} value={draft.productDescription} onChange={e => patch('productDescription', e.target.value)} aria-invalid={Boolean(errors.productDescription)} /></Ld.Field>
          </>}
          {step === 1 && <>
            <Ld.Field label="When should your ad appear?" hint="One line per hint, up to 6. Say when the offer fits and when to skip." error={errors.contextHints}><textarea className="ld-textarea" name="contextHints" rows={5} value={hints} onChange={e => { setHints(e.target.value); markDirty(); setPreview(null); }} aria-invalid={Boolean(errors.contextHints)} /></Ld.Field>
            <fieldset className="ad-capabilities" tabIndex={-1} name="declaredCapabilities">
              <legend className="ld-label">What your product does</legend>
              <p className="ld-field-h">Tick only what the product really offers. An app can require a feature, and campaigns without it are left out.</p>
              {bootstrap.capabilities.length > 8 && <input type="search" className="ld-input ad-cap-search" aria-label="Find a feature" placeholder="Find a feature" value={capQuery} onChange={e => setCapQuery(e.target.value)} />}
              <div className="ad-chips">{shownCaps.map(cap => <label key={cap.id} className="ad-chip" title={cap.description}><input type="checkbox" checked={draft.declaredCapabilities.includes(cap.id)} onChange={e => patch('declaredCapabilities', e.target.checked ? [...draft.declaredCapabilities, cap.id] : draft.declaredCapabilities.filter(v => v !== cap.id))} /><span>{cap.label}</span></label>)}</div>
              <span className="ld-caption">{draft.declaredCapabilities.length} selected</span>
              {errors.declaredCapabilities && <span className="ld-field-e" role="alert">{errors.declaredCapabilities}</span>}
            </fieldset>
            <Ld.Disclosure summary="How matching works">
              <p>Your buying agent, Jev, reads your hints each time an app has a placement and decides whether to bid. The features you tick are firm rules: they are checked before any bid. Past ad examples from ContextHint, when available, are shown separately from your hints.</p>
            </Ld.Disclosure>
          </>}
          {step === 2 && <>
            <Ld.Field label="Sponsored text" error={errors.approvedText} hint="Shown exactly as written, always labelled Sponsored."><textarea className="ld-textarea" name="approvedText" rows={5} maxLength={800} value={draft.approvedText} onChange={e => patch('approvedText', e.target.value)} aria-invalid={Boolean(errors.approvedText)} /><span className="ld-caption ad-character-count">{draft.approvedText.length}/800</span></Ld.Field>
            <Ld.Disclosure summary="Check it against a sample question">
              <div className="ad-preview-test"><Ld.Field label="A question a customer might ask" hint="Saves this draft and checks your rules and text. It does not predict a win, and it records no delivery or spend."><textarea className="ld-textarea" rows={2} value={question} onChange={e => { setQuestion(e.target.value); setPreview(null); }} placeholder="What might a customer ask an AI app?" /></Ld.Field><Ld.Button variant="secondary" disabled={previewBusy || busy || !question.trim()} onClick={() => void testPreview()}>{previewBusy ? 'Checking…' : 'Check question'}</Ld.Button>{preview && <Ld.Notice tone={preview.eligible === false ? 'blocked' : 'info'} title={preview.eligible === false ? 'This campaign would be left out' : 'This campaign could compete'}>{preview.reason?.replaceAll('_', ' ') ?? 'Your rules allow this question. Whether it bids is decided when a real placement comes up.'}{preview.matchedHints?.length ? ` Matched hints: ${preview.matchedHints.join(', ')}` : ''}</Ld.Notice>}</div>
            </Ld.Disclosure>
          </>}
          {step === 3 && <>
            {native && <Ld.Field label="Payment network" hint="Fixed once the campaign is funded."><select className="ld-select" name="settlementNetwork" value={network} onChange={e => patch('settlementNetwork', e.target.value as Draft['settlementNetwork'])}><option value="solana-devnet">Solana Devnet · Test USDC</option><option value="tempo-testnet" disabled={!bootstrap.payments?.networks?.['tempo-testnet']}>Tempo Testnet · test PathUSD</option></select></Ld.Field>}
            <p className="ad-money-note"><Ld.Tag tone="outline">{native ? `${networkLabel(network)} · ${unit}` : 'Test credits · no real money'}</Ld.Tag><span className="ld-secondary">{native ? network === 'tempo-testnet' ? 'The shared demo funds your channel with test tokens. Pay out while the campaign runs, then close to return what is unused.' : 'The shared demo funds your channel with test tokens. Closing pays accepted deliveries and returns what is unused.' : 'A bid is a ceiling, not a charge. You only spend when your card is shown.'}</span></p>
            {([['maxBidBaseUnits', 'Maximum bid per card', 'The most this campaign may bid for one placement.'], ['budgetCapBaseUnits', 'Spending limit', 'Total spend can never pass this.'], ['depositBaseUnits', native ? 'Channel deposit' : 'Test credits to set aside', native ? `${unit} locked at launch. Must cover the spending limit. Network fees are separate.` : 'Must cover the spending limit.']] as const).filter(([key])=>!direct||key!=='depositBaseUnits').map(([key, label, hint]) => <Ld.Field key={key} label={label} hint={hint} error={errors[key]}><div className="ad-money-input"><input className="ld-input" name={key} inputMode="decimal" value={money[key]} onChange={e => { setMoney(v => ({ ...v, [key]: e.target.value })); markDirty(); setErrors(v => ({ ...v, [key]: '' })); }} aria-invalid={Boolean(errors[key])} /><span>{unit}</span></div></Ld.Field>)}
          </>}
          {step === 4 && <>
            <dl className="ad-review">{native && <div><dt>Payment network</dt><dd>{networkLabel(network)} · {unit}</dd></div>}<div><dt>Advertiser</dt><dd>{draft.brandName} · {draft.websiteURL}</dd></div><div><dt>Campaign</dt><dd>{draft.name}</dd></div><div><dt>Offer</dt><dd>{draft.productDescription}</dd></div><div><dt>Appears when</dt><dd>{complete().contextHints.join(' · ')}</dd></div><div><dt>Product features</dt><dd>{draft.declaredCapabilities.map(id => bootstrap.capabilities.find(c => c.id === id)?.label ?? id).join(', ') || 'None declared'}</dd></div><div><dt>Maximum bid</dt><dd>{money.maxBidBaseUnits} {unit}</dd></div><div><dt>Spending limit</dt><dd>{money.budgetCapBaseUnits} {unit}</dd></div>{!direct&&<div><dt>{native ? 'Channel deposit' : 'Set aside'}</dt><dd>{money.depositBaseUnits} {unit}</dd></div>}</dl>
            {launchBlocked && <Ld.Notice tone="blocked" title={`${networkLabel(network)} is unavailable right now`}>{readiness?.reason ?? 'This campaign cannot be funded yet.'} Save the draft and launch later.</Ld.Notice>}
            <label className="ad-review-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I reviewed the exact Sponsored text, the product features and the spending limits. {native ? `I approve this campaign and its ${unit} channel deposit for launch.` : 'I approve this campaign for launch.'}</span></label>
            <p className="ld-caption">You are charged when your Sponsored card is shown. That does not prove attention, clicks or sales.</p>
          </>}
          {busy && native && step === 4 && <Ld.Notice tone="working">Opening the payment channel. Network confirmation can take up to a minute.</Ld.Notice>}
          {notice && <Ld.Notice tone={noticeTone}>{notice}</Ld.Notice>}
          </div>
          <div className="ad-editor-actions"><Ld.Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(s => s - 1)}>← Back</Ld.Button><div className="ld-row"><Ld.Button variant="secondary" disabled={busy || previewBusy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save draft'}</Ld.Button><Ld.Button type="submit" disabled={busy || previewBusy || (step === 4 && (!reviewed || launchBlocked))}>{busy ? native && step === 4 ? 'Opening channel…' : 'Saving…' : step === 4 ? native ? 'Fund channel & launch' : 'Launch campaign' : `Continue to ${STEPS[step + 1].toLowerCase()} →`}</Ld.Button></div></div>
        </Ld.Panel>
      </form>
      <aside className="ad-preview-column" aria-label="Sponsored card preview">
        <div className="ad-chat-preview">
          <div className="ad-preview-label"><span className="ld-label">Preview</span><span className="ld-caption">How your card appears in an AI app</span></div>
          <div className="ad-chat-answer"><span className="ld-caption">The app’s own answer</span><div className="ad-chat-lines" aria-hidden="true"><span /><span /><span /></div></div>
          <Ld.SponsoredCard advertiser={draft.brandName || 'Your brand'} text={draft.approvedText || 'Your Sponsored text appears here.'} url={draft.websiteURL} />
        </div>
        <p className="ld-caption ad-preview-foot">Always a separate card below the answer, labelled Sponsored. A preview is not a delivery.</p>
      </aside>
    </div>
  </div>;
}
