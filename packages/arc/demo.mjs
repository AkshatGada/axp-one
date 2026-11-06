// Isolated local hackathon harness: actual Arc/Gateway, explicitly fixture
// buyer decisions and independent answer. Never reads .env or model API keys.
import {resolve} from 'node:path';
import {createProductService, PRESETS} from '../product/service.mjs';
export function createArcDemoService({stateDir = resolve('local-state/arc/product'),
  walletPath = resolve('local-state/arc/secrets/arc-wallet.json'), ...options} = {}) {
  const fixtureBuyer = async packet => {
    const score = (n, criteria) => ({type: 'score', score: n, confidence: 1,
      legend: Object.fromEntries(criteria.map((x, i) => [i, x])),
      probabilities: Object.fromEntries(criteria.map((_, i) => [i, i === n ? 1 : 0]))});
    const choice = Object.keys(packet.questions.creative.criteria)[0];
    return {model: packet.model, answers: {relevance: score(3, packet.questions.relevance.criteria), intent: score(3, packet.questions.intent.criteria),
      creative: {type: 'choice', choice, confidence: 1, probabilities: Object.fromEntries(Object.keys(packet.questions.creative.criteria).map(k => [k, k === choice ? 1 : 0]))}, sufficient: {type: 'noul', noul: 0.95}}, usage: {input_tokens: 0, output_tokens: 0}};
  };
  const service = createProductService({stateDir, runId: 'arc-mumbai-v1', financialMode: 'devnet',
    signingEnabled: false, paymentOptions: {identities: {payer: 'arc-demo-solana-disabled', payee: 'arc-demo-solana-disabled-publisher'}},
    arcEnabled: true, arcSigningEnabled: true, arcWalletPath: walletPath, transport: fixtureBuyer,
    organicTransport: async () => ({model: 'independent-fixture-answer', answer: 'For a TypeScript API, start with structured request logs and a request ID. Reproduce the failure with a small test, inspect the stack trace, and use a debugger to step through the failing handler. Compare tools by framework support, local debugging, trace visibility and pricing. This is a prepared independent answer for the Arc Testnet demonstration.'}),
    dailyModelCap: 16, ...options});
  const config = service.publisherConfig;
  service.publisherConfig = () => ({...config(), demonstration: {fixtureProviders: true, actualNetwork: 'arc-testnet'}});
  return service;
}
export async function prepareArcDemo(service) {
  let campaign = service.state().campaigns.find(c => c.settlementNetwork === 'arc-testnet');
  if (!campaign) {
    service.saveAccount({name: 'AXP · Arc Testnet demonstration', websiteURL: 'https://axp.one/'});
    const {id, label, exampleQuestion, ...draft} = PRESETS[0];
    campaign = service.saveCampaign({...draft, name: 'StackPilot · Arc Nanopayments', settlementNetwork: 'arc-testnet',
      maxBidBaseUnits: '2000', budgetCapBaseUnits: '8000', depositBaseUnits: '20000'}).campaign;
    service.approve(campaign.id);
  }
  if (['draft', 'opening'].includes(campaign.status)) {
    const result = await service.launch(campaign.id);
    if (result.campaign.status !== 'active') throw Object.assign(Error(result.paymentOperation?.reason ?? result.paymentOperation?.reasonCode ?? 'arc_funding_pending'), {code: 'arc_funding_pending'});
    campaign = result.campaign;
  }
  return campaign;
}
