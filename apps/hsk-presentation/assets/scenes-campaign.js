'use strict';
(() => {
  const scenes = window.AXPDemoScenes ||= {};
  scenes[0] = {
    html: `<section class="scene sc-campaign" aria-label="Campaign approval example">
      <div class="scene-title"><span>Advertiser dashboard</span><span class="sc-campaign-phase">01 / Review</span></div>
      <div class="sc-campaign-card">
        <header class="sc-campaign-head"><span class="sc-campaign-brand">H</span><div><strong>HarborKey</strong><small>Remote-team security</small></div><span class="sc-campaign-status">Ready for review</span></header>
        <div class="sc-campaign-creative"><span class="sc-campaign-kicker">Campaign message</span><p>A security key for<br>every teammate.</p><div class="sc-campaign-key" aria-hidden="true"><span></span><i></i><b></b></div></div>
        <div class="sc-campaign-context"><span>Eligible context</span><strong>Security keys · Small teams · Rollout planning</strong></div>
        <div class="sc-campaign-limits"><div style="--n:0"><small>Campaign limit</small><strong>$3.00</strong><span>Spending ceiling</span><i aria-hidden="true"></i></div><div style="--n:1"><small>Maximum bid</small><strong>$0.60</strong><span>Per opportunity</span><i aria-hidden="true"></i></div><div style="--n:2"><small>Payment model</small><strong>Direct</strong><span>USD · HSK Chain</span><i aria-hidden="true"></i></div></div>
        <div class="sc-campaign-footer"><span class="sc-campaign-hint" role="status">Your limits govern every bid.</span><button class="sc-campaign-approve" type="button">Approve campaign <span aria-hidden="true">→</span></button></div>
      </div>
      <div class="sc-campaign-bound"><div class="sc-campaign-seal" aria-hidden="true"><span>✓</span></div><div><strong>Accepted campaign version</strong><small>Copy, context and limits stay together.</small></div><button class="sc-campaign-replay" type="button">Replay ↻</button></div>
    </section>`,
    mount({root}) {
      const scene = root.querySelector('.sc-campaign');
      const approve = scene.querySelector('.sc-campaign-approve');
      const replay = scene.querySelector('.sc-campaign-replay');
      const status = scene.querySelector('.sc-campaign-status');
      const phase = scene.querySelector('.sc-campaign-phase');
      const hint = scene.querySelector('.sc-campaign-hint');
      function accept() {
        scene.classList.add('is-approved');
        status.textContent = 'Approved';
        phase.textContent = '02 / Accepted';
        hint.textContent = 'Buying agents stay within these limits.';
        approve.innerHTML = 'Campaign approved <span aria-hidden="true">✓</span>';
        approve.setAttribute('aria-disabled', 'true');
      }
      function reset() {
        scene.classList.remove('is-approved');
        status.textContent = 'Ready for review';
        phase.textContent = '01 / Review';
        hint.textContent = 'Your limits govern every bid.';
        approve.innerHTML = 'Approve campaign <span aria-hidden="true">→</span>';
        approve.removeAttribute('aria-disabled');
        approve.focus({preventScroll:true});
      }
      function onApprove() { if (!scene.classList.contains('is-approved')) accept(); }
      scenes[0].play = accept;
      approve.addEventListener('click', onApprove);
      replay.addEventListener('click', reset);
      return () => { approve.removeEventListener('click', onApprove); replay.removeEventListener('click', reset); if(scenes[0].play===accept)delete scenes[0].play; };
    }
  };
  scenes[1] = {
    html: `<section class="scene sc-chat" aria-label="Independent answer and separate advertising request">
      <div class="scene-title"><span>Publisher chat</span><button class="sc-chat-replay" type="button">Replay example ↻</button></div>
      <div class="sc-chat-workspace"><header><span class="sc-chat-avatar">↗</span><strong>Team workspace</strong><span class="sc-chat-live">Independent answer</span></header>
        <div class="sc-chat-question">Which security key works for a small remote team?</div>
        <div class="sc-chat-answer"><div class="sc-chat-author"><span>A</span> Independent answer</div><p><span style="--line:0">Choose FIDO2 / WebAuthn support,</span><span style="--line:1">compatible connections and a tested recovery plan.</span><span style="--line:2">Issue a backup key before your team rollout.</span></p><div class="sc-chat-answer-done">Answer stays with the app <span aria-hidden="true">✓</span></div></div>
        <div class="sc-chat-slot"><span>+</span><div><strong>Separate Sponsored placement</strong><small>Reserved below the answer</small></div><i aria-hidden="true"></i></div>
      </div>
      <div class="sc-chat-route"><div class="sc-chat-endpoint"><span class="sc-chat-endpoint-icon">↗</span><div><strong>Publisher SDK</strong><small>Context request</small></div></div><div class="sc-chat-wire"><span class="sc-chat-wire-label">Separate ad opportunity</span><i></i><span class="sc-chat-packet" aria-hidden="true">↗</span></div><div class="sc-chat-endpoint sc-chat-buyers"><span class="sc-chat-endpoint-icon">H<span>K</span></span><div><strong>Buying agents</strong><small>Evaluate fit next</small></div></div></div>
      <div class="sc-chat-caption" role="status">The answer and ad request follow separate paths.</div>
    </section>`,
    mount({root}) {
      const scene = root.querySelector('.sc-chat');
      const replay = scene.querySelector('.sc-chat-replay');
      function play() {
        scene.classList.remove('is-playing');
        void scene.offsetWidth;
        scene.classList.add('is-playing');
      }
      replay.addEventListener('click', play);
      play();
      return () => replay.removeEventListener('click', play);
    }
  };
})();
