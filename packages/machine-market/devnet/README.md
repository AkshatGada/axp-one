# Explicit Devnet implementation

Implementation and offline verification only. See
[the handoff](../../../docs/machine-market/DEVNET_IMPLEMENTATION.md).

```js
import { createDevnetRunner } from './runner.mjs';
```

The runner requires a resolved pinned manifest, exact ELF/owned content, one private
journal path, resource measurements, scoped opaque capability set and action-time
gate. There is no existing-wallet reader or key generator. Defaults do not authorize
live signing. Test fixtures explicitly opt in and cannot use the approved live payer.

`node scripts/machine-market/devnet-runner.mjs --manifest-template` is read-only.
`--execute` is intentionally unavailable pending the next authorized key/gate phase.
Do not replace the original loopback adapter or reinterpret fixture results as Devnet
execution, network capacity or closure of the local exact-slot gaps.
