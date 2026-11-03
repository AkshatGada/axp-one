# AXP × HSP / HSK Chain presentation

A desktop-first, browser-local concept demo for the HSK Chain Horizon Hackathon.
Uses AXP's PolySans / Ultramarine design system. Implemented and refined by OpenAI
Codex, including three GPT-6 Astra agents at high reasoning effort, at Akshat Gada's
request. No Claude attribution applies to this work.

Campaign approval → independent answer → buyer decisions → deterministic auction
→ Sponsored insertion/acknowledgement → HSP authorization → HSK evidence registry.
Each scene uses local interactions and finite/replayable animations. Presenter notes,
keyboard navigation, full-screen, optional auto-step and motion pause are available.
The presentation is marked as concept/example data. There are no API clients,
wallet connections, model calls or payment operations in these assets.

HSP is the payment service. HSK Chain / HashKey Chain is the blockchain. The actual
implementation branch targets HSP QA payments on chain 133 and a separate evidence
registry on HSK mainnet, chain 177. Generic HSK Chain labels in the conceptual
presentation do not establish live execution on either network. QA source payments
and mainnet evidence anchors remain distinct. Network deployment and live evidence
are still outstanding; see ../../docs/product/HSP.md.

Export into a new empty local-state directory:

    node scripts/hsp/export-presentation.mjs
    python3 -m http.server 8768 --bind 127.0.0.1 --directory local-state/hsk-hsp/presentation

Open http://127.0.0.1:8768. Use an alternate empty destination under local-state/hsk-hsp
as the script's optional first argument when preserving an earlier export. Exporting
copies source files and the three existing design-system fonts; it reads no secrets.

These assets are separate from the evidence-only static exporter, the local live
HSP server and axp.one production. The existing private Sites URL can host this
buildless output without a backend. Site sharing is independently controlled.
