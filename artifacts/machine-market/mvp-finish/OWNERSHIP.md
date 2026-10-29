# Scoped ownership audit

Base: `0faa13e`. This phase owns the native CLI/client/recorded inspector, additive
native service projections, the focused integration test and public fixture trace,
current runbook/status/acceptance and the three native package scripts.

`package.json` already contained uncommitted historical `build:market`, synthetic
`demo:market` and broad `test:market` changes. The task intentionally replaces
`demo:market` with recorded-native inspection. Only `market`, native `demo:market`
and `test:market:mvp` are staged; inherited `build:market`/`test:market` remain in
the working copy and outside the index. No synthetic build/server dependency is
silently committed.

Inherited marketing CSS is unrelated and remains unstaged. The untracked browser
`apps/product-ui/src/{app,components}/market/`, old synthetic API/core/client/agent,
legacy scripts and tests, CONTRACT/LOCAL_RUNBOOK/DEVNET_PLAN_DRAFT and devnet-preflight
directory remain preserved and excluded. No blanket add was used.

Frozen Packet03, original native acceptance, completed Devnet result/verification,
trading/outbox/delivery settlement implementations and Rust processor were compared
by hash to the base and remain unchanged. No original private journal or wallet was
opened for mutation. The six HTTP reads use a temporary fixture store/listener that
closes after the test; the real funded run stays terminal.
