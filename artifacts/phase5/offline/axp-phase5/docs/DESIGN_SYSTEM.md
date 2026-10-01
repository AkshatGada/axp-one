# Shared AXP neutral-steel design foundation

Transferred for continuity, not a new final frontend. Source is the existing
website motion redesign, not the older green/sage token variant.
Source CSS: /Users/akshat/axp-one-motion-redesign/styles/motion-redesign.css
at local commit 5c0ddb7. Source conceptual guidance: its docs/DESIGN_SYSTEM.md
and docs/TYPOGRAPHY_SYSTEM.md, originally based on the personal website system.
Historical sponsored-access copy and obsolete product instructions are not copied.

## Typography

- PolySans Wide Slim 300: display/page titles; Median Wide 500: restrained emphasis.
- PolySans Neutral 400 / Median 500: prose, forms, navigation and controls.
- PolySans Bulky 700: occasional strong emphasis, not every heading.
- PolySans Mono Neutral 400 / Median 500: amounts, transaction hashes, IDs/code.
- Font-display swap; system fallbacks; essential disclosure/status at least 14px.
  Large marketing scale is not imposed on dense tables. No substitute font pairing.

Local eight existing WOFF2 assets go under design-system/fonts, with explicit
source provenance. Use is requested by the owner for the same AXP domain. No
claim of a newly obtained license or third-party font redistribution permission.
Public release must retain appropriate existing font/site rights; not a blocker
for the user-requested local preparation.

## Colors and steel accents

Paper #f5f4f0; white #fffefa; ink #171b1f; muted #444d53;
steel #626c73; dark steel #37444b; silver #c8ccce; line #b9bec0;
mist #e7e9e9; dark stage #1b2226; dark line #677177.
These exact neutral values come from the motion-redesign CSS. No purple gradient,
green accent or fully chrome aesthetic. Steel appears in fine edges, occasional
matte panels and restrained illustration accents. No glossy metallic backgrounds.

Semantic statuses also need text/icon cues and contrast checks; don't turn a
financial status into unreadable silver text. Final specialist measures contrast.

## Spacing and layout

Preserve spacing ladder 0/4/8/12/16/24/32/48/64/80/120px. Gutter
clamp(20px,5.5vw,88px). Current motion page width 1520px; older personal-system
reference width 1320px. Tokens explicitly retain both: wide marketing/art stage
1520, content 1320. Section gap clamp(88px,11vw,160px) for marketing only.
Dashboard spacing uses the same ladder but compact page rhythm, not giant chapters.
Reference body 18px/1.52; dense secondary/table text 14–16px with adequate targets.

No decorative numbered eyebrows, dots before every title, repeated title/subtitle
stacks or fake terminal labels. Use labels only for actual state, role or action.

## Motion and ownership

Ease cubic-bezier(.2,.75,.25,1); subtle transitions and reduced-motion fallback.
Preserve the taste/reference, not old paywall animation narratives. The new
exchange story is opportunity -> competing bids -> disclosed card -> receipt ->
cumulative settlement. Actual demo receipts must not be replaced by animations
pretending to execute. Final animations/storyboards belong to frontend specialist.

Foundation files are shared tokens and font declarations only. No old page,
layout components, illustrations, SVG sprites or animation code copied. Main
builder will use them for basic reference forms; final marketing/product UI
remain separate clients as defined in REPOSITORY_MAP.md.
