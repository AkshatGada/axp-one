import type {Metadata} from 'next';
import Link from 'next/link';
import {Ld} from '@axp/design-system/ledger';
import '@/components/publisher-demo/publisher-demo.css';
export const metadata: Metadata = {title: 'Publisher SDK integration', description: 'Connect your server and native Sponsored renderer to AXP without adding sponsor material to the answer.'};
const server = `import { AXPPublisher } from './packages/publisher-sdk/index.mjs';

const axp = new AXPPublisher({
  apiKey: process.env.AXP_PUBLISHER_API_KEY, // server only
  baseURL: process.env.AXP_EXCHANGE_URL,
  timeoutMs: 15000,
  receiptTimeoutMs: 45000,
});

// Both start now. Display the organic answer as soon as it is ready.
const adTask = axp.requestAd({ question, sessionId, turnId,
  placementId: 'chat-sponsored-card' });
const answerTask = yourExistingLLM({ question });

sendAnswer(await answerTask); // no paid creative, hints or bid context
const ad = await adTask;
if (ad.status === 'awarded') sendSponsoredAward(ad);
// no_fill or error: keep the answer and leave the slot empty`;
const browser = `import { createSponsoredCard, createRenderAcknowledger }
  from './packages/publisher-sdk/browser.mjs';

const acknowledge = createRenderAcknowledger({
  post: async (path, observation, deliveryToken) => {
    // Your authenticated same-origin backend forwards with its server key.
    const response = await fetch('/api/axp/render', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ awardId: ad.award.id,
        observation, deliveryToken }),
    });
    if (!response.ok) throw new Error('delivery_unconfirmed');
    return response.json();
  },
});

const node = createSponsoredCard({ document, award: ad.award });
sponsorSlot.append(node); // native card, exact text and Sponsored label
const receipt = await acknowledge({ node, award: ad.award,
  deliveryToken: ad.deliveryToken });`;
const receipt = `// Your server's /api/axp/render handler, after app authentication + CSRF:
const receipt = await axp.acknowledgeRender({
  awardId: body.awardId,
  deliveryToken: body.deliveryToken,
  observation: body.observation,
});
// receipt.status === 'accepted': inspect charge.id and receiptHash.
// Retry this same award/token to reconcile uncertainty. Never buy again.`;
export default function PublisherIntegrationPage() {
  return <div className="ld pub-demo"><header className="pub-header"><Ld.Wordmark href="/" /><nav aria-label="Product"><Link href="/publisher-demo">Open publisher chat</Link><Link href="/advertiser-dashboard">Advertiser dashboard →</Link></nav></header><main className="pub-main pub-guide" id="main">
    <Ld.PageBar title="Connect your AI app" sub="A server request, a native Sponsored card, and one observable delivery receipt." meta={<Ld.Tag tone="brand">Publisher SDK · local source</Ld.Tag>} />
    <div className="pub-guide-grid">
      <Ld.Panel title="1. Configure your server"><p>Start the local product workspace with <code>npm run demo:product</code>. Read <code>GET /api/product/publisher/config</code> for the publisher ID, placement and Jev readiness. Obtain the local publisher key through the server setup, then keep it in your server environment.</p><pre className="pub-code">{`AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product
AXP_PUBLISHER_API_KEY=<your server-only local publisher key>`}</pre><p>The launcher creates an ignored key file at <code>local-state/product/publisher-api-key</code>. The example reads it only on the server, without printing it. You can use <code>AXP_PUBLISHER_API_KEY</code> as an explicit server override.</p><p>The SDK lives in <code>packages/publisher-sdk</code> in this repository. Import its local entry points; it has no runtime dependencies and is not published to npm. Copy that directory into your server project or use a local package dependency.</p></Ld.Panel>
      <Ld.Panel title="2. Request ads alongside your answer"><p>Use a random session ID for a conversation and keep the same turn ID when retrying a request. Send one sanitized question and optional required capabilities or category exclusions. Your existing LLM path receives no sponsor material.</p><pre className="pub-code">{server}</pre><p>Ad request errors return <code>{`{ status: 'error', error: { code } }`}</code>. Jev has a bounded deadline; configure the SDK timeout to fit your app. Waiting for an ad never needs to delay displaying the answer.</p></Ld.Panel>
      <Ld.Panel title="3. Render and observe the exact placement"><p>Append the native card to a connected container. The helper uses plain text, an HTTPS destination and a literal Sponsored label. It checks the actual DOM before making a delivery observation. Style the card within your app.</p><pre className="pub-code">{browser}</pre><p>The browser receives only the award and its scoped delivery capability. It never receives the publisher key or a receipt signing key. The optional React source adapter is available at <code>packages/publisher-sdk/react.tsx</code>.</p></Ld.Panel>
      <Ld.Panel title="4. Forward the observation and inspect its receipt"><pre className="pub-code">{receipt}</pre><p>An award reserves budget. Accepted delivery creates one charge. Financial mode comes from the server: synthetic uses test credits, while Devnet uses test USDC. An accepted charge and its off-chain voucher are distinct from a finalized payout, close or refund. Peek exposes recorded native evidence; the SDK carries no payment signer. Real Jev model execution is labelled separately. Receipt signatures authenticate the app’s assertion, not human attention or conversion.</p><p>If your app cannot render a reserved award, call <code>axp.failRender</code> with the same award ID and delivery token. The reservation otherwise expires. No-fill, rejection and failure leave the organic response available.</p></Ld.Panel>
      <Ld.Panel title="5. Run the complete local example"><pre className="pub-code">{`# From the repository root, after the product server is running:
AXP_EXCHANGE_URL=http://127.0.0.1:3430/api/product \\
  node packages/publisher-sdk/examples/server.mjs
# Open http://127.0.0.1:3433, create a campaign in the dashboard,
# and ask a matching question. DeepSeek must be configured.
# Sends invoke DeepSeek and may invoke Jev for ad requests.`}</pre><p>The developer example provides separate answer and ad routes, a native browser renderer, server-only authentication, stable turn IDs, an independent DeepSeek answer and receipt forwarding. The judge-facing app is the integrated publisher chat, with the complete “View internals” flow.</p><Ld.Button href="/publisher-demo" Link={Link}>Open the live publisher chat →</Ld.Button></Ld.Panel>
      <p>Integration research: Gravity’s official <a href="https://docs.trygravity.ai/ai-platforms/quickstart" target="_blank" rel="noopener noreferrer">parallel server request and render quickstart</a> informed this lifecycle. AXP uses its own exchange and receipt contracts.</p>
    </div>
  </main></div>;
}
