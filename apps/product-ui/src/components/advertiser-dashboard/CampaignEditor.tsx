'use client';
import { useEffect, useRef, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { api, blankDraft, draftFields, decimal, toBaseUnits, type Bootstrap, type Campaign, type Draft, type Preview } from './model';
import { currencyUnit, nativePayments } from './payment';
import { DEMO_ADVERTISER, isDemoAutofillKey, missingDemoValues } from './demo';
const STEPS = ['Offer', 'Context', 'Creative', 'Spend', 'Review'];
type Props = { demoMode: boolean; initial?: Campaign; bootstrap: Bootstrap; account: { name: string; websiteURL: string }; onSaved: () => Promise<void>; onClose: () => void; onLaunched: (campaign: Campaign) => void; onDirtyChange: (dirty: boolean) => void };
export function CampaignEditor({ demoMode, initial, bootstrap, account, onSaved, onClose, onLaunched, onDirtyChange }: Props) {
  const native = nativePayments(bootstrap), unit = currencyUnit(native);
  const suggestion = bootstrap.demo?.advertiserSuggestion ?? DEMO_ADVERTISER;
  const [draft, setDraft] = useState<Draft>(() => initial ? draftFields(initial) : blankDraft());
  const [step, setStep] = useState(0), [hints, setHints] = useState(initial?.contextHints.join('\n') ?? '');
  const [money, setMoney] = useState({ maxBidBaseUnits: demoMode && !initial ? '' : decimal(draft.maxBidBaseUnits), budgetCapBaseUnits: demoMode && !initial ? '' : decimal(draft.budgetCapBaseUnits), depositBaseUnits: demoMode && !initial ? '' : decimal(draft.depositBaseUnits) });
  const [errors, setErrors] = useState<Record<string, string>>({}), [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [dirty, setDirty] = useState(!initial);
  const [question, setQuestion] = useState(''), [preview, setPreview] = useState<Preview | null>(null), [previewBusy, setPreviewBusy] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const [capQuery, setCapQuery] = useState('');
  useEffect(() => { onDirtyChange(dirty); }, [dirty, onDirtyChange]);
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const [reviewed, setReviewed] = useState(false);
  const markDirty = () => { setDirty(true); setReviewed(false); };
  const patch = (key: keyof Draft, value: Draft[keyof Draft]) => { setDraft(d => ({ ...d, [key]: value })); markDirty(); setNotice(''); setPreview(null); setErrors(e => ({ ...e, [key]: '' })); };
  useEffect(() => { if (demoMode && step < 4) form.current?.querySelector<HTMLElement>('input[name], textarea[name]')?.focus(); }, [step, demoMode]);
  function fillStep() {
    const current = { name: draft.name, brandName: draft.brandName, websiteURL: draft.websiteURL, productDescription: draft.productDescription, approvedText: draft.approvedText, contextHints: hints, ...money };
    const values = missingDemoValues(step, current, suggestion);
    if (!Object.keys(values).length) { setNotice('This step is already filled. Suggestions never overwrite your values.'); return; }
    if (step === 0 || step === 2) setDraft(value => ({ ...value, ...values }));
    else if (step === 1) setHints(values.contextHints ?? hints);
    else if (step === 3) setMoney(value => ({ ...value, ...values }));
    markDirty(); setErrors({}); setNotice(`${suggestion.brandName} suggestions filled the empty fields on this step. Review or edit them before continuing.`); setPreview(null);
  }
  function useSuggestedCapabilities() {
    const allowed = suggestion.declaredCapabilities.filter(id => bootstrap.capabilities.some(cap => cap.id === id));
    patch('declaredCapabilities', [...new Set([...draft.declaredCapabilities, ...allowed])]);
  }
  const complete = (): Draft => ({ ...draftFields(draft), contextHints: hints.split(/\n/).map(v => v.trim()).filter(Boolean), ...Object.fromEntries(Object.entries(money).map(([k, v]) => [k, v.trim() ? toBaseUnits(v) ?? '0' : draft[k as keyof typeof money]])) });
  function validate(until = step) {
    const e: Record<string, string> = {};
    if (until >= 0) {
      if (!draft.name.trim()) e.name = 'Give this campaign a name.';
      if (!draft.brandName.trim()) e.brandName = 'Add the brand shown on the Sponsored card.';
      try { const url = new URL(draft.websiteURL); if (url.protocol !== 'https:' || url.username || url.password) throw new Error(); } catch { e.websiteURL = 'Use a complete https website URL with no embedded credentials.'; }
      if (!draft.productDescription.trim()) e.productDescription = 'Describe the offer so contextual matching has something to work with.';
    }
    if (until >= 1) {
      const values = hints.split(/\n/).map(v => v.trim()).filter(Boolean);
      if (!values.length) e.contextHints = 'Add at least one hint to guide Jev.';
      else if (values.length > 6 || values.some(v => v.length > 400)) e.contextHints = 'Use up to 6 hints, with at most 400 characters each.';
      if (draft.declaredCapabilities.length > 12) e.declaredCapabilities = 'Declare up to 12 relevant capabilities.';
      else if (!draft.declaredCapabilities.length) e.declaredCapabilities = 'Declare at least one capability your offer supports.';
    }
    if (until >= 2 && !draft.approvedText.trim()) e.approvedText = 'Add the exact text approved for the Sponsored card.';
    if (until >= 3) {
      for (const [key, value] of Object.entries(money)) if (!toBaseUnits(value) || BigInt(toBaseUnits(value)!) <= 0n) e[key] = 'Enter a positive amount with up to 6 decimal places.';
      if (!Object.keys(e).some(k => k in money)) {
        if (bootstrap.limits) {
          const bid = BigInt(toBaseUnits(money.maxBidBaseUnits)!);
          if (bid < BigInt(bootstrap.limits.floorBaseUnits)) e.maxBidBaseUnits = `Minimum bid is ${decimal(bootstrap.limits.floorBaseUnits)} ${unit}.`;
          if (bid > BigInt(bootstrap.limits.maxBidBaseUnits)) e.maxBidBaseUnits = `Maximum bid is ${decimal(bootstrap.limits.maxBidBaseUnits)} ${unit}.`;
          for (const key of ['budgetCapBaseUnits', 'depositBaseUnits'] as const) { const ceiling = key === 'depositBaseUnits' ? bootstrap.payments?.limits?.maxDepositBaseUnits ?? bootstrap.limits.maxBudgetBaseUnits : bootstrap.limits.maxBudgetBaseUnits; if (BigInt(toBaseUnits(money[key])!) > BigInt(ceiling)) e[key] = `Maximum amount is ${decimal(ceiling)} ${unit}.`; }
        }
        if (BigInt(toBaseUnits(money.maxBidBaseUnits)!) > BigInt(toBaseUnits(money.budgetCapBaseUnits)!)) e.maxBidBaseUnits = 'Maximum bid must fit within the campaign cap.';
        if (BigInt(toBaseUnits(money.budgetCapBaseUnits)!) > BigInt(toBaseUnits(money.depositBaseUnits)!)) e.depositBaseUnits = `${native ? 'Channel deposit' : 'Test-credit allocation'} must cover the campaign cap.`;
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
    if (launch && !reviewed) { setNotice('Review the campaign and acknowledge the approved creative before launching.'); return; }
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
      else { await onSaved(); setNotice('Draft saved. You can return to it from Campaigns.'); }
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
    const value = { ...blankDraft(), ...p, ...(p.campaign ?? {}), id: draft.id };
    setDraft(value); setHints(value.contextHints.join('\n')); setMoney({ maxBidBaseUnits: decimal(value.maxBidBaseUnits), budgetCapBaseUnits: decimal(value.budgetCapBaseUnits), depositBaseUnits: decimal(value.depositBaseUnits) }); setQuestion(p.exampleQuestion ?? ''); markDirty(); setPreview(null); setErrors({});
  }
  const input = (name: 'name' | 'brandName' | 'websiteURL', label: string, hint?: string) => <Ld.Field label={label} hint={hint} error={errors[name]}><input className="ld-input" name={name} value={draft[name]} onChange={e => patch(name, e.target.value)} maxLength={name === 'websiteURL' ? 500 : 120} type={name === 'websiteURL' ? 'url' : 'text'} aria-invalid={Boolean(errors[name])} autoComplete={name === 'brandName' ? 'organization' : 'off'} /></Ld.Field>;
  return <div className="ad-editor">
    <Ld.PageBar title={initial ? 'Continue your campaign' : 'Create advertiser & campaign'} sub={`Managed by ${account.name}. A distinct brand and website identify the advertiser behind this campaign.`} meta={<Ld.Tag tone="outline">{dirty ? 'Unsaved changes' : 'Saved draft'}</Ld.Tag>} actions={<Ld.Button variant="ghost" disabled={busy || previewBusy} onClick={() => { if (!dirty || window.confirm('Leave this editor? Unsaved changes will be lost. Save your draft first to keep them.')) onClose(); }}>Back to campaigns</Ld.Button>} />
    <div className="ad-steps" aria-label="Campaign setup steps">{STEPS.map((label, i) => <button key={label} type="button" aria-current={i === step ? 'step' : undefined} onClick={() => { if (i <= step || validate(i - 1)) setStep(i); }}><span>{i < step ? '✓' : i + 1}</span>{label}</button>)}</div>
    <div className="ad-editor-grid">
      <form ref={form} onKeyDown={event => {
        const field = event.target;
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement) || busy || previewBusy || event.ctrlKey || event.altKey || event.metaKey) return;
        if (isDemoAutofillKey({enabled: demoMode, key: event.key, shiftKey: event.shiftKey, step, name: field.name, value: field.value, type: field instanceof HTMLTextAreaElement ? 'textarea' : field.type})) { event.preventDefault(); fillStep(); }
      }} onSubmit={e => { e.preventDefault(); if (step < 4) { if (validate()) setStep(s => s + 1); } else void save(true); }} noValidate>
        <Ld.Panel title={['Tell us about the offer', 'Guide your buying agent', 'Approve your Sponsored card', 'Set clear spending limits', 'Ready for review'][step]} sub={`Step ${step + 1} of 5`}>
          <div className="ad-form-fields">
          {demoMode && step < 4 && <div className="ad-step-autofill"><div><span className="ld-label">{suggestion.brandName} demo suggestion</span><p className="ld-caption">Press <Ld.Key>Tab</Ld.Key> from an empty field to fill this step. The next Tab moves focus normally.</p></div><Ld.Button variant="secondary" size="sm" disabled={busy || previewBusy} onClick={fillStep}>Fill this step</Ld.Button></div>}
          {step === 0 && <>
            {!initial && bootstrap.presets.length > 0 && <Ld.Field label="Start with an example" hint="Examples are editable. Your campaign is saved separately."><select className="ld-select" defaultValue="" onChange={e => { if (e.target.value !== '') preset(Number(e.target.value)); }}><option value="">Start from scratch</option>{bootstrap.presets.map((p, i) => <option key={p.id ?? i} value={i}>{p.label ?? p.name ?? 'Example campaign'}</option>)}</select></Ld.Field>}
            {input('name', 'Campaign name', 'An internal name to help you find this campaign.')}
            <div className="ad-field-pair">{input('brandName', 'Brand name')}{input('websiteURL', 'Destination website')}</div>
            <Ld.Field label="What are you offering?" error={errors.productDescription} hint="Describe the product, who it helps, and what makes it useful."><textarea className="ld-textarea" name="productDescription" rows={4} maxLength={1200} value={draft.productDescription} onChange={e => patch('productDescription', e.target.value)} aria-invalid={Boolean(errors.productDescription)} /></Ld.Field>
          </>}
          {step === 1 && <>
            <Ld.Field label="Advertiser context hints" hint="One hint per line, up to 6. Tell Jev when your offer fits, when to skip, and which needs matter. These hints stay separate from the Sponsored text." error={errors.contextHints}><textarea className="ld-textarea" name="contextHints" rows={5} value={hints} onChange={e => { setHints(e.target.value); markDirty(); setPreview(null); }} aria-invalid={Boolean(errors.contextHints)} /></Ld.Field>
            <fieldset className="ad-capabilities" tabIndex={-1} name="declaredCapabilities"><legend className="ld-label">Capabilities your offer supports</legend><p className="ld-secondary">Declare only features your offer actually provides. Publisher requirements can exclude a campaign.</p>{demoMode && <div className="ad-suggested-caps"><Ld.Button variant="secondary" disabled={busy || previewBusy} onClick={useSuggestedCapabilities}>Use suggested capabilities</Ld.Button><span className="ld-caption">Hardware wallet, offline key storage, Ethereum and Solana. Review each declaration.</span></div>}<input className="ld-input ad-cap-search" aria-label="Find a capability" placeholder="Find a capability" value={capQuery} onChange={e => setCapQuery(e.target.value)} /><div className="ad-capability-list">{bootstrap.capabilities.filter(cap => `${cap.label} ${cap.description ?? ''}`.toLowerCase().includes(capQuery.toLowerCase())).map(cap => <label key={cap.id} className="ad-capability"><input type="checkbox" checked={draft.declaredCapabilities.includes(cap.id)} onChange={e => patch('declaredCapabilities', e.target.checked ? [...draft.declaredCapabilities, cap.id] : draft.declaredCapabilities.filter(v => v !== cap.id))} /><span><strong>{cap.label}</strong>{cap.description && <small>{cap.description}</small>}</span></label>)}</div><span className="ld-caption">{draft.declaredCapabilities.length} capabilities declared</span>{errors.declaredCapabilities && <span className="ld-field-e">{errors.declaredCapabilities}</span>}</fieldset>
            <Ld.Callout>Jev reads your hints when evaluating a publisher opportunity. Capability declarations remain hard eligibility rules. ContextHint historical evidence, when available, has separate provenance.</Ld.Callout>
          </>}
          {step === 2 && <>
            <Ld.Field label="Approved Sponsored text" error={errors.approvedText} hint="This exact text is shown if your campaign wins a placement."><textarea className="ld-textarea" name="approvedText" rows={5} maxLength={800} value={draft.approvedText} onChange={e => patch('approvedText', e.target.value)} aria-invalid={Boolean(errors.approvedText)} /><span className="ld-caption ad-character-count">{draft.approvedText.length}/800</span></Ld.Field>
            <div className="ad-preview-test"><Ld.Field label="Test a conversation question" hint="Saves this draft and checks eligibility and copy without calling Jev. It does not predict a win or record delivery or spend."><textarea className="ld-textarea" rows={2} value={question} onChange={e => { setQuestion(e.target.value); setPreview(null); }} placeholder="What might a customer ask an AI app?" /></Ld.Field><Ld.Button variant="secondary" disabled={previewBusy || busy || !question.trim()} onClick={() => void testPreview()}>{previewBusy ? 'Checking question…' : 'Test question'}</Ld.Button>{preview && <Ld.Callout title={preview.eligible === false ? 'Preview: not eligible' : 'Eligibility preview checked'} tone={preview.eligible === false ? 'warning' : 'brand'}>{preview.reason?.replaceAll('_', ' ') ?? 'The preview checked this question against draft eligibility rules. Actual buying judgment happens with Jev at a publisher opportunity.'}{preview.matchedHints?.length ? <p>Matched contexts: {preview.matchedHints.join(', ')}</p> : null}</Ld.Callout>}</div>
          </>}
          {step === 3 && <>
            <Ld.Callout title={native ? "Solana Devnet · Test USDC" : "Synthetic test credits"} tone="brand">{native ? "Launch opens a funded payment channel using Test USDC from the shared server-held demo sponsor. The deposit is collateral; only accepted delivery charges count as spend. Closing pays the publisher and returns the unused deposit after confirmation." : "These limits simulate USDC with 6 decimal places. No wallet or bank is funded, and no real tokens are transferred."}</Ld.Callout>
            {([['maxBidBaseUnits', 'Maximum bid per delivered card', 'The highest amount this campaign may bid for one placement.'], ['budgetCapBaseUnits', 'Total campaign spending cap', 'Accepted delivery charges cannot exceed this campaign cap.'], ['depositBaseUnits', native ? 'Channel deposit' : 'Test-credit allocation', native ? 'Test USDC locked in this campaign’s channel at launch. It must cover the spending cap; network fees and rent use Devnet SOL separately.' : 'Simulated credit available to this campaign. It must cover the spending cap.']] as const).map(([key, label, hint]) => <Ld.Field key={key} label={label} hint={hint} error={errors[key]}><div className="ad-money-input"><input className="ld-input" name={key} inputMode="decimal" value={money[key]} onChange={e => { setMoney(v => ({ ...v, [key]: e.target.value })); markDirty(); setErrors(v => ({ ...v, [key]: '' })); }} aria-invalid={Boolean(errors[key])} /><span>{unit}</span></div></Ld.Field>)}
          </>}
          {step === 4 && <>
            <p className="ld-secondary">{native ? "Your campaign becomes eligible after its channel opening is finalized on Solana Devnet. The shared demo sponsor funds the channel; this does not verify advertiser wallet ownership." : "Launching makes this campaign eligible to compete in the publisher demo. The backend applies your declarations and spending limits."}</p>
            <dl className="ad-review"><div><dt>Advertiser</dt><dd>{draft.brandName} · {draft.websiteURL}</dd></div><div><dt>Campaign</dt><dd>{draft.name}</dd></div><div><dt>Offer</dt><dd>{draft.productDescription}</dd></div><div><dt>Contexts</dt><dd>{complete().contextHints.join(' · ')}</dd></div><div><dt>Capabilities</dt><dd>{draft.declaredCapabilities.map(id => bootstrap.capabilities.find(c => c.id === id)?.label ?? id).join(', ') || 'None declared'}</dd></div><div><dt>Maximum bid</dt><dd>{money.maxBidBaseUnits} {unit}</dd></div><div><dt>Campaign cap</dt><dd>{money.budgetCapBaseUnits} {unit}</dd></div><div><dt>{native ? 'Channel deposit' : 'Allocation'}</dt><dd>{money.depositBaseUnits} {unit}</dd></div></dl>
            {native && bootstrap.payments?.ready !== true && <Ld.Callout tone="warning" title="Devnet payments unavailable">{bootstrap.payments?.reason ?? "The backend has not confirmed payment readiness. Save the draft and retry once the channel worker is ready."}</Ld.Callout>}
            <label className="ad-review-check"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} /><span>I reviewed the exact Sponsored text, my declarations and the spending limits. {native ? 'I approve this campaign and its Test USDC channel deposit for launch.' : 'I approve this campaign for launch.'}</span></label>
            <Ld.Callout>Charges follow accepted Sponsored card insertion. They do not prove human attention, clicks or conversions.</Ld.Callout>
          </>}
          {busy && native && step === 4 && <div className="ad-notice" role="status">Waiting for the backend’s saved channel-opening operation. Devnet confirmation may take up to 45 seconds.</div>}
          {notice && <div className="ad-notice" role="status">{notice}</div>}
          </div>
          <div className="ad-editor-actions"><Ld.Button variant="ghost" disabled={step === 0 || busy} onClick={() => setStep(s => s - 1)}>Back</Ld.Button><div className="ld-row"><Ld.Button variant="secondary" disabled={busy || previewBusy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save draft'}</Ld.Button><Ld.Button type="submit" disabled={busy || previewBusy || (step === 4 && (!reviewed || (native && bootstrap.payments?.ready !== true)))}>{busy ? native && step === 4 ? 'Opening channel…' : 'Saving…' : step === 4 ? native ? 'Fund channel & launch' : 'Launch campaign' : 'Continue →'}</Ld.Button></div></div>
        </Ld.Panel>
      </form>
      <aside className="ad-preview-column"><Ld.Panel title="Sponsored card preview" sub="Your approved creative, as a separate placement"><div className="ad-chat-preview"><div className="ad-chat-lines" aria-hidden="true"><span /><span /><span /></div><div className="ad-preview-label ld-caption">Shown beneath the publisher’s answer</div><Ld.SponsoredCard advertiser={draft.brandName || 'Your brand'} text={draft.approvedText || 'Your approved Sponsored text will appear here. Keep it clear, useful and specific to the offer.'} url={draft.websiteURL} /></div><div className="ad-preview-foot"><Ld.Tag tone="outline">Preview only</Ld.Tag><p className="ld-caption">Always labelled Sponsored. Previewing a card does not count as delivery.</p></div></Ld.Panel><div className="ad-editor-help"><span className="ld-label">{['A useful offer starts here', 'Meet the moment', 'Clear words earn trust', 'Your limits stay in control', 'Your next step'][step]}</span><p className="ld-secondary">{['Give your buying agent a precise offer. The campaign name stays internal; the brand and approved text appear on the card.', 'Write instructions for Jev about relevant conversations and reasons to skip. These advertiser hints are distinct from historical ContextHint evidence. Capabilities are factual eligibility declarations.', 'Write an offer that can stand on its own. The publisher’s answer stays independent of your Sponsored card.', 'Bids are spending ceilings, not charges. Only accepted delivery adds to campaign spend.', 'Open the publisher demo after launch to see your campaign compete in a real application flow.'][step]}</p></div></aside>
    </div>
  </div>;
}
