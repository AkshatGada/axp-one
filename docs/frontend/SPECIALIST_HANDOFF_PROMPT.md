# AXP.one — frontend specialist handoff prompt

You are the UI, UX and frontend expert for AXP.one. You own research, product
experience, information architecture, interaction design, visual direction,
motion, frontend architecture and implementation. Make those decisions yourself
after understanding the product and the working system. This is a product and
engineering handoff, not a prescribed screen plan, wireframe or design recipe.

The owner deliberately deferred final frontend work until the backend and its
end-to-end demonstration worked. The existing consoles are functional test
interfaces, not designs to imitate. Older documents may suggest layouts,
screen-to-state mappings or numbered presentation chapters: those are previous
reference implementations, not instructions governing your design. Preserve
the meaning of backend states and evidence; decide their presentation yourself.

## Why we are building this

**AXP.one — The advertising exchange for the agentic internet.**

AI applications create conversational opportunities: a person is comparing
products, investigating a problem or deciding what to use. Advertisers need a
way to buy relevant, disclosed placements in those applications. An advertiser
agent can evaluate an opportunity against its own campaign and decide whether
to participate. An exchange can then enforce eligibility, run an auction,
return an approved ad and account for its delivery. Stablecoin payment channels
make repeated small delivery-linked payments possible without an on-chain
transfer for every placement.

The vision brings together conversational-ad intelligence, advertiser agents,
an exchange, publisher integrations and programmable payments. The current
hackathon MVP proves a narrow connected instance of that vision. The goal is a
convincing four-to-five-minute demonstration of a real algorithm and working
exchange—not production infrastructure or a collection of disconnected mocks.

There are two related frontend deliverables: a new marketing website explaining
the broader product vision, and the product experience demonstrating what
actually works. They belong to this new repository and remain separate clients
of the system. The domain intention is eventually to reuse axp.one, replacing
the old site only through a separately authorized release. You decide the
frontend organization, experiences, technology and presentation. Deployment and
domain changes are not authorized by this handoff.

### Owner clarification: landing page and MVP are two different experiences

The marketing deliverable must be a proper public-facing landing page for the
whole AXP vision: an advertising exchange for the agentic internet, connecting
advertisers, advertiser agents and AI-application publishers through disclosed
placements and programmable delivery-linked payments. It is not merely an MVP
launch screen, replay viewer or technical report. Explain why this product
exists and the broader opportunity, while distinguishing that vision from
capabilities already demonstrated. The landing page must link to the MVP so a
judge can move from understanding the product to inspecting the working proof.

The second deliverable is the functional MVP experience: onboarding, evidence,
agent decisions, auction, delivery and accounting, with its existing laboratory
and recorded-evidence boundaries. Keep it distinct from the marketing website;
do not imply landing-page navigation itself runs models or settles payments.

The landing page also needs a dedicated ContextHint data-foundation section.
The owner considers this existing product and its collected conversational-ad
evidence central to the hackathon story: AXP is grounded in an established,
separate ad-intelligence product, not evidence invented for this demonstration.
Identify and link the real product as **ContextHint — https://contexthint.com/**.
The owner's spoken references to "Contextual" in this clarification refer to
ContextHint, not a newly named product or a different company. AXP is a new
exchange built using evidence from ContextHint; it is not a claim that every
ContextHint feature, customer or observed advertiser participates in AXP.

Explicitly explain the **ContextHint data moat**: the owner already operates a
real conversational-ad intelligence product and has collected a substantial
prompt–creative–inferred-hint corpus that supplies AXP's evidence foundation.
The owner additionally reports that ContextHint already has **thousands of
users and paying customers**. Include this existing-product traction in the
landing-page narrative alongside the ContextHint link, rather than presenting
AXP as an idea without an operating-product foundation. This is owner-reported
traction, not a user/billing count independently checked by this handoff. Do not
invent exact counts, revenue, growth, customer names or testimonials; obtain
owner-approved supporting metrics if a more precise public claim is needed.
ContextHint users and customers are not automatically AXP users or advertisers.
The moat framing is a product thesis grounded in the existing data and product,
not proof of exclusive access, unbeatable targeting or measured performance lift.

Present the supplied library statistics clearly enough for hackathon judges to
understand the scale, and explain how the actual historical evidence enters
AXP's decisions. The figures and qualifications below are the content basis,
not a prescribed visual treatment. Do not turn the entire library's counts into
demo inventory or claim that the whole corpus trains the current algorithm.
Place the US-heavy coverage and snapshot qualifications with the data context;
they need not lead the product's opening message. You own research, narrative,
information hierarchy, layout, interactions, motion and implementation for both
deliverables. No particular screen sequence or landing-page design is imposed.

## Repository and history

Active repository: `/Users/akshat/agentic-dsp`. It is a standalone local Git
repository; `git remote -v` was empty when this handoff was prepared. The working
tree contains substantial implemented work that is not all committed. Preserve
it; a clean checkout or Git HEAD alone is not the complete current MVP.

Historical references, not edit targets:

- `/Users/akshat/axp-one-site`: old AXP website, configured remote
  `https://github.com/AkshatGada/axp-site.git` in the repository map.
- `/Users/akshat/axp-one-motion-redesign`: old website motion/design worktree.
- `/Users/akshat/akshatgada`: personal website reference, if accessible; confirm
  its actual files before assuming which version is current.
- `/Users/akshat/axp-agent-ad-experiments/protocol`: earlier AXP experiments/MVP.
- `/Users/akshat/axp-access-core`: historical sponsored-access implementation.
- `/Users/akshat/contexthint`, `/Users/akshat/ads-backend` and
  `/Users/akshat/openai-ads`: ContextHint production/reference projects, read-only.
- `/Users/akshat/agentic-web`: separate citation-intelligence product; not AXP.

The earlier AXP product funded access to a paywalled publisher report after
sponsor examination. Experiments there tested sampled factual/evidence-supported
responses, not proof of full reading, context absorption, attention or endorsement.
That is background knowledge, not this MVP's transaction or product model.
The current product sells disclosed placements in conversational AI applications.
Do not blend the old sponsored-report narrative or its payments into V3 evidence.

## Who participates

- **Advertiser/operator:** defines an approved creative, declared capabilities,
  independent context hints, task restrictions, maximum bid and spending limits.
- **Advertiser buying agent / DSP:** evaluates a particular opportunity using
  only its own campaign and permitted evidence; recommends bid, skip or abstain.
- **Exchange:** validates eligibility and model outputs, computes bounded bids,
  runs a deterministic first-price auction and reserves the winner's budget.
- **Publisher:** the AI application's operator; offers a conversational
  placement, renders the approved creative with sponsorship disclosure and
  acknowledges delivery. The publisher receives settlement.
- **End user:** receives independent organic guidance and a separate paid
  placement. The organic assistant is not required to recommend, cite or endorse
  the sponsor. It does not receive advertiser material in its input.
- **Trusted payment worker/operator:** authorizes only accepted ledger charges
  and settles channels. Browsers and agents do not possess signing authority.

## The implemented exchange

The system separates model advice from deterministic authority. A campaign is
versioned and approved. A publisher opportunity has a task, mandatory
capabilities and stable identity. Historical evidence is retrieved and aligned
to the individual advertiser. Jev returns validated relevance/intent advice and
an approved creative choice. It does not set a monetary bid or change campaign
capabilities. Backend rules determine the permitted bid, eligibility, frequency
caps, budget reservation and auction result.

An award is not a charge. Accepted publisher delivery binds the opportunity,
award, creative and price to a signed receipt; it consumes the reservation once
and creates an immutable charge. Failed delivery, no-fill, losing bids and
duplicates do not create accepted charges. Receipt-linked spending is then
cumulatively authorized through a native payment session. Settlement pays the
publisher and refunds unused collateral. Closing never adds another charge.

Strategic campaign-planning agents are part of the longer-term vision, not a
demonstrated autonomous feature of this run. Jev is one replaceable decision
implementation, not an unconstrained auctioneer, signer or proven optimal model.
Conversion probability/optimization has not been established.

## ContextHint: our real data foundation

ContextHint.com is the owner's conversational-ad intelligence product. Its data
links observed prompts to ad creatives and inferred targeting/context hints.
The inferred hints are hypotheses reconstructed from observations, not official
advertiser targeting settings or ChatGPT's proprietary ranking algorithm.

AXP uses a screened, immutable wallet/self-custody slice of that existing data.
It preserves prompt–creative–hint bindings, classification provenance, source
identities and hashes. Repeated associations do not become independent relevance
votes. Compatible existing embeddings support the exact cached question;
uncached questions use an explicitly labelled deterministic lexical fallback.
No embeddings were generated and no supervised model was trained for V3.

Each advertiser receives its own declarations and a compact aligned historical
packet, not other bidders, financial information or wallets. Evidence can inform
judgment; it cannot give a fictional product a missing capability. The supplied
packet and the actual model response are inspectable in the saved run.

Actual export used by V3: **1,178 screened associations, 241 normalized prompts,
537 historical creatives and 331 linked inferred hints.** Historical OneKey,
Mercari and other brands are references, not advertisers enrolled in AXP.

The owner supplied the following serving-library snapshot from `akshatapp`,
around **September 26, 2026**. This is the landing-page data content basis:

| Library metric | Owner-supplied snapshot |
|---|---:|
| Observed advertisers | 11,730 |
| Unique ad creatives | 45,947 |
| Observed ad placements | 420,540 |
| Niches | 983; 970 with ads |
| Sub-niches | 7,121; 5,991 with ads |

Library placements span **June 19–August 24**. Large scrape loops paused around
September 1; subsequent Fresh Ads collection is a separate pipeline. The owner
reported **936 ads delivered through Fresh Ads during September 9–26**, roughly
**620 new to the library**; those deliveries are not included in the 420,540
placement count. Do not add them into a new combined headline total.

Fresh Ads supports 12 countries, all of which had returned ads in the supplied
snapshot: United States, India, Canada, Germany, Japan, Australia, United
Kingdom, Brazil, South Korea, Mexico, France and New Zealand. This collection
capability is not balanced geographic coverage of the historical library.
The library is US-heavy: 330,777 US-tagged placements, 67,430 without a recorded
country, 16,944 in Australia and 5,373 in South Korea, plus a handful in India,
Switzerland and Bangladesh. Geographic creative counts overlap and are not
additive.

These figures are owner-supplied historical context, not newly queried current
counts, AXP advertiser enrollment, traffic, reach, conversions or the number of
records used in this demo. Keep the snapshot date and provenance available;
verify before describing the counts as current/live. The real-product link and
corpus demonstrate an existing data foundation, not an OpenAI partnership,
ChatGPT algorithm reconstruction or proven targeting advantage. Explain the
implemented contribution: bounded retrieval of observed prompt–creative–hint
examples into actual advertiser-agent requests, with source bindings the MVP
can inspect. The full library scale and the screened V3 export above are
different quantities and must remain distinguishable.

Defensible claim: **AXP uses real conversational-ad observations and inferred
targeting evidence to inform advertiser-agent placement decisions.**
It does not reproduce ChatGPT's algorithm or demonstrate targeting lift.

## Completed V3 acceptance: what actually happened

Original run: `v3-wallet-acceptance`. Original network: **hosted Solana sandbox**.

Three fictional campaigns:

- ClearVault: hardware wallet, offline key storage, Ethereum/Solana support;
  targeting emphasizes straightforward self-custody.
- KeyForge: same core declared capabilities; experienced self-custody targeting.
- LeatherGuard: physical RFID-blocking wallet, no crypto-storage capability;
  unfunded contrast.

The two hardware campaigns had separate finalized 0.020 test-USDC channels.
One disposable test payer represents both fictional advertisers; this does not
demonstrate independent advertiser-owned wallets.

Four exact-question organic answers were generated by fresh isolated
`gpt-6.1-sol`, low app agents through an operator-recorded bridge. Inputs contain
no advertiser material. Outputs are bound to exact question, turn and input hash;
the bridge is not a cryptographic proof of hidden context.

Fifteen actual Jev1.13.0 calls completed:12 paired text-only/history slots for
two questions × three campaigns, and3 history decisions for a repeat opportunity.
Only history decisions entered auctions. No calls were selectively rerun to
force an outcome. LeatherGuard genuinely skipped. Cached history changed
commercial-intent levels2→3 for both funded campaigns; relevance and bid/skip
participation stayed unchanged. Offline pairs stayed unchanged. Timings were
315.2–845.5ms, not evidence of sub-50ms latency or a general speed advantage.

The cached hardware-wallet question produced two0.004 bids; the uncached
offline-storage question produced two0.003 bids. ClearVault won both deterministic
ties. On a new repeat opportunity, its two-placement frequency cap excluded it;
KeyForge bid and won0.003. That exclusion is policy, not a model skip. A separate
mobile-only question produced deterministic no-fill, zero calls and zero charges.

Three actual disclosed cards were inserted and accepted through the owned
publisher application. Their signed receipts produced charges0.004,0.003,0.003.

| Advertiser | Deposit test USDC | Cumulative spend | Final payout | Unused refund |
|---|---:|---|---:|---:|
| ClearVault |0.020|0.004→0.007|0.007|0.013|
| KeyForge |0.020|0.003|0.003|0.017|
| Total |0.040|0.010|0.010|0.030|

Both native channels finalized: two opens and two cooperative closes. This is
MPP sessions with native cumulative off-chain vouchers followed by settlement,
not a transfer per ad and not x402 exact/upto settlement. x402 is a separate
future adapter in this product; earlier x402 sponsored-access work is distinct.
MCP/WebMCP/Cloudflare are not the current exchange's payment integration and
have no implemented-conformance claim here.

Fees and rent are separately saved in test-SOL lamports. An explicitly approved
one-time sandbox faucet exception supplied a0.026 test-USDC shortfall; funding
is not settlement. No mainnet funds. Both actual closes had positive spend;
zero-spend closure has unsigned simulation/fixture coverage, not a live run.

Restart replayed all4 completed turns and3 original signed receipts with
unchanged state and zero additional calls, charges, signatures or broadcasts.
Repository tests:367 total,361 passed,6 optional skipped,zero failed.205
existing V1/V2/travel artifact hashes were preserved. No push or deployment.

## Current runtime and authoritative files

Use these as implementation/evidence sources; older general architecture and
North Star documents describe earlier travel stories or proposed capabilities.

- `/Users/akshat/agentic-dsp/docs/build/V3_RESULT.md`: current achieved result,
  research findings, settlement reconciliation and limitations.
- `/Users/akshat/agentic-dsp/docs/build/V3_TASK.md`: approved V3 scope.
- `/Users/akshat/agentic-dsp/docs/build/V3_RUNBOOK.md`: exact operator procedures.
- `/Users/akshat/agentic-dsp/docs/frontend/V3_HANDOFF.md`: implemented backend
  contract. Its existing screen map is non-binding design background.
- `/Users/akshat/agentic-dsp/docs/frontend/v3-openapi.json`: implemented routes.
- `/Users/akshat/agentic-dsp/packages/v3/client.mjs` and `client.d.mts`: thin
  browser client and DTOs; no independent frontend ledger or signing authority.
- `/Users/akshat/agentic-dsp/apps/backend/v3.mjs`: actual loopback route behavior.
- `/Users/akshat/agentic-dsp/packages/v3/`: campaign/turn coordination, exact organic
  bridge, advertiser harness, payments and accepted-run validation.
- `/Users/akshat/agentic-dsp/packages/exchange/`, `packages/contracts/`,
  `packages/ml/`, `packages/payments/`: reusable system implementation.
- `/Users/akshat/agentic-dsp/artifacts/v3/replay/`: sanitized hash-verified run,
  evidence, events, receipts and public payment projections.
- `/Users/akshat/agentic-dsp/artifacts/v3/chain-check.json`: saved original
  finalized transaction/account evidence. Sandbox explorers can reset.
- `/Users/akshat/agentic-dsp/docs/frontend/v3-fixtures.json`: explicitly synthetic
  state fragments, not proof of real execution.
- `/Users/akshat/agentic-dsp/artifacts/v3/recording/`: four-minute silent captioned
  MP4, subtitles, narration and actual browser-frame provenance. This is edited
  read-only evidence replay, not continuous fresh paid execution.
- `/Users/akshat/agentic-dsp/artifacts/v3/offline-presentation/`: tested Node25+
  credential-free replay package, also available as a ZIP alongside it.
- `/Users/akshat/agentic-dsp/apps/v3-ui/`: functional reference console only.

`npm run demo:v3:replay` serves the recorded acceptance on loopback port8794.
It requires no wallets, credentials, database or upstream network. All non-GET
replay requests return405; navigation must never create charges or invoke models.

`npm run demo:v3` is the separate interactive laboratory, models off by default.
Existing sandbox acceptance is frozen. Laboratory campaign/version/preview and
turn operations are not another live settlement. Do not enable providers or
spend while doing frontend work. Saved acceptance must not be overwritten by
editing the lab or by generating new demonstration outputs.

Implemented runtime operations include campaign versioning/approval, preview,
exact-question turn requests/execution, evidence/retrieval, saved events,
delivery acceptance/failure and public accounting state. There is no browser
organic-completion, payment or signing endpoint. Completion recording and
freeze/open/authorize/close/reconcile are terminal-only operator operations.
Pending/unknown/submitted settlement is not finalized. Money is represented as
integer six-decimal base-unit strings. DTOs separate financial mode, original
execution provenance and recorded-replay presentation.

## Available design foundation and references

The shared design foundation has already been copied into this repository:

- `/Users/akshat/agentic-dsp/design-system/fonts/`: all8 existing PolySans WOFF2
  assets (Neutral,Median,Bulky,SlimWide,NeutralWide,MedianWide,NeutralMono,MedianMono).
- `/Users/akshat/agentic-dsp/design-system/fonts.css`: font declarations.
- `/Users/akshat/agentic-dsp/design-system/tokens.css`: neutral palette, restrained
  steel accents, spacing/type/layout reference tokens and easing.
- `/Users/akshat/agentic-dsp/docs/DESIGN_SYSTEM.md`: provenance/reference notes,
  tracing the existing AXP redesign back to the personal-site design foundation.

The owner's previously expressed brand preference is the personal site's
typography/spacing taste with minimal neutral styling and metal used as an
accent, not full metallic surfaces. The source purple gradient and green
accents are not the requested brand direction. These are owner context and
available assets, not instructions from the backend author about which
components, layouts, interactions or animations you must design. Your research
and judgment own the final experience. The full old component library,
illustrations, animation code and finished pages were deliberately not copied.
Existing font provenance does not grant unrelated third-party redistribution.

## Technical and evidence boundaries, not design prescriptions

Work in the new repository. Preserve all original acceptance artifacts and
V1/V2; keep the old site recoverable. Existing ContextHint production code,
databases, plugins and services remain read-only. Do not copy customer data or
secrets. Public clients receive sanitized source evidence and payment projections,
not embedding vectors, keys, credentials or private signed spending vouchers.

Keep the auction, accepted-charge accounting and signing authority in the backend.
If the desired experience needs an unavailable backend behavior, identify that
contract gap rather than pretending it exists or recreating monetary authority
in the frontend. Changes affecting frozen algorithm/input hashes or original
financial evidence need backend coordination, not silent alteration.

Sponsorship disclosure is part of the product's truth contract. A signed receipt
authenticates an owned-app assertion, not human attention. Labels must distinguish
historical evidence/inference, fictional declarations, actual model output,
deterministic policy exclusions, synthetic laboratory state, original sandbox
settlement and read-only recorded replay. How to communicate those meanings
clearly is your UX decision, not an imposed layout.

Do not claim advertiser partnerships, current product pricing, verified fictional
capabilities, ChatGPT algorithm replication, conversion optimization, causal
targeting improvement, independently verified viewability or agent ad absorption.
The broader product vision can be ambitious; the MVP's achieved capabilities
must remain accurately distinguishable from future plans.

No new paid model calls, wallet operations, transfers, account/production changes,
push or deployment are authorized by this frontend handoff. The saved replay is
sufficient for integration and presentation. This is a hackathon MVP: prioritize
understanding, a compelling experience and a reliable working demonstration;
do not drift into production infrastructure or repeated broad audit cycles.

You have full ownership of deciding how the public vision and demonstrated
product should feel, function and communicate. Research and plan the frontend
yourself from this system context; the current backend console is evidence of
behavior, not the answer to its UI or UX.
