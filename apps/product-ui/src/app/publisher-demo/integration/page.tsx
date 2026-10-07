import type {Metadata} from 'next';
import Link from 'next/link';
import {Ld} from '@axp/design-system/ledger';
import '@/components/publisher-demo/publisher-demo.css';
import './integration.css';

export const metadata: Metadata = {
  title: {absolute: 'Publisher SDK · axp.one'},
  description: 'Request, render and acknowledge a Sponsored card in your own AI app. Keep your answer model independent and inspect the working example.',
};

const requestPreview = `const adTask = axp.requestAd({
  question, sessionId, turnId,
});`;
const renderPreview = `const node = createSponsoredCard({
  document, award: ad.award,
});
sponsorSlot.append(node);`;
const acknowledgePreview = `await acknowledge({
  node, award: ad.award,
  deliveryToken: ad.deliveryToken,
});`;

const server = `import { AXPPublisher } from './packages/publisher-sdk/index.mjs';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_PUBLISHER_API_KEY, // server only
  baseURL: process.env.AXP_EXCHANGE_URL || 'https://axp.one/api/product',
  timeoutMs: 15000,
  receiptTimeoutMs: 45000,
});

// Start both before awaiting either. The answer receives no sponsor material.
const adTask = axp.requestAd({ question, sessionId, turnId,
  placementId: 'chat-sponsored-card' });
const answerTask = yourExistingLLM({ question });

sendAnswer(await answerTask); // stream independently if your app streams
const ad = await adTask;
if (ad.status === 'awarded') sendSponsoredAward(ad);
// no_fill or error: keep the answer and leave the slot empty`;

const browser = `import { createSponsoredCard, createRenderAcknowledger }
  from './packages/publisher-sdk/browser.mjs';

// Run only for an awarded response received from your server.
const acknowledge = createRenderAcknowledger({
  post: async (_path, observation, deliveryToken) => {
    const response = await fetch('/api/axp/render', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-app-csrf': yourCSRF },
      body: JSON.stringify({ awardId: ad.award.id,
        observation, deliveryToken }),
    });
    if (!response.ok) throw new Error('delivery_unconfirmed');
    return response.json();
  },
});

const node = createSponsoredCard({ document, award: ad.award });
sponsorSlot.append(node);
const receipt = await acknowledge({ node, award: ad.award,
  deliveryToken: ad.deliveryToken });`;

const receipt = `// Your /api/axp/render server handler, after app authentication + CSRF:
const receipt = await axp.acknowledgeRender({
  awardId: body.awardId,
  deliveryToken: body.deliveryToken,
  observation: body.observation,
});
// receipt.status === 'accepted': inspect charge.id and receiptHash.
// Reconcile an uncertain result with this same award and delivery token.`;

const steps = [
  {title: 'Request', location: 'Your server', description: 'Ask the exchange for an ad alongside your own answer model.', code: requestPreview, outcome: 'Award or no fill'},
  {title: 'Render', location: 'Your app', description: 'For an award, insert the exact approved card with Sponsored disclosure.', code: renderPreview, outcome: 'Separate Sponsored card'},
  {title: 'Acknowledge', location: 'App → your server', description: 'Check the connected card, then forward its observation for a receipt.', code: acknowledgePreview, outcome: 'One accepted charge'},
];

export default function PublisherIntegrationPage() {
  return <div className="ld pub-demo">
    <header className="pub-header">
      <Ld.Wordmark href="/" />
      <nav aria-label="Product">
        <Link href="/advertiser-dashboard/">Advertiser dashboard</Link>
        <Link href="/publisher-demo/">Example chat →</Link>
      </nav>
    </header>
    <main className="sdk-guide" id="main">
      <Ld.PageBar
        title="Connect your AI app"
        sub="One Sponsored card. Three integration steps. Your own answer model."
        meta={<Ld.Tag tone="brand">Publisher SDK</Ld.Tag>}
        actions={<Ld.Button href="/publisher-demo/" Link={Link} size="lg">Open example chat →</Ld.Button>}
      />

      <section className="sdk-overview" aria-label="Publisher integration lifecycle">
        <ol className="sdk-steps">
          {steps.map((step, index) => <li key={step.title} className="sdk-step">
            <div className="sdk-step-head">
              <span className="sdk-step-number">0{index + 1}</span>
              <span className="ld-caption">{step.location}</span>
            </div>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
            <pre className="sdk-code sdk-code-preview"><code>{step.code}</code></pre>
            <span className="sdk-step-outcome">{step.outcome}<span aria-hidden="true">{index < 2 ? '→' : '✓'}</span></span>
          </li>)}
        </ol>
        <div className="sdk-answer-lane">
          <span className="sdk-answer-mark" aria-hidden="true">↗</span>
          <div><strong>Your answer stays independent.</strong><p>Run your LLM in parallel and display its answer when ready. No fill or an ad error leaves the answer available.</p></div>
        </div>
      </section>

      <div className="sdk-example">
        <div><h2>See the integration in a working app.</h2><p>The example chat uses DeepSeek for its independent answer and Jev for buying fit. Open <strong>View internals</strong> to follow the decision, delivery and payment.</p></div>
        <Ld.Button href="/publisher-demo/" Link={Link} variant="secondary">Try the chat →</Ld.Button>
      </div>

      <section className="sdk-reference" aria-labelledby="sdk-reference-title">
        <div className="sdk-reference-heading">
          <div><h2 id="sdk-reference-title">Integration details</h2><p>Server setup, complete examples and delivery handling.</p></div>
          <a className="ld-link" href="https://github.com/Gaganub/axp-one/tree/main/packages/publisher-sdk" target="_blank" rel="noopener noreferrer">View SDK source ↗</a>
        </div>

        <details className="sdk-details">
          <summary><span>01</span> Connect to the hosted exchange</summary>
          <div className="sdk-detail-body">
            <p>Read <a href="https://axp.one/api/product/publisher/config">publisher configuration</a> for the placement, capabilities and provider readiness. Have the workspace operator provision a publisher key for this exchange, then store it in your server environment. Public configuration does not issue keys.</p>
            <pre className="sdk-code"><code>{`AXP_EXCHANGE_URL=https://axp.one/api/product
AXP_PUBLISHER_API_KEY=<operator-provisioned server-only key>`}</code></pre>
            <p>Copy the SDK source into your project or use a local package dependency. Node 22.18+ and built-in fetch are sufficient. The server and browser modules have no runtime dependencies; this release is repository source, not a published npm package.</p>
            <p>The hosted shared demo uses Solana Devnet test USDC. Your existing answer model stays independent; DeepSeek powers only the example chat.</p>
          </div>
        </details>

        <details className="sdk-details">
          <summary><span>02</span> Request alongside your answer</summary>
          <div className="sdk-detail-body">
            <p>Use a random session ID for each conversation and a stable turn ID for each submission. Send one sanitized question, at most 1,200 characters, with optional required capabilities or category exclusions. Session and turn IDs use letters, digits, underscores or hyphens, up to 120 characters. Keep private data and raw history out of the ad request.</p>
            <pre className="sdk-code"><code>{server}</code></pre>
            <p><code>yourExistingLLM</code>, <code>sendAnswer</code> and <code>sendSponsoredAward</code> are your app’s functions. Your answer path receives no advertiser creative, hints or buying evidence. Ad errors return <code>{`{ status: 'error', error: { code } }`}</code>; no fill returns <code>{`{ status: 'no_fill' }`}</code> with its opportunity and trace.</p>
            <p>The ad deadline defaults to 15 seconds; delivery acknowledgement has a separate 45-second deadline. Configure both for your app. A timeout does not prove the server did no work and never triggers an automatic purchase retry.</p>
          </div>
        </details>

        <details className="sdk-details">
          <summary><span>03</span> Render and observe the approved card</summary>
          <div className="sdk-detail-body">
            <p>Send only an awarded response and its scoped delivery token to the frontend. Keep the original creative object and hash intact. The helper renders plain text, an HTTPS destination and a literal <strong>Sponsored</strong> label in a separate native card.</p>
            <pre className="sdk-code"><code>{browser}</code></pre>
            <p>Supply your app’s connected <code>sponsorSlot</code> and CSRF token. Your own <code>/api/axp/render</code> backend authenticates the browser request and forwards the observation using its server-only publisher key. That key never enters the browser or your LLM’s prompt.</p>
            <p>The acknowledger checks the card’s award ID, exact text, original destination, visible disclosure and connected DOM before posting. Add your native styles through <code>className</code>. The optional React source adapter exports <code>SponsoredCard</code> from <code>packages/publisher-sdk/react.tsx</code>.</p>
          </div>
        </details>

        <details className="sdk-details">
          <summary><span>04</span> Forward the observation and inspect the receipt</summary>
          <div className="sdk-detail-body">
            <pre className="sdk-code"><code>{receipt}</code></pre>
            <p>An award reserves budget. An accepted receipt creates one charge. The browser cannot choose an amount, recipient or signing key. Receipt signatures authenticate insertion and disclosure asserted by the app; they do not prove human attention or conversion.</p>
            <p>The server reports financial mode: synthetic uses local test credits, while Devnet uses test USDC. Accepted spend and a cumulative off-chain voucher are separate from a finalized payout, channel close or refund. The example chat’s Payment stage shows those states and their recorded network evidence separately.</p>
          </div>
        </details>

        <details className="sdk-details">
          <summary><span>05</span> Handle no fill, failure and retries</summary>
          <div className="sdk-detail-body">
            <p>For no fill or request errors, leave the sponsored slot empty and keep the independent answer. If an awarded card cannot render, release its reservation explicitly:</p>
            <pre className="sdk-code"><code>{`await axp.failRender({
  awardId: ad.award.id,
  deliveryToken: ad.deliveryToken,
  reason: 'render_failed',
});`}</code></pre>
            <p>Otherwise the reservation expires. An accepted charge cannot be erased by failing its award. There are no automatic ad purchase retries. An explicit request retry must preserve the same question, placement, restrictions, session and turn IDs.</p>
            <p>Reconcile an uncertain receipt with its original award, observation and delivery token. An accepted receipt replay returns the existing charge; it does not buy another placement. The browser acknowledger deduplicates concurrent and successful posts, and permits explicit retry after a failed post.</p>
          </div>
        </details>

        <details className="sdk-details">
          <summary><span>06</span> Run the developer example or a local exchange</summary>
          <div className="sdk-detail-body">
            <h3>Local example connected to axp.one</h3>
            <p>With the operator-provisioned hosted publisher key in your server environment, run this from the repository root:</p>
            <pre className="sdk-code"><code>{`AXP_EXCHANGE_URL=https://axp.one/api/product \\
  node packages/publisher-sdk/examples/server.mjs
# Open http://127.0.0.1:3433.
# The ad and example-answer requests use the hosted exchange.`}</code></pre>
            <p>Startup makes no provider, payment or ad requests. Sending a question consumes the shared demo’s provider allowance.</p>
            <h3>Develop against a local exchange</h3>
            <pre className="sdk-code"><code>{`npm run demo:product
# Create, approve and launch a campaign at http://127.0.0.1:3430.

AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product \\
  node packages/publisher-sdk/examples/server.mjs`}</code></pre>
            <p>The launcher stores its generated server key in ignored <code>local-state/product/publisher-api-key</code>. The example reads that workspace key on the server. If selecting a different local workspace, use the same <code>AXP_PRODUCT_STATE_DIR</code> in both configurations, or supply its key through <code>AXP_PUBLISHER_API_KEY</code>.</p>
            <p>Local synthetic credits are separate from hosted Devnet channels. The judge-facing chat requires live DeepSeek readiness and has no fabricated answer fallback. Jev readiness and financial mode are reported independently.</p>
          </div>
        </details>
      </section>
      <p className="sdk-reference-note">Integration research: Gravity’s official <a href="https://docs.trygravity.ai/ai-platforms/quickstart" target="_blank" rel="noopener noreferrer">server request and render quickstart</a> informed this lifecycle. AXP uses its own exchange and receipt contracts.</p>
    </main>
  </div>;
}
