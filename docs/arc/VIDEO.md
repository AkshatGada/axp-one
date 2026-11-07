# Demo video script and recording checklist

Target length: **2:30–3:00**. Bounty name in title/description:
**Arc Studio Continuity Track: Bring Your Project to Arc**.

| Time | Show | Say |
| --- | --- | --- |
| 0:00–0:20 | Existing AXP advertiser dashboard and example chat | “AXP connects advertisers with independent AI apps. This is our existing product: campaign approval, buying agents, deterministic auction, Sponsored insertion and signed delivery receipts.” |
| 0:20–0:40 | Architecture diagram; highlight new Arc branch | “During ETHGlobal Mumbai we added Arc Nanopayments using Circle Gateway. It takes the payment role previously handled by Solana channels. Solana and Tempo remain available.” |
| 0:40–1:00 | Arc Studio chat, `sdk/axp-arc-x402/requirements.ts`, tests and preview | “We used Arc Studio to build the nanopayment protocol and reference backend/UI, then reviewed and integrated its code into AXP. Here is the real project and generated source.” |
| 1:00–1:20 | AXP campaign, approved text/cap, Gateway deposit Explorer link | “The advertiser funds a Gateway balance with test USDC on Arc. This deposit is real. A campaign allocation bounds spending; it is not a new onchain escrow.” |
| 1:20–1:50 | Send the developer-tools prompt; show answer then Sponsored card | “The independent answer and buying judgment are labelled fixtures for this bounded demo. The auction, actual DOM insertion, receipt signature and payment authorization are real. Only accepted insertion creates a charge.” |
| 1:50–2:15 | View internals → Payment → Send nanopayments | “Each receipt authorizes exactly one 0.002 test-USDC EIP-3009 payment. Circle Gateway accepts both payments without a transaction per ad. Acceptance is shown separately from batch settlement.” |
| 2:15–2:40 | Check batch settlement and actual Explorer proof, or explicitly pending state | “Gateway later settles the batch on Arc. We reconcile the original transfer ID/nonce and verify the reported batch transaction through RPC. If it is pending, we say pending.” |
| 2:40–3:00 | Advertiser report, Studio evidence preview, repository diff/commits | “The same accepted receipts drive advertiser spend and publisher earnings. The branch documents exactly what existed before and what we added. No mainnet, real funds or new trained model is claimed.” |

If batch proof is still pending, end with the finalized Gateway deposit and real
facilitator acceptance. Do not substitute the unrelated unused Studio escrow
transaction. Do not edit a pending state into “finalized.”

## Before recording

- [ ] Confirm Continuity registration/eligibility and owner disclosure.
- [ ] Start `npm run arc:demo`; open the advertiser and publisher URLs in README.
- [ ] Open the Studio project and preview; confirm its sandbox is awake.
- [ ] Verify a judge can open the final Studio/share URL. Owner access is insufficient.
- [ ] Prepare [architecture.svg](architecture.svg) or the Mermaid diagram.
- [ ] Check remaining campaign cap before any fresh turn. Current preparation has
      two 0.002 deliveries already accepted, leaving 0.004 for two recording turns.
- [ ] Use saved evidence for repeated takes; do not reset state or make new deposits.
- [ ] Close login callback tabs, terminal environment views, wallet files and private
      database inspectors. Never show keys or raw EIP-3009 signatures.
- [ ] Use a clean 16:9 capture, readable zoom and microphone; remove notifications.
- [ ] Keep fixture-provider disclosure visible and verbally identify test USDC.

## During recording

- [ ] Show Arc Studio itself, not only a screenshot or generic logo.
- [ ] Show actual frontend and backend behavior with an accepted DOM receipt.
- [ ] Open the actual Gateway deposit Explorer transaction.
- [ ] Show amount/party/receipt hashes, not private payment payloads.
- [ ] Show Gateway acceptance separately from batch finality.
- [ ] If ending the campaign, do it last. Unused allocation stays in Gateway.

## Before upload/submission

- [ ] Review every frame and audio for credentials or unrelated personal information.
- [ ] Verify the video link works in a signed-out browser.
- [ ] Include the exact bounty name, repo/branch/commit links, Studio URL and diagram.
- [ ] State the pre-existing/new-work boundary and fixture/live evidence distinction.
- [ ] Human approves repository publication/hosting and submits before
      **Saturday, 7 November 2026, 9:00 AM IST**.
