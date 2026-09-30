# Frozen first-slice runtime seam

Node installed v25.5.0 with node:sqlite. Native ES modules .mjs keep the first
slice dependency-free; .d.ts/JSON Schema/OpenAPI emitted by orchestrator as APIs
stabilize. No claim this is a supported production runtime deployment.

contracts/index.mjs exports ContractError(code/message/status), canonical, hash,
baseUnits, strictObject, validateCampaign, validateOpportunity, validateDecision,
computeBid, ownCampaign, signReceipt, verifyReceipt and constants. See fixtures.mjs.
Campaign monetary fields are explicit integer base-unit strings; payment adapter
adds pinned network/mint envelope. Time is integer epoch milliseconds.

Exchange builder implements Exchange in packages/exchange/index.mjs:
- constructor({dbPath=':memory:',runId,mode='synthetic',now=Date.now})
- registerPublisher({publisherId,publisherKeyId,publicKeyPEM,payee})
- createChannel({channelId,advertiserId,publisherId,payee,depositBaseUnits,mode})
  creates ONLY synthetic channels; real adapter gate stays separate.
- createCampaign(campaign); pauseCampaign(campaignId)
- createOpportunity(input,{idempotencyKey}) => persisted opportunity with id
- eligibleCampaigns(opportunityId) => {eligible,excluded}; never money to model
- runAuction(opportunityId,decisions) => {status,award?,bids,rejections}
- acceptDelivery({receipt,signature}) => existing/new {delivery,charge}
- failAward(awardId); expireAwards(); authorizeSynthetic(channelId)
- closeSynthetic(channelId); report(); close()

For class API variations document explicitly in build report; do not mutate
shared contracts. Persistent SQLite ledger, no locks over model calls. Report
contains sanitized campaigns/channels/opportunities/awards/charges/events; no
render capabilities, private signatures/keys. Award may return private render
capability only in local trusted HTTP response, not report.

Receipt bytes frozen with domain separator AXP.delivery.v1 plus canonical JSON.
Model scores/level meanings, signature semantics and proof limitations remain
in component specs. Use injected now() for expiry/restart fixtures.
