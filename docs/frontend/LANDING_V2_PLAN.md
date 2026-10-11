# Landing V2: one placement, seen from several sides

Written 11 October 2026 by the integrator (art direction, shared kit, seams, integration).
Local design version only: no push, no deployment, no backend, payment or evidence changes.
V1 stays recoverable at tag `axp-landing-product-v1` and keeps serving `/`; V2 builds at `/v2/`.

## 1. Who it is for and what it must do

Two readers. A marketer deciding whether conversational AI is a place to advertise. A builder of
an AI app deciding whether ads can pay for answers without costing trust. Each should leave
understanding their side well enough to open the product: the advertiser dashboard, or the
integration guide. Those are existing routes. There is no form, contact address or signup; the
commercial destination is an open handoff decision and must not be faked.

Positioning: **axp.one, the advertising network for the agentic internet.** The homepage tells the
product, not its status: no trial, MVP, test workspace, roadmap or apology framing in the story or
the buttons. It also claims nothing that is not true: no customers, partners, performance, mainnet
payments or signup. Where real payment evidence is linked, the link keeps its exact label (Solana
Devnet, test USDC, its date). Specimens are scripted and labelled "Interactive illustration"
locally; their controls change only local state.

## 2. The spine

The hero shows a field of conversations and lifts one out. The second screen opens that one
placement into its layers. The rest of the page stays with **that same placement** and walks
around it: the moment it happens in, the advertiser's side of it, the app's side of it, and the
point where the two agree. The wall is context, never the main picture again until the close.

Every chapter has one explanatory job and a deliberate change of scale:

| # | Chapter | Scale | Job (the one new thing) |
|---|---|---|---|
| 1 | Hero (kept) | wide, deep | What axp.one is |
| 2 | Exploded card (kept) | one object, opened | A placement has structure behind it |
| 3 | The moment | intimate, one tile | Topic is not enough: an ad belongs only when someone is choosing and needs what you offer |
| 4 | The advertiser's side | wide, a working surface | You can delegate buying and keep control: declared offer, explained decisions, approved words, bounded spend |
| 5 | The app's side | large, a product close-up | The same placement from where the answer is written: earn beside the answer, in a slot you control |
| 6 | Where they meet | small, precise | It is one network because a card needs both sides and a fit; the receipt and what it does not mean |
| 7 | Two doors | big type, the wall returns | Where each reader goes next |

Pacing: chapter 3 is short (about one screen). Chapter 4 is the longest. Chapter 5 is the most
attractive. Chapter 6 is compact. No chapter repeats another's explanation. After the hero's
existing pinned scene, **nothing pins**: native scrolling, short one-time animations when a scene
enters, and controls the reader operates. Every scene is complete as a still (reduced motion, no
JS) and tells the same story on a phone, including its meaningful interaction.

## 3. Lessons taken from ContextHint's landing source (read only, not copied)

Chapters open on the customer's own question. Each chapter is told with a bespoke product
specimen, not a feature list. One fictional example account carries the whole story. Every word is
server-rendered and visible without JS, with motion layered on top. The closing returns to the
opening image. Transitions are designed objects (a sheet rising over the last), not gaps.

## 4. Story rules every scene keeps (see `apps/marketing/src/v8/story.ts`)

1. Relevance and commercial intent are different. Show nearby questions that differ in the actual
   requirement, not a score that rises with more commercial wording.
2. A campaign has only the capabilities its advertiser declared. Nothing is assumed for it.
3. No numeric fit, profit, attention or performance figures. Outcomes are words.
4. A receipt is an accepted insertion: a ledger charge for the advertiser, an accrual for the app.
   Not a payout. Settlement comes later, when the campaign closes. Never animate it as an instant
   on-chain payment.
5. Answer independence is scoped: "in our integration, no advertiser material reaches the answer
   path". The app's answer text is identical across every slot state.
6. No provider names, code, voucher counters, auction arithmetic or dataset numbers in the story.
   Code is one quiet secondary link in the app chapter.
7. ContextHint appears only as the header link with its hover and focus description.

## 5. Components and ownership

Shared and frozen before the builders start (owner: integrator):
`v8/story.ts` (data), `v8/copy.ts` (all chapter copy), `v8/v8.css` (tokens, type), `v8/kit/`
(Scene, Tile, SponsoredCard, EmptySlot, Choices, Illustration, useInView, useReduced),
`app/v2/` (page shell and one lab route per scene). Also the integrator's: header, hero and
exploded-card copy, the seams between scenes, page rhythm, footer, integration, the only commits.

| Builder | Folder (only place it writes) | Lab route |
|---|---|---|
| A. The moment | `apps/marketing/src/v8/moment/` | `/v2/lab/moment/` |
| B. The advertiser's side | `apps/marketing/src/v8/advertiser/` | `/v2/lab/advertiser/` |
| C. The app's side | `apps/marketing/src/v8/publisher/` | `/v2/lab/publisher/` |
| D. Where they meet, and the doors | `apps/marketing/src/v8/meet/` | `/v2/lab/meet/` |

Each folder exports its scene as the default export of `index.tsx`. Builders do not edit shared
files, other folders or the page shell, do not commit, and record decisions, copy proposals and
kit requests in their folder's `NOTES.md`. Each brief states the job and the constraints; the
composition, the specimen and the interaction are the builder's to design.

### A. The moment
Reader's question: when does an ad belong in an answer? New information only: same topic,
different moments. A few nearby questions from the story data; for each, whether the person is
choosing or learning, what the question actually requires, and what ends up beside the answer
(this advertiser's card, another's, or nothing). Short: about one screen on a laptop.

### B. The advertiser's side
Reader's question: how do I trust an agent to buy for me? Earn confidence in order: own offer
and intended contexts, then explained participation and skips across contrasting questions, then
approved words, then bounded spend and pause. The strongest proof available is rule 2 made
visible: what the advertiser declared decides what it may join.

### C. The app's side
Reader's question: can my app earn without the ad touching my answer? Open by making clear this
is the same placement, seen from the app. An attractive app experience first, the benefit of
earning, and the app's own rules. The answer is identical in every slot state. Code is a
secondary link.

### D. Where they meet, and the doors
Reader's question: what makes it one network? A card exists only when the advertiser's limits,
the app's rules and the fit agree. The receipt as a small two-sided object with exact wording,
a plain line about accumulation and later settlement, the labelled proof link. Then two doors
and a close that returns to the wall.

## 6. Reviews (bounded)

Per component: captures at 1440x900, 1280x800 and 390x844, a reduced-motion still and a keyboard
pass, reviewed by the integrator against the brief; at most two revision rounds. Integrated: one
full-scroll desktop and mobile pass, one combined cold-reader and design review, one fixes pass.
Checks: typecheck, the marketing build, the copy lint, links and anchors, the ContextHint
description on hover and focus, no sideways scroll. No backend audit.

## 7. Open handoff decisions

The commercial destination (form, contact or signup) does not exist. The downstream dashboard and
chat keep their own current labels. Whether `/` switches to V2 is the owner's call after review.
