import type {Metadata} from 'next';
import Link from 'next/link';
import {Ld} from '@axp/design-system/ledger';
import {GuideAccountLink} from './GuideAccountLink';
import '@/components/publisher-demo/publisher-demo.css';
import './integration.css';

export const metadata: Metadata = {
  title: {absolute: 'SDK guide · axp.one'},
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
  baseURL: process.env.AXP_EXCHANGE_URL, // your account address, or the shared demo's
  timeoutMs: 15000,
  receiptTimeoutMs: 45000,
});

// Start both before awaiting either. The answer receives no sponsor material.
const adTask = axp.requestAd({ question, sessionId, turnId,
  placementId: 'chat-sponsored-card',
  settlementNetwork: 'solana-devnet' });
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
  {title: 'Request', location: 'Your server', description: 'Ask for an ad at the same time as you ask your own model for an answer.', code: requestPreview, outcome: 'An award, or no fill'},
  {title: 'Render', location: 'Your app', description: 'For an award, add the approved card below your answer with its Sponsored label.', code: renderPreview, outcome: 'A separate Sponsored card'},
  {title: 'Acknowledge', location: 'Your app to your server', description: 'Confirm the card is on the page, then send that confirmation for a receipt.', code: acknowledgePreview, outcome: 'One accepted charge'},
];
const accountEnv = `# Your own app. Copy the exact address from Your account > Your AI apps > Connect.
AXP_EXCHANGE_URL=https://axp.one/api/accounts/sdk
AXP_PUBLISHER_API_KEY=<the API key you created, shown once>`;
const demoEnv = `# The shared example chat only. Its key is issued by the AXP team.
AXP_EXCHANGE_URL=https://axp.one/api/product
AXP_PUBLISHER_API_KEY=<key provided for the shared demo>`;
const failRender = `await axp.failRender({
  awardId: ad.award.id,
  deliveryToken: ad.deliveryToken,
  reason: 'render_failed',
});`;
const troubles = [
  ['Your server gets 401', 'The key is wrong, expired (keys last 30 days) or revoked.', 'Create a new key under API keys and update your server.'],
  ['A request from the browser is rejected', 'A key must never leave your server.', 'Call AXP from your server and pass only the award to the browser.'],
  ['status is no_fill', 'No campaign fit this question or none bid. This is normal.', 'Show your answer and leave the slot empty.'],
  ['status is error or the request times out', 'The ad request did not complete. Nothing is retried for you.', 'Show your answer. If you retry, send the same question, session and turn.'],
  ['The card cannot be rendered', 'An award is holding budget for a card that will not appear.', 'Call failRender to release it. Otherwise it expires on its own.'],
  ['The acknowledgement result is unknown', 'The receipt may or may not have been accepted.', 'Acknowledge again with the same award and delivery token. It never charges twice.'],
  ['Your account says "Not ready yet"', 'Something in your setup is missing, such as an active key.', 'Open Your AI apps, then Connect, and follow the list shown there.'],
] as const;

export default function PublisherIntegrationPage() {
  return <div className="ld pub-demo">
    <header className="pub-header">
      <Ld.Wordmark href="/" />
      <nav aria-label="Product">
        <Link href="/advertiser-dashboard/">Demo dashboard</Link>
        <Link href="/publisher-demo/">Example chat</Link>
        <GuideAccountLink />
      </nav>
    </header>
    <main className="sdk-guide" id="main">
      <Ld.PageBar
        title="Connect your AI app"
        sub="Ask for an ad next to your own answer, show one Sponsored card below it, and confirm it appeared."
        meta={<Ld.Tag tone="outline">SDK guide</Ld.Tag>}
        actions={<><Ld.Button href="/publisher-demo/" Link={Link} variant="secondary">Open example chat</Ld.Button><Ld.Button href="/account/#app-credentials" size="lg">Get your API key →</Ld.Button></>}
      />

      <section className="sdk-where" aria-labelledby="sdk-where-title">
        <h2 id="sdk-where-title" className="ld-section-title">First, choose where you are connecting</h2>
        <p className="ld-secondary">There are two separate places. Each has its own address and its own key. Use a key only with its own address.</p>
        <div className="sdk-where-grid">
          <article className="sdk-where-card" data-kind="account">
            <Ld.Context kind="account" label="Your account" detail="Your own app, private to you" />
            <dl>
              <div><dt>API address</dt><dd><Ld.CopyLine value="/api/accounts/sdk" /></dd></div>
              <div><dt>API key</dt><dd>You create it under Your AI apps, API keys. Shown once.</dd></div>
              <div><dt>What you see</dt><dd>Only your app, your deliveries and your earnings.</dd></div>
            </dl>
            <div><Ld.Button href="/account/#app">Add your AI app →</Ld.Button></div>
          </article>
          <article className="sdk-where-card" data-kind="demo">
            <Ld.Context kind="demo" label="Shared demo" detail="The public example chat" />
            <dl>
              <div><dt>API address</dt><dd><Ld.CopyLine value="/api/product" /></dd></div>
              <div><dt>API key</dt><dd>Issued by the AXP team for the shared demo. You cannot create one.</dd></div>
              <div><dt>What you see</dt><dd>Public example campaigns that anyone can see and change.</dd></div>
            </dl>
            <div><Ld.Button href="/publisher-demo/" Link={Link} variant="secondary">Open example chat →</Ld.Button></div>
          </article>
        </div>
      </section>

      <section className="sdk-overview" aria-label="Request, render and acknowledge">
        <ol className="sdk-steps">
          {steps.map((step, index) => <li key={step.title} className="sdk-step">
            <div className="sdk-step-head">
              <span className="sdk-step-number">Step {index + 1}</span>
              <span className="ld-caption">{step.location}</span>
            </div>
            <h2>{step.title}</h2>
            <p>{step.description}</p>
            <pre className="sdk-code sdk-code-preview"><code>{step.code}</code></pre>
            <span className="sdk-step-outcome">{step.outcome}<span aria-hidden="true">{index < 2 ? '→' : '✓'}</span></span>
          </li>)}
        </ol>
        <div className="sdk-answer-lane">
          <div><strong>Your answer stays independent.</strong><p>Run your own model in parallel and show its answer as soon as it is ready. If there is no ad, or the ad request fails, the answer is unaffected.</p></div>
        </div>
      </section>

      <section className="sdk-section" aria-labelledby="sdk-setup-title">
        <h2 id="sdk-setup-title" className="ld-section-title">Set up your server</h2>
        <p className="ld-secondary">Keep the key in your server&rsquo;s private environment. Never put it in browser code, a prompt or a URL.</p>
        <div className="sdk-two">
          <Ld.CodeBlock title="Your account" code={accountEnv} />
          <Ld.CodeBlock title="Shared demo" code={demoEnv} />
        </div>
        <p className="ld-secondary">The SDK is not published to npm yet. Copy the SDK source into your project or use it as a local package. It needs Node 22.18 or later and has no runtime dependencies. <a className="ld-link" href="https://github.com/AkshatGada/axp-one/tree/main/packages/publisher-sdk" target="_blank" rel="noopener noreferrer">View SDK source ↗</a></p>
      </section>

      <section className="sdk-section" aria-labelledby="sdk-request-title">
        <h2 id="sdk-request-title" className="ld-section-title">1. Request an ad next to your answer</h2>
        <p className="ld-secondary">Send one cleaned question of up to 1,200 characters, a random session ID per conversation and a stable turn ID per message. Leave private data and chat history out.</p>
        <Ld.CodeBlock title="Your server" code={server} />
        <Ld.Disclosure summary="Details: your functions, limits and timeouts">
          <p><code>yourExistingLLM</code>, <code>sendAnswer</code> and <code>sendSponsoredAward</code> are your app&rsquo;s own functions. Your answer path receives no advertiser text, hints or buying evidence.</p>
          <p>Session and turn IDs use letters, digits, underscores or hyphens, up to 120 characters. You can also pass required features or category exclusions.</p>
          <p>The ad request waits up to 15 seconds and the acknowledgement up to 45 seconds; both can be changed. A timeout does not prove nothing happened on the server, and an ad request is never retried for you.</p>
          <p>On the shared demo, set <code>settlementNetwork</code> to <code>solana-devnet</code> or <code>tempo-testnet</code>. Only campaigns on that network compete. Start a new session when you switch.</p>
        </Ld.Disclosure>
      </section>

      <section className="sdk-section" aria-labelledby="sdk-render-title">
        <h2 id="sdk-render-title" className="ld-section-title">2. Render the card and 3. acknowledge it</h2>
        <p className="ld-secondary">Send only an awarded response and its delivery token to the browser. The helper renders plain text, an https destination and the word Sponsored in a separate card below your answer.</p>
        <Ld.CodeBlock title="Your app (browser)" code={browser} />
        <Ld.CodeBlock title="Your server: forward the confirmation" code={receipt} />
        <Ld.Disclosure summary="Details: what is checked and what a receipt means">
          <p>Your own <code>/api/axp/render</code> route signs in the browser request and forwards the confirmation with your server key. The key never reaches the browser or your model&rsquo;s prompt.</p>
          <p>Before posting, the helper checks the card&rsquo;s award ID, exact text, original destination, visible Sponsored label and that it is on the page. Add your own styles through <code>className</code>. A React version, <code>SponsoredCard</code>, is in <code>packages/publisher-sdk/react.tsx</code>.</p>
          <p>An award holds budget. An accepted receipt creates one charge. The browser cannot choose an amount, a recipient or a signing key.</p>
          <p>A receipt shows that the card was added with its label. It does not show that anyone read it, clicked it or bought anything, and it is not a payout.</p>
        </Ld.Disclosure>
      </section>

      <section className="sdk-section" aria-labelledby="sdk-trouble-title">
        <h2 id="sdk-trouble-title" className="ld-section-title">Readiness and troubleshooting</h2>
        <p className="ld-secondary">In your account, the Connect tab of your app checks your setup and lists anything missing. It requests no ad.</p>
        <div className="sdk-troubles" role="table" aria-label="Troubleshooting">
          <div role="row" className="sdk-trouble-head"><span role="columnheader">What you see</span><span role="columnheader">What it means</span><span role="columnheader">What to do</span></div>
          {troubles.map(([see, means, fix]) => <div role="row" key={see}><span role="cell"><b>{see}</b></span><span role="cell">{means}</span><span role="cell">{fix}</span></div>)}
        </div>
        <Ld.CodeBlock title="Release an award you cannot render" code={failRender} />
        <p className="ld-secondary">An accepted charge cannot be removed by failing its award. Acknowledging an accepted receipt again returns the same charge.</p>
      </section>

      <section className="sdk-reference" aria-labelledby="sdk-reference-title">
        <div className="sdk-reference-heading">
          <div><h2 id="sdk-reference-title">Reference</h2><p>Open only what you need.</p></div>
        </div>
        <details className="sdk-details">
          <summary>Payments and test balances</summary>
          <div className="sdk-detail-body">
            <p>Accounts currently use test balances: accepted receipts add up, and no real money moves. Payouts from an account are not available yet.</p>
            <p>The shared demo can run on a test network with test tokens. There, an accepted delivery advances a running voucher total. Tempo supports payouts while a channel stays open; closing returns unused funds on either network. The example chat&rsquo;s Payment stage shows those states and their recorded evidence separately.</p>
          </div>
        </details>
        <details className="sdk-details">
          <summary>Connect to the shared demo exchange</summary>
          <div className="sdk-detail-body">
            <p>Read the <a href="https://axp.one/api/product/publisher/config">shared demo configuration</a> for its placement and supported features. A key for the shared demo is issued by the AXP team; the public configuration does not hand out keys.</p>
            <p>The shared demo uses Solana Devnet test USDC or Tempo Testnet PathUSD. Its example chat uses DeepSeek for the answer and Jev for buying decisions; your own app keeps its own answer model.</p>
          </div>
        </details>
        <details className="sdk-details">
          <summary>Run the developer example on your machine</summary>
          <div className="sdk-detail-body">
            <h3>Against the shared demo</h3>
            <p>With a shared demo key in your server environment, run this from the repository root:</p>
            <pre className="sdk-code"><code>{`AXP_EXCHANGE_URL=https://axp.one/api/product \\
  node packages/publisher-sdk/examples/server.mjs
# Open http://127.0.0.1:3433.
# The ad and example-answer requests use the shared demo.`}</code></pre>
            <p>Starting it sends nothing. Sending a question uses the shared demo&rsquo;s daily allowance.</p>
            <h3>Against a local exchange</h3>
            <pre className="sdk-code"><code>{`npm run demo:product
# Create, approve and launch a campaign at http://127.0.0.1:3430.

AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product \\
  node packages/publisher-sdk/examples/server.mjs`}</code></pre>
            <p>The launcher stores its generated server key in ignored <code>local-state/product/publisher-api-key</code>, and the example reads it on the server. To use a different local workspace, set the same <code>AXP_PRODUCT_STATE_DIR</code> in both, or pass its key as <code>AXP_PUBLISHER_API_KEY</code>.</p>
            <p>Local test credits are separate from the hosted shared demo. The example chat needs a live answer model and never invents an answer.</p>
          </div>
        </details>
      </section>
      <p className="sdk-reference-note">Integration research: Gravity’s official <a href="https://docs.trygravity.ai/ai-platforms/quickstart" target="_blank" rel="noopener noreferrer">server request and render quickstart</a> informed this sequence. AXP uses its own exchange and receipt contracts.</p>
    </main>
  </div>;
}
