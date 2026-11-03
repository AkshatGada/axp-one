'use strict';
(() => {
  const scenes = window.AXPDemoScenes ||= {};
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Timelines use an active-time clock so the presentation's motion control also
  // pauses decisions. Each mount owns every animation frame and listener.
  function lifecycle(root) {
    const listeners = [];
    let frame = 0, alive = true;
    const on = (el, type, fn) => { el.addEventListener(type, fn); listeners.push(() => el.removeEventListener(type, fn)); };
    const run = (milestones) => {
      cancelAnimationFrame(frame);
      let elapsed = 0, previous = 0, next = 0;
      if (reduced()) { milestones.forEach(([, fn]) => fn()); return; }
      const tick = now => {
        if (!alive) return;
        if (previous && root.closest('.app')?.dataset.motion !== 'paused' && !document.hidden) elapsed += Math.min(now - previous, 80);
        previous = now;
        while (next < milestones.length && elapsed >= milestones[next][0]) milestones[next++][1]();
        if (next < milestones.length) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    return { on, run, cleanup() { alive = false; cancelAnimationFrame(frame); listeners.forEach(fn => fn()); } };
  }
  const top = (title, action = 'Replay evaluation') => `<div class="scene-title"><span>${title}</span><button class="sx-replay" type="button" data-replay>${action} <span aria-hidden="true">↻</span></button></div>`;

  scenes[2] = {
    html: `<section class="scene sc-buyers" aria-label="Buyer agent evaluation">
      ${top('Three buyers. One opportunity.')}
      <div class="sx-panel buyers-panel">
        <div class="sx-panel-top"><span>Security keys for a remote team</span><span class="sx-small">Buyer agents</span></div>
        <div class="buyers-map" data-phase="0">
          <div class="buyers-source"><span class="buyers-source-icon" aria-hidden="true">✳</span><strong>Opportunity</strong><small>Team security</small><div class="buyers-source-meter"><i></i></div></div>
          <svg class="buyers-routes" viewBox="0 0 590 284" preserveAspectRatio="none" aria-hidden="true"><path class="route-track" d="M120 142H160Q180 142 180 122V56Q180 44 198 44H242M120 142H242M120 142H160Q180 142 180 162V229Q180 240 198 240H242"/><path class="buyer-path path-one" d="M120 142H160Q180 142 180 122V56Q180 44 198 44H242" pathLength="100"/><path class="buyer-path path-two" d="M120 142H242" pathLength="100"/><path class="buyer-path path-three" d="M120 142H160Q180 142 180 162V229Q180 240 198 240H242" pathLength="100"/><circle class="buyer-packet packet-one" r="4"/><circle class="buyer-packet packet-two" r="4"/><circle class="buyer-packet packet-three" r="4"/></svg>
          <div class="buyers-list">
            <button class="buyer-card" type="button" data-buyer="0" aria-pressed="false"><span class="buyer-monogram">H</span><span class="buyer-copy"><strong>HarborKey</strong><small>Security keys · team rollout</small></span><span class="buyer-state" data-state="0">Waiting</span><span class="buyer-scan"></span></button>
            <button class="buyer-card" type="button" data-buyer="1" aria-pressed="false"><span class="buyer-monogram">K</span><span class="buyer-copy"><strong>KeyArc</strong><small>Team authentication</small></span><span class="buyer-state" data-state="1">Waiting</span><span class="buyer-scan"></span></button>
            <button class="buyer-card" type="button" data-buyer="2" aria-pressed="false"><span class="buyer-monogram">C</span><span class="buyer-copy"><strong>ColdNest</strong><small>Cloud storage</small></span><span class="buyer-state" data-state="2">Waiting</span><span class="buyer-scan"></span></button>
          </div>
        </div>
        <div class="buyers-insight" aria-live="polite"><span class="buyers-insight-mark" aria-hidden="true">↗</span><div><strong data-insight-title>Routing context to each buyer</strong><span data-insight-copy>Jev evaluates fit. Campaign rules decide eligibility.</span></div><strong class="buyers-count" data-count>0 / 3</strong></div>
      </div><div class="sx-footer"><span>Choose an agent to inspect its decision</span><span data-summary>Evaluation in progress</span></div>
    </section>`,
    mount({ root }) {
      const life = lifecycle(root), scene = root.querySelector('.sc-buyers'), map = root.querySelector('.buyers-map');
      const cards = [...root.querySelectorAll('[data-buyer]')], states = [...root.querySelectorAll('[data-state]')];
      const title = root.querySelector('[data-insight-title]'), copy = root.querySelector('[data-insight-copy]');
      let completed = 0, selected = -1;
      const explanations = [ ['HarborKey · eligible', 'Security-key intent matches its approved team-rollout campaign.'], ['KeyArc · eligible', 'Team authentication fits the campaign’s approved context.'], ['ColdNest · excluded', 'Cloud storage is outside this security-key opportunity.'] ];
      const inspect = i => { selected = i; cards.forEach((card, n) => card.setAttribute('aria-pressed', String(i === n))); title.textContent = completed > i ? explanations[i][0] : `${['HarborKey', 'KeyArc', 'ColdNest'][i]} · evaluating`; copy.textContent = completed > i ? explanations[i][1] : 'Checking relevance, approved context and available budget.'; };
      const finish = i => { completed = i + 1; cards[i].dataset.status = i === 2 ? 'excluded' : 'eligible'; states[i].textContent = i === 2 ? 'Excluded' : 'Eligible ✓'; root.querySelector('[data-count]').textContent = `${completed} / 3`; if (selected >= 0) inspect(selected); };
      const replay = () => {
        completed = 0; selected = -1; scene.classList.remove('is-running'); void scene.offsetWidth; scene.classList.add('is-running'); map.dataset.phase = '0';
        cards.forEach((card, i) => { delete card.dataset.status; card.setAttribute('aria-pressed', 'false'); states[i].textContent = 'Waiting'; });
        title.textContent = 'Routing context to each buyer'; copy.textContent = 'Jev evaluates fit. Campaign rules decide eligibility.'; root.querySelector('[data-count]').textContent = '0 / 3'; root.querySelector('[data-summary]').textContent = 'Evaluation in progress';
        life.run([[450, () => { map.dataset.phase = '1'; states.forEach(s => s.textContent = 'Evaluating'); }], [1900, () => finish(0)], [2650, () => finish(1)], [3400, () => finish(2)], [3700, () => { map.dataset.phase = '2'; root.querySelector('[data-summary]').textContent = '2 eligible buyers → auction'; if (selected < 0) { title.textContent = 'Two buyers move forward'; copy.textContent = 'ColdNest is excluded before bidding.'; } }]]);
      };
      cards.forEach((card, i) => life.on(card, 'click', () => inspect(i))); life.on(root.querySelector('[data-replay]'), 'click', replay); replay(); return () => life.cleanup();
    }
  };

  scenes[3] = {
    html: `<section class="scene sc-auction" aria-label="First-price auction">
      ${top('Deterministic first-price auction', 'Run auction again')}
      <div class="sx-panel"><div class="sx-panel-top"><span>Eligible bids</span><span class="auction-phase" data-phase-label>Collecting bids</span></div>
        <div class="auction-chart">
          <div class="auction-row" data-row="0"><div class="auction-row-head"><strong>HarborKey</strong><span data-bid="0">—</span></div><div class="auction-track"><div class="auction-bar harbor-bar"><span>H</span></div><i class="auction-marker" aria-hidden="true">✓</i></div><div class="auction-row-note" data-row-note="0">Campaign limit checked</div></div>
          <div class="auction-row" data-row="1"><div class="auction-row-head"><strong>KeyArc</strong><span data-bid="1">—</span></div><div class="auction-track"><div class="auction-bar keyarc-bar"><span>K</span></div></div><div class="auction-row-note" data-row-note="1">Campaign limit checked</div></div>
          <div class="auction-excluded"><span>ColdNest</span><span>Excluded before bidding</span><strong>—</strong></div>
        </div>
        <div class="auction-rule-line"><span>Highest valid bid wins</span><span>Winner pays its own bid</span></div>
      </div>
      <div class="auction-reservation" aria-live="polite"><span class="reservation-icon" aria-hidden="true">⌁</span><div><strong data-result>Awaiting selection</strong><small data-result-note>No accepted charge</small></div><div class="reservation-amount"><span>Reserved</span><strong data-reserved>$0.00</strong></div></div>
    </section>`,
    mount({ root }) {
      const life = lifecycle(root), scene = root.querySelector('.sc-auction');
      const set = (selector, text) => { root.querySelector(selector).textContent = text; };
      const replay = () => {
        scene.classList.remove('is-running', 'is-selected'); void scene.offsetWidth; scene.classList.add('is-running');
        set('[data-phase-label]', 'Collecting bids'); set('[data-bid="0"]', '—'); set('[data-bid="1"]', '—'); set('[data-row-note="0"]', 'Campaign limit checked'); set('[data-row-note="1"]', 'Campaign limit checked'); set('[data-result]', 'Awaiting selection'); set('[data-result-note]', 'No accepted charge'); set('[data-reserved]', '$0.00');
        life.run([[650, () => { set('[data-bid="0"]', '$0.60'); set('[data-bid="1"]', '$0.45'); set('[data-phase-label]', 'Comparing valid bids'); }], [2300, () => { scene.classList.add('is-selected'); set('[data-phase-label]', 'HarborKey wins'); set('[data-row-note="0"]', 'Winning bid · $0.60'); set('[data-row-note="1"]', 'Eligible · lower bid'); }], [2900, () => { set('[data-result]', 'Placement reserved'); set('[data-result-note]', 'Accepted only after insertion acknowledgement'); set('[data-reserved]', '$0.60'); }]]);
      };
      life.on(root.querySelector('[data-replay]'), 'click', replay); replay(); return () => life.cleanup();
    }
  };

  scenes[4] = {
    html: `<section class="scene sc-delivery" aria-label="Sponsored insertion and acknowledgement">
      ${top('Publisher chat', 'Reset delivery')}
      <div class="sx-panel delivery-workspace"><div class="sx-panel-top"><span>Team workspace</span><span class="delivery-stage" data-stage>Ready to insert</span></div>
        <div class="delivery-chat"><div class="delivery-question">Which security key works for a small remote team?</div><div class="delivery-answer"><strong><span aria-hidden="true">✳</span> Independent answer</strong><p>Choose FIDO2 / WebAuthn support, compatible connections and a tested recovery plan. Issue a backup key before your team rollout.</p></div>
        <div class="delivery-slot"><div class="delivery-empty"><span aria-hidden="true">＋</span><strong>Separate Sponsored slot</strong><small>Approved creative is ready</small></div><article class="delivery-creative" hidden><div class="delivery-disclosure">Sponsored <span>· HarborKey</span></div><h3>Security keys for your team.</h3><div class="delivery-creative-bottom"><p>USB-C + NFC. Built for team rollouts.</p><span>Explore HarborKey ↗</span></div></article></div></div>
        <div class="delivery-actions"><button type="button" class="sx-primary" data-insert>Insert Sponsored card <span aria-hidden="true">↓</span></button><button type="button" class="sx-primary" data-ack hidden>Acknowledge insertion <span aria-hidden="true">✓</span></button><span data-action-note>Reservation · $0.60</span></div>
      </div>
      <div class="delivery-receipt" aria-live="polite"><span class="delivery-receipt-icon" aria-hidden="true">▤</span><div><strong data-receipt-title>Receipt pending</strong><small data-receipt-note>Insert, then acknowledge</small></div><div class="delivery-obligation"><span>Obligation</span><strong data-obligation>$0.00</strong></div></div>
    </section>`,
    mount({ root }) {
      const life = lifecycle(root), scene = root.querySelector('.sc-delivery'), insert = root.querySelector('[data-insert]'), ack = root.querySelector('[data-ack]');
      let inserted = false, accepted = false;
      const set = (selector, text) => { root.querySelector(selector).textContent = text; };
      const insertCard = (focus = false) => {
        if (inserted) return;
        inserted = true; scene.classList.add('is-inserted'); root.querySelector('.delivery-creative').hidden = false; root.querySelector('.delivery-empty').hidden = true;
        insert.hidden = true; ack.hidden = false; set('[data-stage]', 'Sponsored card inserted'); set('[data-action-note]', 'Awaiting acknowledgement'); set('[data-receipt-note]', 'Sponsored disclosure is visible'); if (focus) ack.focus({ preventScroll: true });
      };
      const acknowledge = () => {
        if (!inserted) return;
        if (accepted) { set('[data-receipt-title]', 'Same receipt returned'); set('[data-receipt-note]', 'No duplicate obligation · still $0.60'); scene.classList.remove('is-repeated'); void scene.offsetWidth; scene.classList.add('is-repeated'); return; }
        accepted = true; scene.classList.add('is-accepted'); set('[data-stage]', 'Insertion accepted'); set('[data-receipt-title]', 'Receipt accepted · 001'); set('[data-receipt-note]', 'One insertion → one obligation'); set('[data-obligation]', '$0.60'); set('[data-action-note]', 'Reservation converted'); ack.innerHTML = 'Acknowledge again <span aria-hidden="true">↻</span>';
      };
      life.on(insert, 'click', () => insertCard(true));
      life.on(ack, 'click', acknowledge);
      const play = () => life.run([[800, () => insertCard()], [2300, () => { if (!accepted) acknowledge(); }]]);
      scenes[4].play = play;
      life.on(root.querySelector('[data-replay]'), 'click', () => {
        life.run([]);
        inserted = false; accepted = false; scene.classList.remove('is-inserted', 'is-accepted', 'is-repeated'); root.querySelector('.delivery-creative').hidden = true; root.querySelector('.delivery-empty').hidden = false; insert.hidden = false; ack.hidden = true; ack.innerHTML = 'Acknowledge insertion <span aria-hidden="true">✓</span>'; set('[data-stage]', 'Ready to insert'); set('[data-action-note]', 'Reservation · $0.60'); set('[data-receipt-title]', 'Receipt pending'); set('[data-receipt-note]', 'Insert, then acknowledge'); set('[data-obligation]', '$0.00');
      });
      return () => { life.cleanup(); if (scenes[4].play === play) delete scenes[4].play; };
    }
  };
})();
