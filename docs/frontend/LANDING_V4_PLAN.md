# Landing V4: an editorial feature, redesigned from first principles

Written 11 October 2026 by the orchestrator (story, art direction, foundation, seams, integration).
Local design version only: no push, no deployment, no backend, payment or evidence changes.
V1, V2 and V3.1 stay runnable at `/`, `/v2/`, `/v3/`. V4 builds in `apps/marketing/src/v10/` and is
served at `/v4/`. Tag when integrated and reviewed: `axp-landing-product-v4`.

## 1. First principles

**What is true and worth saying.** People have started asking AI apps what to buy, in full
sentences. A question carries more intent than any keyword ever did. axp.one is the advertising
network for that moment: an advertiser's agent judges whether the moment fits what the advertiser
offers; if it does, one labelled card appears below the app's own answer; the app earns; fixed
rules, not a model, decide the money.

**Who reads it.** A marketer deciding whether this is a place to advertise. A builder of an AI app
deciding whether ads can pay for answers without costing trust. Both arrive cold.

**What each must leave with.** One picture in the head (a labelled card below an answer, there only
when it fits), one reason to believe it is safe for them (the marketer: I set the terms; the
builder: my answer stays mine), and one door to walk through (dashboard; integration guide).

**What the page is.** An editorial feature, not a product page with sections. It reads like a
magazine essay with large plates: very large type, a strict grid, few words, and pictures that
move. Visuals and animation carry the story; words are headlines and captions.

## 2. What carries over, and what does not

Carries over (the foundation only): the colours in `design-system/foundation/steel.css` (warm
paper, blue-black ink, one electric ultramarine `#2b3bff`), and the PolySans family (Wide for
display, the text face for body, Bulky for the heaviest accents). Nothing else. Every layout,
component, specimen, motion and piece of chrome is new. V3's scenes are not to be restyled or
reused; builders should not open them for layout ideas.

Standing owner rules that still bind: positioning "The advertising network for the agentic
internet."; ContextHint appears only as a header link with the description "The intelligence
platform for running ChatGPT ads."; no trial, MVP, test, status or roadmap framing in the story or
buttons; nothing untrue (no customers, partners, performance, signup, real payouts); the Sponsored
card sits BELOW the answer; a receipt is an accepted charge and an accrual, never a payout; the one
proof link keeps its label "Solana Devnet, test USDC, 7 October 2026"; no provider names, code or
auction arithmetic; no orange, no purple; a large bold `axp.one` in the footer.

## 3. The story, as one piece

A single narrative in six movements. The spine is **one question, followed from the moment it is
asked**. Everything on the page is that question, its answer, and the one card.

| No. | Movement | The one thing it says | Form |
|---|---|---|---|
| 00 | Cover | What axp.one is | A cover: the headline and one living image |
| 01 | The shift | People used to search. Now they ask. A question says what a keyword never could | Kinetic typography |
| 02 | One question | Follow one question: asked, answered, judged, one card below, a receipt. And when nothing fits, nothing appears | The centrepiece: a scroll-driven film in five beats |
| 03 | For advertisers | You set the terms: describe, approve, limit, and see why | A spread of three large moving figures |
| 04 | For AI apps | Your answer stays yours: your model, one slot below, your rules, you earn | A spread around one large plate |
| 05 | The rule, and the doors | Agents judge fit. Fixed rules decide money. Then: start from your side | A manifesto on the page's one ultramarine spread, then two doors and the wordmark |

Pacing: about thirteen screens on a laptop. Movement 02 is the longest and the most cinematic.
Movements 01, 02 and 03 may hold the page (sticky stages) while the reader's scroll drives them;
each stage has a fixed budget (below) and must never feel like waiting. Movements 04 and 05 breathe.

## 4. The editorial system (new, frozen in `v10/v10.css` and `v10/kit/`)

- **Grid.** Twelve columns, the page gutter from the foundation, hairline rules that show the grid.
- **Type.** Display: PolySans Wide, light, very large (`x-mega`, `x-h1`, `x-h2`). Standfirst
  (`x-deck`). Body (`x-body`). Captions and folios (`x-cap`, `x-folio`). Numerals for chapter marks
  in PolySans Bulky. No monospace. Headlines are short and set tight.
- **Chapter furniture.** Every movement opens with a folio ("01") and a running title, like a
  magazine. Figures carry a small caption ("Fig. 3, illustration").
- **Colour.** Paper is the ground. Ink is the type. Ultramarine is the one accent: the card, the
  agent's judgment, the primary action, key words. Exactly one full-bleed ultramarine spread on the
  page (movement 05). The deep ultramarine "night" may be used for one plate if a builder needs a
  dark image, never as a section background.
- **The card.** One Sponsored card design for the whole page (`kit: Ad`), always labelled, always
  below the answer.
- **Motion.** Scroll-driven where the reader should control time (stages); short performances when a
  figure enters; type that moves by word and by line. One easing family. Transform and opacity only.
  With motion off, every movement is a complete, well composed still sequence. Phones tell the same
  story with real motion, not a fallback.
- **One switch language.** A rule is a square ink latch; a judgment is round and ultramarine.

## 5. Story data and truth rules (frozen in `v10/story.ts`)

One fictional advertiser (HarborKey, a hardware wallet), three fictional others, one fictional AI
app (Tidewater), one question. Rules: relevance and commercial intent are different things; a
campaign has only what its advertiser listed; outcomes are words, never scores, prices or
measurements; a receipt is not a payout; answer independence is stated as "In our integration, no
advertiser material reaches the answer path."; every figure is an illustration and says so once.

## 6. Components, owners, budgets

Frozen by the orchestrator before any builder starts: `v10/v10.css`, `v10/kit/`, `v10/story.ts`,
`v10/copy.ts`, `v10/shell/` (masthead, footer, seams), `app/v4/` (page and one lab route per
movement). The orchestrator also owns integration, the transitions between movements, page rhythm
and the only commits.

| Builder | Movement | Folder (the only place it writes) | Lab route | Stage budget |
|---|---|---|---|---|
| 1 | 00 Cover | `v10/cover/` | `/v4/lab/cover/` | one screen, no pin |
| 2 | 01 The shift | `v10/shift/` | `/v4/lab/shift/` | up to 220vh |
| 3 | 02 One question | `v10/film/` | `/v4/lab/film/` | up to 460vh |
| 4 | 03 For advertisers | `v10/advertiser/` | `/v4/lab/advertiser/` | up to 340vh, or unpinned |
| 5 | 04 For AI apps | `v10/apps/` | `/v4/lab/apps/` | about 1.4 screens, no pin required |
| 6 | 05 The rule, and the doors | `v10/rule/` | `/v4/lab/rule/` | about 2 screens |

Each builder receives the job, the constraints and the bar, and designs the composition, the
figures and the motion. Builders do not edit shared files or each other's folders, do not commit,
and keep a `NOTES.md` with decisions and requests.

## 7. Review

Per movement: captures at 1440x900, 1366x768, 1280x800 and 390x844; frame sequences of every
animation, opened and judged; reduced-motion stills; keyboard; abrupt arrival (never blank). The
orchestrator reviews each against its brief, with revision rounds as needed. Integrated: full
journey at the four sizes, the seams, one independent design review and one cold-reader and truth
review, one fixes pass, then the tag.

## 8. Open, for the owner

The commercial destination (form, contact, signup) still does not exist; buttons go to the existing
routes. Whether `/` becomes V4 is the owner's call after review.
