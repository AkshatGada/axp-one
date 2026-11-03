'use strict';
(() => {
  const scenes = window.AXPDemoScenes ||= {};
  let paymentPlay, chainPlay;
  const icon = (name) => ({wallet:'<rect x="4" y="6" width="24" height="20" rx="4"/><path d="M4 11h24M21 16h7v6h-7a3 3 0 0 1 0-6Z"/>',hsp:'<path d="M7 6v20M25 6v20M7 16h18"/><path d="m12 11 4 5-4 5m8-10 4 5-4 5"/>',gateway:'<path d="M6 26V6h20v20M12 26V12h8v14M3 26h26"/>',chain:'<path d="m16 3 12 7v13l-12 7-12-7V10Zm0 13v14M4 10l12 6 12-6"/>',publisher:'<rect x="4" y="5" width="24" height="22" rx="3"/><path d="M4 11h24M10 17h12M10 22h8"/>'}[name]);
  const glyph = (name) => `<svg viewBox="0 0 32 32" aria-hidden="true">${icon(name)}</svg>`;
  function lifecycle(root) {
    let disposed = false, frame = 0;
    const listeners = [];
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    return {
      on(el,event,fn) { el.addEventListener(event,fn);listeners.push(()=>el.removeEventListener(event,fn)); },
      run(duration, update, done) {
        cancelAnimationFrame(frame);
        if (reduced) { update(1);done();return; }
        let elapsed = 0, previous;
        function tick(now) {
          if(disposed) return;
          if(previous !== undefined && root.closest('.app')?.dataset.motion !== 'paused' && !document.hidden) elapsed += Math.min(now-previous,80);
          previous = now;
          update(Math.min(elapsed/duration,1));
          if(elapsed >= duration) done(); else frame=requestAnimationFrame(tick);
        }
        frame=requestAnimationFrame(tick);
      },
      stop() {cancelAnimationFrame(frame);},
      cleanup() {disposed=true;cancelAnimationFrame(frame);listeners.forEach(fn=>fn());}
    };
  }
  scenes[5] = {
    play() { paymentPlay?.(); },
    html: `<section class="scene sc-payment" data-phase="review" aria-label="HSP payment example">
      <div class="scene-title"><span>HSP payment service</span><span>HSK Chain</span></div>
      <div class="sp-wallet">
        <div class="sp-wallet-top"><span class="sp-wallet-heading">${glyph('wallet')} Wallet review</span><span class="sp-demo-tag">EXAMPLE FLOW</span></div>
        <div class="sp-quote"><div><span>Publisher principal</span><strong>$0.60</strong></div><div><span>Fee · example</span><strong>$0.02</strong></div><div class="sp-total"><span>Total authorization</span><strong>$0.62</strong></div></div>
        <div class="sp-approvals"><span data-approval="0"><i>1</i> Review quote</span><span data-approval="1"><i>2</i> Authorize</span><span data-approval="2"><i>3</i> Submit</span></div>
      </div>
      <div class="sp-map">
        <div class="sp-map-label"><span>Agent-to-agent payment</span><span class="sp-route-status">Awaiting review</span></div>
        <div class="sp-route">
          <div class="sp-wire"><i></i></div>
          <div class="sp-packet" aria-hidden="true"><span>↗</span><b>Authorization</b></div>
          <div class="sp-token" aria-hidden="true">$<i></i><i></i></div>
          ${[['wallet','Payer agent','Wallet authority'],['hsp','HSP','Payment service'],['gateway','Gateway','Submission'],['chain','HSK Chain','Token transfer'],['publisher','Publisher','Principal']].map(([i,a,b],n)=>`<div class="sp-node" data-node="${n}"><span class="sp-node-icon">${glyph(i)}<b>✓</b></span><strong>${a}</strong><small>${b}</small></div>`).join('')}
        </div>
        <div class="sp-outcome"><span>Publisher receives</span><strong>$0.60</strong><span class="sp-outcome-note">Fee stays separate</span></div>
      </div>
      <div class="sp-control"><div aria-live="polite"><strong class="sp-status">Start with the exact quote.</strong><span class="sp-caption">Example controls · no wallet connection</span></div><button class="sp-action" type="button">Review quote <span>→</span></button><button class="sp-replay" type="button" aria-label="Replay payment example" title="Replay">↻</button></div>
    </section>`,
    mount({root, autoplay=false}) {
      const el=root.querySelector('.sc-payment'), life=lifecycle(el);
      const action=el.querySelector('.sp-action'), status=el.querySelector('.sp-status'), caption=el.querySelector('.sp-caption');
      const routeStatus=el.querySelector('.sp-route-status'), nodes=[...el.querySelectorAll('.sp-node')], approvals=[...el.querySelectorAll('[data-approval]')];
      let state=0, auto=false;
      function display(message,sub,label,disabled=false) {status.textContent=message;caption.textContent=sub;action.innerHTML=label;action.disabled=disabled;}
      function progress(p) {el.style.setProperty('--sp-progress',p);}
      function reset(){life.stop();state=0;auto=false;el.dataset.phase='review';progress(0);nodes.forEach(n=>n.classList.remove('is-active','is-done'));approvals.forEach(n=>n.classList.remove('is-done'));nodes[0].classList.add('is-active');routeStatus.textContent='Awaiting review';display('Start with the exact quote.','Example controls · no wallet connection','Review quote <span>→</span>');}
      life.on(action,'click',()=>{
        if(state===0){state=1;el.dataset.phase='reviewed';approvals[0].classList.add('is-done');routeStatus.textContent='Quote reviewed';display('The wallet controls authorization.','Principal + example fee = $0.62','Authorize example <span>→</span>');}
        else if(state===1){state=2;el.dataset.phase='authorizing';display('Authorization travels through HSP.','Signature step · illustrated only','Authorizing…',true);routeStatus.textContent='Wallet → HSP → gateway';approvals[1].classList.add('is-done');
          life.run(2400,p=>{progress(p*.5);nodes.forEach((n,i)=>n.classList.toggle('is-active',i===Math.min(2,Math.floor(p*3))));},()=>{el.dataset.phase='authorized';nodes[0].classList.add('is-done');nodes[1].classList.add('is-done');nodes[2].classList.add('is-active');state=3;display('Authorized. Submission is separate.','The gateway is ready for approval.','Submit example <span>→</span>');routeStatus.textContent='Ready for submission';if(auto)action.click();});
        } else if(state===3){state=4;el.dataset.phase='submitting';approvals[2].classList.add('is-done');display('The gateway submits the token transfer.','HSK Chain → publisher','Transferring…',true);routeStatus.textContent='HSK Chain token transfer';
          life.run(3600,p=>{progress(.5+p*.5);nodes[2].classList.toggle('is-active',p<.3);nodes[3].classList.toggle('is-active',p>=.3&&p<.83);nodes[4].classList.toggle('is-active',p>=.83);if(p>.3)nodes[2].classList.add('is-done');if(p>.83)nodes[3].classList.add('is-done');},()=>{state=5;el.dataset.phase='complete';nodes[4].classList.add('is-done');routeStatus.textContent='Illustrated flow complete';display('One payment. Principal to the publisher.','Example outcome · no transfer executed','Replay <span>↻</span>');});
        } else if(state===5) reset();
      });
      life.on(el.querySelector('.sp-replay'),'click',reset);reset();paymentPlay=()=>{if(state===5)reset();auto=true;if(state===0)action.click();if(state===1||state===3)action.click();};if(autoplay)paymentPlay();return ()=>{paymentPlay=null;life.cleanup();};
    }
  };
  scenes[6] = {
    play() { chainPlay?.(); },
    html: `<section class="scene sc-chain" data-phase="sources" aria-label="HSK Chain evidence example">
      <div class="scene-title"><span>Evidence, linked on-chain</span><span>HSK Chain</span></div>
      <div class="sc-sources"><div class="sc-source"><span class="sc-doc-icon">≡</span><div><small>DELIVERY</small><strong>Insertion receipt</strong><span>Sponsored · $0.60</span></div><b>✓</b></div><span class="sc-plus">+</span><div class="sc-source"><span class="sc-doc-icon">↗</span><div><small>PAYMENT</small><strong>Payment reference</strong><span>Source · publisher · amount</span></div><b>✓</b></div></div>
      <div class="sc-converge" aria-hidden="true"><svg viewBox="0 0 600 47" preserveAspectRatio="none"><path d="M142 0v16q0 7 10 7h138q10 0 10 10v14M458 0v16q0 7-10 7H310q-10 0-10 10"/></svg><i class="sc-source-pulse sc-source-left"></i><i class="sc-source-pulse sc-source-right"></i></div>
      <div class="sc-commitment"><span class="sc-commit-icon">⊞</span><div><strong>Evidence commitment</strong><small>Receipt + payment + amount</small></div><span class="sc-seal">BOUND TOGETHER</span></div>
      <div class="sc-anchor-route"><span class="sc-anchor-line"></span><i class="sc-anchor-packet" aria-hidden="true">⊞</i><span class="sc-anchor-label">Verify source → commit evidence</span></div>
      <div class="sc-registry"><div class="sc-registry-head"><span class="sc-hsk-mark">${glyph('chain')}<strong>HSK Chain</strong></span><span>AXPDeliveryRegistry</span></div>
        <div class="sc-blocks"><div class="sc-block sc-previous"><span class="sc-block-top">Linked block</span><i></i><i></i><i></i></div><span class="sc-link" aria-hidden="true">⛓</span><div class="sc-block sc-previous"><span class="sc-block-top">Linked block</span><i></i><i></i><i></i></div><span class="sc-link sc-new-link" aria-hidden="true">⛓</span><div class="sc-block sc-new-block"><span class="sc-block-top">Illustrative record <b>↳</b></span><div class="sc-record-fields"><span>Receipt <b>Linked</b></span><span>Payment <b>Linked</b></span><span>Principal <b>$0.60</b></span></div><span class="sc-record-placeholder">Evidence lands here</span></div></div>
        <div class="sc-registry-foot"><span>Immutable registry design</span><span class="sc-lock">One record · one payment reference</span></div>
      </div>
      <div class="sc-controls"><div aria-live="polite"><strong class="sc-status">Connect delivery to payment.</strong><span class="sc-caption">Example evidence · no network transaction</span></div><button class="sc-action" type="button">Verify example <span>→</span></button><button class="sc-replay" type="button" aria-label="Replay evidence example" title="Replay">↻</button></div>
    </section>`,
    mount({root, autoplay=false}) {
      const el=root.querySelector('.sc-chain'),life=lifecycle(el),action=el.querySelector('.sc-action');
      let state=0, auto=false;
      const status=el.querySelector('.sc-status'),caption=el.querySelector('.sc-caption');
      function text(a,b,c,disabled=false){status.textContent=a;caption.textContent=b;action.innerHTML=c;action.disabled=disabled;}
      function reset(){life.stop();state=0;el.dataset.phase='sources';el.style.setProperty('--sc-progress',0);text('Connect delivery to payment.','Example evidence · no network transaction','Verify example <span>→</span>');}
      life.on(action,'click',()=>{
        if(state===0){state=1;el.dataset.phase='verified';text('Sources checked. Ready to bind.','Receipt and payment stay distinct.','Anchor example <span>→</span>');}
        else if(state===1){state=2;el.dataset.phase='binding';text('Bind the evidence into one commitment.','Only the authorized registrar writes the record.','Building record…',true);
          life.run(5200,p=>{el.style.setProperty('--sc-progress',p);if(p>.3&&p<.63){el.dataset.phase='anchoring';status.textContent='Commitment moves to HSK Chain.';}else if(p>=.63){el.dataset.phase='recording';status.textContent='Link the evidence in the immutable registry.';}},()=>{state=3;el.dataset.phase='complete';text('Delivery and payment, traceable together.','Illustrative record · no live transaction proof','Replay <span>↻</span>');});
        }else if(state===3)reset();
      });
      life.on(el.querySelector('.sc-replay'),'click',reset);reset();chainPlay=()=>{if(state===3)reset();if(state===0)action.click();if(state===1)action.click();};if(autoplay)chainPlay();return ()=>{chainPlay=null;life.cleanup();};
    }
  };
})();
