# axp.one design systems

> **Current identity, confirmed 2026-10-07:** the identity is **ULTRAMARINE**.
> Warm paper `#f4f2ec`, blue-biased ink `#0e1220`, and ONE electric ultramarine `--brand #2b3bff`
> (deep `#1a26cf`, wash `#e7e9ff`, on-stage `#6573ff`). The dark stage is a deep ultramarine night
> `#0a0e2a`, not grey. Ultramarine is used the way ContextHint uses its vermillion: bold, big, only where
> the story peaks (winning bid, route, Sponsored frame, key numbers, primary action, wordmark dot, emphasis).
> ContextHint keeps its own vermillion `--contexthint #f65a20`, only in its section and where its evidence
> enters an AXP decision (orange turns into ultramarine). Money states: reserved dashed brand, accepted brand
> hatch, authorized brand solid, settled ink. **Wordmark is lowercase `axp.one`** (and the brand name is
> written `axp` in UI chrome). Textured metal was explored and rejected; no metal, no chrome, no gradients
> except the functional orange-to-ultramarine evidence handoff. Steel token names remain as cool neutrals.


Two design systems on one shared foundation, the same pattern ContextHint uses
(editorial landing system + product system sharing tokens). Owner direction:
the personal-site typography and spacing taste, warm paper, blue-biased ink,
and ultramarine emphasis. ContextHint evidence uses orange. No gloss or chrome
surfaces, decorative icon sets, or numbered eyebrows. Light paper with one dark stage.
Solana purple is reserved for Solana-specific presentation slides.

```
design-system/
  foundation/   STEEL      shared tokens: colour, type families, spacing, motion, provenance, money states
  prospectus/   PROSPECTUS landing-page system (apps/marketing)
  ledger/       LEDGER     MVP / product system (apps/product-ui)
```

Never mix Prospectus and Ledger on one page. One sanctioned crossing: the
landing page may embed a Ledger *specimen* (a real Sponsored card, a receipt)
inside a Prospectus figure frame, because it is showing the product itself.

---

## 1. STEEL foundation (shared)

### Colour

| Token | Value | Role |
|---|---|---|
| `--brand` | #2b3bff | primary action and emphasis |
| `--brand-deep` | #1a26cf | strong brand |
| `--brand-wash` | #e7e9ff | quiet brand fill |
| `--contexthint` | #f65a20 | ContextHint evidence |
| `--paper` | #f4f2ec | page |
| `--paper-2` | #ecebe4 | sunk band, wells |
| `--white` | #fbfaf6 | raised sheet |
| `--ink` | #0e1220 | primary text, solid buttons, settled money |
| `--muted` | #4c5266 | secondary text (AA on paper) |
| `--steel` | #5a6178 | neutral labels and secondary data |
| `--steel-dark` | #2f3550 | strong neutral |
| `--silver` | #c3c6d2 | hatch, disabled fill |
| `--line` | #c9cad3 | hairlines |
| `--mist` | #e9e9ef | quiet fills |
| `--stage` | #0a0e2a | the one matte dark stage |
| `--stage-2` | #111743 | raised surface on stage |
| `--stage-line` | #3a4385 | hairline on stage |
| `--stage-ink` | #eef0ff | text on stage |
| `--stage-muted` | #9aa2d9 | secondary text on stage |
| `--focus` | #2b3bff | focus ring |

Steel is never a background fill larger than a chip, except the stage.
Emphasis inside prose uses ultramarine (`em { font-style: normal; color: var(--brand) }`), never italics.

### Type families (PolySans only, 8 local files, no italics)

- `--font-display`: PolySans Wide (SlimWide 300 for display, NeutralWide 400, MedianWide 500).
- `--font-body`: PolySans (Neutral 400, Median 500, Bulky 700 rarely).
- `--font-mono`: PolySans Mono (Neutral 400, Median 500). **Only real data**: amounts, hashes, IDs, timings, model names. Never for decoration or labels.

### Spacing, widths, radii, shadow

- Ladder 0/4/8/12/16/24/32/48/64/80/120 (`--space-*`).
- Gutter `clamp(20px,5.5vw,88px)`; wide stage 1520; content 1320; prose 64ch.
- Radii: 0 by default (square, editorial). `--radius-s` 4px for chips/inputs only.
  The Sponsored card inside a host chat frame uses the host's own radius (it is a specimen of a third-party UI).
- Shadow: flat hard offset only, `--shadow-offset: 9px 9px 0 #d0d5d5`; no blur shadows on paper.

### Motion

- One curve: `--ease: cubic-bezier(.2,.75,.25,1)`; `--ease-out: cubic-bezier(.16,1,.3,1)` for entrances.
- Durations: `--d-micro` 120ms, `--d-ui` 220ms, `--d-move` 420ms, `--d-scene` beats of 600–900ms.
- Grammar: cause, then effect. Anticipation, travel along a route, contact, settle. Never fake execution: a moving token in an animation is labelled Illustrative; real values come from the run.
- `prefers-reduced-motion`: every scene has a still poster with the same information.

### Provenance (the truth contract, made visual)

Every claim, number and object in either system carries a provenance mark: a
small glyph + a plain word. Glyph shape carries meaning so it works in mono print,
video compression and for colour-blind viewers. Colour is ink/steel only.

| Kind | Glyph | Word | Meaning |
|---|---|---|---|
| `actual` | solid square ■ | Actual output | Real Jev or app-agent response in the recorded run |
| `observed` | solid circle ● | Observed | Historical ContextHint observation (prompt, creative) |
| `inferred` | half circle ◐ | Inferred | ContextHint hypothesis (hint), not a fact or setting |
| `fictional` | open square □ | Fictional | Declared by a fictional advertiser for the demo |
| `policy` | diamond ◆ | Policy | Deterministic exchange rule (eligibility, cap, tie-break, no-fill) |
| `settled` | solid ink bar ▬ | Settled | Finalized settlement on the labelled network |
| `synthetic` | dashed square ⬚ | Synthetic | Laboratory or layout fixture, never acceptance |
| `replay` | ring ◎ | Recorded replay | Read-only presentation of the saved run |
| `illustrative` | open triangle △ | Illustrative | Marketing explanation, not a recorded event |
| `vision` | dotted outline ⋯ | Planned | Future capability, not demonstrated |

### Money states (Ledger uses these; Prospectus may show them in specimens)

Distinguished by fill pattern + word, never colour alone:
`deposit` outlined bar, `reserved` dashed fill, `accepted` brand hatch, `authorized` brand solid,
`settled` ink solid, `refunded` paper with ink outline + return arrow, `pending` / `unknown`
dotted outline with the word, never shown as settled. Amounts render in mono as test USDC with
six-decimal base units available on inspect (e.g. `0.004 USDC` / `4000`).

---

## 2. PROSPECTUS: the landing-page system

Register: an editorial prospectus for a new market. Big, quiet, confident,
cinematic. Image-led through bespoke diagrams and real specimens, not screenshots.
Lots of motion, scroll-driven and choreographed (overrides product motion restraint),
always with stills.

- **Type scale** (fluid): `display-xxl` clamp(72px,12vw,184px)/.88/-.04em Wide 300;
  `display-xl` clamp(56px,8vw,128px)/.9; `h1` clamp(44px,5.8vw,88px)/.98; `h2` clamp(32px,3.6vw,56px)/1.0;
  `h3` 28/1.12 Wide 400; `lead` clamp(20px,2vw,28px)/1.35 -.018em max 32ch; `body` 18/1.52 max 64ch;
  `small` 15/1.45; `caption` 13/1.4 PolySans 500 tracking .02em; `figure-num` mono only when it is a real number.
- **Layout**: 1520 stage; asymmetric 2-col grids (.86/1.14, .74/1.26); sections separated by a 1px rule and
  `--section-y`; generous whitespace; one dark stage section per page (the exchange).
- **Components**: SiteHeader (76px, rule below, status chip "Hackathon MVP"), Hero, Section, Rule, SplitGrid,
  Figure (top bar title + provenance word, figcaption, Pause/Replay text controls), Scene (scroll-pinned stage),
  BigStat (number + label + provenance + source line), StatGrid, RoleRail (five roles), FlowRoute (dashed steel
  route with travelling marker), Quote/Claim, NowNext (demonstrated vs planned columns), SourceNote, CTA
  (square ink button, 50px+, wide arrow gap; secondary text link with underline), Footer.
- **Signatures**: the five-role exchange scene on the dark stage; the provenance glyph legend as a design
  element; real specimens (the actual Sponsored card, the actual receipt) set like exhibits.

---

## 3. LEDGER: the MVP system

Register: an instrument. Precise, calm, dense where needed, every value inspectable.
Reads like a well-set financial document crossed with a flight recorder.

- **Type scale** (fixed): `title` 40/1.0 Wide 300; `h1` 28/1.1 Wide 400; `h2` 20/1.2 PolySans 500;
  `h3` 16/1.3 PolySans 500; `body` 16/1.5; `body-sm` 14/1.45; `label` 13/1.3 PolySans 500 (+.02em);
  `data` mono 15/1.3 tabular; `data-sm` mono 13; essential disclosure and status text never under 14px.
- **Layout**: app frame with left run spine (the four opportunities + settlement), main canvas, right
  inspector drawer. Desktop-first 1280–1600; readable at 1440x900 and 1280x800 for recording.
- **Components**: AppFrame, RunSpine (timeline of turns/events), ProvenanceTag, Amount, Hash (truncate +
  copy + inspect), MoneyState, Stat, KeyValue list, DataTable (hairline rows, no zebra), Inspector (raw JSON +
  hashes, collapsible), Tabs, Segmented control, Button (ink solid / outline / text), Callout (limits/claims).
  Domain specimens: **HostChat** (publisher app chat: user message, organic answer, separate Sponsored card),
  **SponsoredCard** (Sponsored label, approved text, fictional advertiser footer), **EvidencePacket**
  (observed prompt -> creative -> inferred hint, method vector/lexical fallback, similarity), **DecisionCard**
  (campaign, arm baseline/history, bid/skip, relevance + intent levels, timing, tokens), **ArmDiff**
  (baseline vs history changes), **AuctionBoard** (bids, tie-break rule, exclusions, winner, reservation),
  **Receipt** (signed receipt fields, receipt hash, charge), **ChannelMeter** (deposit, cumulative
  authorizations, payout, refund), **LedgerTimeline** (event sequence), **CampaignSheet** (declared
  capabilities, hints, caps, version, approval).
- **Present mode**: same components at 1.25x scale, one idea per screen, keyboard driven, captions bar,
  suitable for the recorded video and for judges clicking through.
