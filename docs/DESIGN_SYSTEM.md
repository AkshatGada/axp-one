# Current AXP design system

Updated 7 October 2026. The source of truth is
`design-system/foundation/steel.css` and `design-system/foundation/fonts.css`.
[The component reference](frontend/DESIGN_SYSTEMS.md) describes Prospectus and
Ledger. Earlier neutral-steel explorations are historical, not the current palette.

## Identity and typography

Use the existing local **PolySans** fonts. Display type uses PolySans Wide
(Slim Wide 300, Neutral Wide 400, Median Wide 500). Body, forms and navigation
use PolySans Neutral 400 and Median 500; Bulky 700 is restrained emphasis.
PolySans Mono is for actual amounts, code, IDs and hashes. The eight WOFF2 files
are in `design-system/fonts`; public builds serve them from their own origin.
Retain the font provenance and existing owner rights; do not replace the pairing.

| Token | Current value | Purpose |
|---|---|---|
| `--brand` | `#2b3bff` | Ultramarine, primary actions and important outcomes |
| `--brand-deep` | `#1a26cf` | Pressed/hover and small brand text |
| `--paper` | `#f4f2ec` | Warm page background |
| `--white` | `#fbfaf6` | Raised sheets |
| `--ink` | `#0e1220` | Blue-black text |
| `--muted` | `#4c5266` | Secondary text |
| `--stage` | `#0a0e2a` | Deep ultramarine stage |
| `--contexthint` | `#f65a20` | ContextHint evidence only |

Solana purple `#9945FF` is reserved for Solana-specific presentation slides,
not a replacement for the website's Ultramarine identity. Steel-named tokens in
code are cool neutrals; they do not imply a metal/chrome design direction.

## Surfaces and interaction

`design-system/prospectus` owns editorial marketing, diagrams and `VideoFigure`.
`design-system/ledger` owns campaign controls, money states, forms, tables and
technical inspection. Both share foundation tokens and fonts. Reuse their existing
components. A landing figure may show a real product specimen; it does not create
a second product shell or mix both component systems across a page.

Spacing follows 0/4/8/12/16/24/32/48/64/80/120. The responsive gutter is
`clamp(20px,5.5vw,88px)`. Use compact rhythm for product pages and editorial rhythm
for marketing. Keep text concise and put detailed records behind explicit expansion.
Money states and provenance require text/shape cues as well as colour. Keep literal
Sponsored disclosure readable. Provide visible focus, labelled controls, keyboard
operation, reduced-motion alternatives and mobile layouts without horizontal overflow.

The publisher user view is a quiet chat; technical details open through **View
internals** after the ad result. Native outcomes must come from recorded server
state. Illustrative animation, original recorded evidence and live execution stay
clearly distinguishable. Avoid decorative terminal labels, unnecessary caption
walls, glossy chrome and invented component styles.
