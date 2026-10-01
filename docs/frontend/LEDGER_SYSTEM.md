# Ledger v2: the axp.one product system

Dashboard-grade system for the MVP explorer (`apps/product-ui`). Built on the shared Steel foundation with the
ultramarine identity (`design-system/foundation/steel.css`). The landing page keeps Prospectus; never mix them.
Live reference: `/design/` (every component with real run data). v1 is archived at `/design/v1/`.

Code: `design-system/ledger/v2.css` (tokens + classes, scoped to `.ld`), `design-system/ledger/v2.tsx` and
`v2-client.tsx` (components, imported as `import { Ld } from "@axp/design-system/ledger"`).

## 1. Principles
1. Functional first: screens are working surfaces (tables, charts, panels). Narrative lives in Prospectus and Present.
2. One live colour: ultramarine marks interactive, selected and winning. Data text stays ink.
3. Every value has a source: provenance pills on anything a reader might over-read.
4. Detail on demand: raw records, hashes and paths open in the inspector, not in the main view.
5. Truth over polish: recorded timings stay recorded; no spinners, count-ups or thinking text; two clocks never share an axis.
6. Readable at 1440 x 900: body 14, labels 12, nothing essential under 12; tabular figures for every number.

## 2. Colour roles (use the role, never the hex)
| Role | Token | Value |
|---|---|---|
| Canvas | `--ld-canvas` | #f6f5f1 |
| Panel | `--ld-panel` | #ffffff |
| Sunken (table headers, wells) | `--ld-sunken` | #f1f0ec |
| Hover | `--ld-hover` | #f3f3f6 |
| Selected | `--ld-selected` | brand wash #e7e9ff |
| Text primary / secondary / tertiary | `--ld-text`, `--ld-text-2`, `--ld-text-3` | #0e1220, #4c5266, #6e7488 |
| Border / strong border | `--ld-border`, `--ld-border-2` | #e3e3e8, #cfd0d8 |
| Accent (interactive, live) | `--ld-accent`, `--ld-accent-hover`, `--ld-accent-wash`, `--ld-accent-line` | #2b3bff, #1a26cf, #e7e9ff, #b9c0ff |
| Success / warning / danger / neutral | `--ld-success`, `--ld-warning`, `--ld-danger`, `--ld-neutral` (+ `-wash`) | #1f7a55, #8a5a00, #b3261e, #555b70 |
| ContextHint evidence only | `--ld-ch`, `--ld-ch-text`, `--ld-ch-wash` | #f65a20, #b23d0f, #fff0e8 |
| Present stage | `--stage`, `--stage-brand` (foundation) | #0a0e2a, #6573ff |

Semantic colours are for state only, always with a word, never a series colour, never the accent.

## 3. Typography (PolySans only, sentence case)
| Name | Class | Font | Size / line | Tracking | Use |
|---|---|---|---|---|---|
| Hero number | `ld-hero-num` | Wide 400 | 44 / 1.05 | -3% | One per screen at most |
| KPI number | `ld-kpi-num` | Wide 400 | 28 / 1.1 | -2% | Stat tiles |
| Page title | `ld-page-title` | Median 500 | 24 / 1.25 | -1.2% | One per page |
| Section title | `ld-section-title` | Median 500 | 18 / 1.35 | -0.6% | Groups of panels |
| Card title | `ld-card-title` | Median 500 | 15 / 1.4 | 0 | Panel headers |
| Body | `ld-body` | Neutral 400 | 14 / 1.5 | 0 | Default |
| Secondary | `ld-secondary` | Neutral 400 | 13 / 1.45 | 0 | Supporting text |
| Label | `ld-label` | Median 500 | 12 / 1.35 | 0 | Field and column labels |
| Caption | `ld-caption` | Neutral 400 | 12 / 1.4 | 0 | Axis text, notes |
| Mono | `ld-mono` | Mono 400 | 12.5 / 1.4 | -1% | Hashes, IDs, raw values ONLY |

Numbers are PolySans with tabular figures (`font-variant-numeric: tabular-nums`), not mono. No uppercase label walls.

## 4. Spacing and layout
- 4 px base: `--ld-1..16` = 4, 8, 12, 16, 20, 24, 32, 40, 48, 64.
- Shell: top bar 52 (`--ld-top-h`), sidebar 240 (`--ld-side-w`), content max 1,360 (`--ld-content-max`), main padding 20/28.
- Panels: 16 padding (`--ld-panel-pad`), 16 gap (`--ld-gap`); table cells 10 x 12.
- Under 900 px: sidebar becomes a horizontal scroller, grids stack to one column, inspector becomes a bottom sheet. No horizontal page scroll at 390.

## 5. Shape and elevation
- Radius: 4 (`--ld-r-xs`, keys and tiny tags), 6 (`--ld-r-sm`, controls), 10 (`--ld-r-md`, cards, panels, menus), 14 (`--ld-r-lg`, drawers, modals, chat specimen), full (pills).
- Every surface has a 1 px border. Shadows: `--ld-shadow-1` resting panel, `--ld-shadow-2` raised card, `--ld-shadow-3` menus, drawers, modals.

## 6. Components (all in `/design/`)
Buttons (primary, secondary, ghost, danger; 28/32/40; hover, focus, disabled), form controls (input, textarea, select,
toggle, checkbox, field with hint/error), tabs, segmented control, top bar with run switcher, side nav (sections, counts,
active, nested opportunities with short names), breadcrumbs, page bar, KPI tiles (label, number, context, chip, sparkline,
live tile), panels (title, subtitle, actions, footer), data tables (sticky sunken header, sortable look, hover, selected
row, numeric alignment, tag cells, progress cells), tags and status pills, provenance pills, money-state marks, tooltip,
popover, modal, inspector drawer, empty state, no-fill note, toasts, keyboard keys, pipeline stepper, score ruler, bid
bar chart, cumulative step chart, sparkline, progress meter, activity swimlane chart, event timeline, channel balance
bar, chat specimen with Sponsored card, receipt card with live checks, evidence card with similarity bar, campaign header.

Glyphs: no icon set. Allowed: provenance glyphs, ✓ and ✕ in status, → for navigation, ▾ for menus, keyboard keys.

## 7. Data visualization
- One question per chart; the same values also appear as labels or in a table.
- One axis from zero; never dual axes. Money (test USDC) and fees (lamports) are separate charts.
- Emphasis = ultramarine (`--ld-chart-1`) for the selected or winning mark; everything else `--ld-chart-context`.
  The only second hue is ContextHint vermillion, reserved for evidence series. Validated: #2b3bff vs #f65a20 passes
  lightness, chroma, CVD separation (ΔE 34.8 protan) and contrast on the light surface.
- Thin marks: bars 16 px with a 4 px rounded end, lines 2 px, markers 8 to 12 px with a 2 px surface ring, 1 px solid grid.
- Label sparingly; text never wears the series colour. Every mark has a hover title.
- Time: exchange clock and sandbox chain clock never share an axis; idle gaps are broken and labelled.

## 8. Motion
- 120 ms hover and press, 180 ms toggles and tabs, 220 ms drawers, stepper progression, chart reveal, card into slot.
- One easing curve `--ld-ease`. Reduced motion: everything instant. Motion explains the interface; it never imitates execution.

## 9. Present mode
- 1920 x 1080 stage scaled to the window; product surfaces at 1.25x; caption bar 120 px on `--stage` (ultramarine night),
  22 px captions, beat ticks in `--stage-brand`. Keyboard driven, autoplay with `?auto=1`, captions to SRT via
  `scripts/beats-to-srt.mjs`.

## 10. Copy rules (unchanged)
No em or en dashes in copy; sentence case; real values only; mandated lines kept verbatim
("Agent said bid. Exchange did not admit it.", "One observation per arm; not a measured lift.",
"Observed historical reference, not an AXP advertiser", the receipt caveat, the two-clock banner, the no-fill note).
