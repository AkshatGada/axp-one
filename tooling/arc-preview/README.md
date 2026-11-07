# AXP × Arc judge presentation

The `/arc/` opening page for the ETHGlobal Mumbai walkthrough. It uses AXP’s
shared PolySans fonts and Ultramarine foundation from `design-system/`, with
Prospectus presentation surfaces and illustrative Ledger product specimens.

The page includes:

- A concise advertiser → independent AI app → receipt → nanopayment story.
- A five-stage walkthrough with keyboard-operable tabs (arrows, Home and End).
- An illustrative Circle Gateway acceptance → Arc batch settlement diagram.
- The immutable first recorded run: 0.020 test USDC deposited, two 0.002 payments,
  0.004 batch-finalized, with its actual Arcscan transaction.
- Same-origin links to `/arc/publisher-demo/` and `/arc/advertiser-dashboard/`.
- The actual [Arc Studio project](https://studio.arc.io/app/0c07e997-5564-4b38-94f9-099ea3e95393),
  with sign-in/access expectations stated without promising public source access.

This presentation makes no API calls and cannot sign or move funds. Its diagrams
are explanatory; its proof ledger reads the sanitized recorded JSON under
`src/evidence/`. The linked shared Arc Testnet app is a separate interactive
frontend/backend. Current shared-demo activity is not included in the recorded
proof totals. Do not hardcode remaining placements on this page.

## Build and preview

Run from the repository root (the shared design-system assets are required):

```sh
npm ci --ignore-scripts --no-audit --no-fund --prefix tooling/arc-preview
npm run build --prefix tooling/arc-preview -- --base=/arc/
npm run dev --prefix tooling/arc-preview -- --port 3460 --strictPort --base=/arc/
```

Open `http://127.0.0.1:3460/arc/`. The root site build copies `dist` to `/arc/`;
local Vite serves the presentation only, so its same-origin app links require the
assembled site to work. All fonts are bundled locally; no remote font request is
made. The layout stacks on narrow screens and honors reduced-motion preferences.

The original Studio-derived evidence components remain in source for historical
reference. The presentation entry point is `src/App.tsx`. Arc Studio provenance
is retained in the footer and document metadata. No backend/payment code,
private state, environment files, or videos are packaged by this frontend build.
