# Connected agent-access research MVP — phase plan

28 October 2026. Local source/experiment phase authorized by the user's request to
get started without production hardening. This is distinct from the terminal
Devnet run and its 1.40 test SOL authorization. No additional Devnet/mainnet,
external credentials, provider calls, deployment or push is included.

## Read-only prior-work review

- `axp-agent-ad-experiments/protocol/src/exchange.mjs`, `agent-adapter.mjs`,
  `mcp-server.mjs` and `docs/PUBLISHER_WEBMCP_DIRECT_DEVNET_2026-10-11.md`:
  reuse the request/offer/consent/funding/grant/retrieval separation, fixed beneficiary
  and resource-version binding, explicit sponsorship, negative/insufficient opinion
  without a funding penalty, and same-operation replay. Do not import hosted origins,
  API keys, wallet credentials or prior x402/Devnet allowances. Their original
  exact-string examination is not semantic-comprehension evidence.
- `agentic-dsp/docs/research/AGENT_FACING_ADS_RESEARCH_AND_WEBMCP_HANDOFF.md`:
  keep source selection independent, sponsor packet immutable/separate, source bytes
  unchanged, and payment distinct from attention, comprehension and endorsement.
- `axp-pitch/docs/evolution/cloudflare-integration/README.md`: its routing/managed
  integration is a thesis, not exercised infrastructure. No managed Cloudflare claim.
- `cloudflare/browser-run-kitesurf-trial/README.md`: browser REST/MCP trial lessons
  only. No token, REST call, hosted browser, Worker or credential is reused.
- `agentic-web` is not needed for this bounded implementation; no additional corpus
  or citation export is planned. All earlier repositories stay read-only.

## Reuse, adapt, new

**Reuse:** pinned installed loopback validator and reviewed SBF program; native
price-time book, W2 authorization/domain, store/outbox, transaction verification,
observer, source/delivery coordinator and `/api/trading` contracts. Preserve all
terminal ledgers/journals/results, Packet03 and f68fe83/60bd67b.

**Adapt:** the existing validator supervision/resource/listener checks to a NEW
ledger and new ports. Use the native service through an actual localhost API, with
owned disposable local fixtures and a finite host-side workflow. No new trading
algorithm, generalized signer/agent platform, custody or production infrastructure.

**New:** one small localhost screen and deterministic agent policy for one owned
controlled JSON report. The agent selects that resource from declared required
fields before considering sponsorship, discovers a fixed AXP price/offer, chooses
direct payment or explicitly accepts the disclosed packet, and derives a small
answer only from delivered content. It is labeled scripted policy, not model/provider
reasoning. Transport is local HTTP; no MCP/WebMCP integration is claimed.

The screen displays request, offer and funding choice, actual delivered content,
separate Sponsored packet, beneficiary/resource-version/expiry, native receipt and
publisher/refund deltas. It never labels a saved Devnet record, scripted bank or
historical `/api/market` simulator as live. Actual mode requires verified local
validator/program identity and real native receipt/account observations.

## Declared distinct LOCAL experiment

Run ID: `agent-access-local-20261028`. New private run and ledger under ignored
`local-state/machine-market/agent-access-local-20261028/`; no reset/overwrite of any
old directory. RPC `http://127.0.0.1:20899`, websocket port 20900, faucet port 20911,
gossip 20000 and dynamic range 20001–20050. UI/native service origin
`http://127.0.0.1:20990`. Verify every validator TCP/UDP socket is literal loopback
before any fixture funding. No simultaneous owned validator/heavy work.

One resource/version, one issuer, one active buyer, one sponsor and one collector.
The fixed ABI's unused second-buyer public identity is not an additional active
buyer. Use five disposable LOCAL role keypairs (operator/issuer/buyer/sponsor/collector)
plus validator-owned local identity/faucet/vote files. Program and unused-role public
IDs need no external credential. Keys stay owner-only in ignored state; never printed.

One Series with four Units, price **10,000 LOCAL lamports** each:

1. direct success: actual body, issuer 9,900 + collector 100;
2. sponsored success: same body hash, separate Sponsored packet, explicit consent
   with a scripted unfavorable assessment, issuer 9,900 + collector 100;
3. direct admitted source failure: no body; original 10,000 face refunded to buyer;
4. sponsored admitted source failure: no body; original face refunded to sponsor;
   campaign spend remains consumed rather than replenished by refund.

Existing price-time/maker-price matching remains. Direct bids select the declared
compatible exact Unit; sponsored access retains fixed-price provenance. Distinct
rights prevent success/refund paths from being represented by one reused Unit.

### Finite financial/resource ceilings

- **Five one-shot local faucet requests**, total exactly **0.216 LOCAL test SOL**:
  operator 0.200, issuer/buyer/sponsor 0.005 each, collector 0.001. Ceiling 0.25 total.
  Unknown funding consumes its intent and halts expansion; no silent repeat airdrop.
- Planned program transactions: Init + one Series + four registrations + four Funds
  + four Starts + four terminals = **18**. Including funding, planned attempts **23**;
  hard ceiling **32 total attempts**, with at most 27 program signing slots.
- Max native principal **40,000 lamports**; direct buyer/sponsor ceilings **20,000
  each**. Sponsor mandate: 20,000 budget, 10,000 per grant, at most two grants.
- Operating fee reserve <=**1,600,000 lamports** total, <=**50,000 per transaction**;
  application rent <=**80,000,000 lamports**. Preserve exact signed bytes, held
  liabilities and original outcomes. No fresh signature substitutes for an unknown.
- At most **32 W2 authorization identities**; replay uses original signed envelopes.
- New ledger <=**6 GiB**, supervisor stop at 5.5 GiB; unchanged whole task <=**20 GiB**,
  app DB/logs <=**50 MiB**, actual Mac free >=**40 GB**. Initial observed task size
  7,982,485,504 bytes and free 147,859,382,272, leaving room for this one ledger.
- No installs/builds planned. Heavy execution serial, max 20-minute owned execution
  window, no idle validator while planning. Stop owned runtimes after walkthrough.

The local faucet has no public value and is not the user's funded Devnet wallet.
Its receipts and native transfers must still be checked exactly. Native grant
expiry uses a single fresh declared application window; no extension after funding.

## Concrete acceptance criteria

1. Request → independently selected offer → direct choice → real native Fund/Start/
   Finalize → actual controlled content and publisher/collector payout.
2. Explicit Sponsored choice → immutable disclosed packet, negative assessment
   allowed → real sponsored native success → identical source bytes and correct payout.
3. Both admitted failure alternatives refund the original face to buyer/sponsor,
   produce no protected body and do not replenish sponsored allowance.
4. Same-operation retrieval returns exact committed bytes with no second payment;
   wrong owner cannot retrieve. Grants bind buyer, Series/resource version and expiry.
5. Small screen walkthrough displays actual backend/chain state and marks scripted
   agent reasoning accurately. Targeted changed-code checks only; no timing campaign,
   algorithm comparison or exhaustive faults. Prior local 38/40 timing status stays.

## Prerequisites and execution boundary

Before start: verify installed validator SHA256
`1f135bb21bdd50df55e92f5254120e02e7e7118d428e668270ba8b98acf13dbf`, ELF SHA256
`3335158a895ac7f483c9cbbcc4470e95e65098c54c7da1b7be4733b0594fea1a`, available
ports, fresh directory and resource envelope. Prepare code first, then start the
new validator, check all listeners and real genesis/ELF/authority before funding.
Use only global fetch to the pinned literal loopback RPC in actual mode.

Proceed with implementation and this declared local experiment when prerequisites
are available. A required process/listener permission will be requested through the
normal action-time tool mechanism with its exact reason. Incompatible prerequisites
stop execution; no policy bypass, deletion of old state or new audit gate is implied.
Record actual outcomes, precise evidence levels, start/inspect/stop commands, hashes,
resources and local commits, then stop for root review.
