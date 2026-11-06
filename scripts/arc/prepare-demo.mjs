import {createArcDemoService, prepareArcDemo} from '../../packages/arc/demo.mjs';
const service = createArcDemoService();
try {
  const campaign = await prepareArcDemo(service);
  console.log(JSON.stringify({campaignId: campaign.id, status: campaign.status, payment: campaign.payment,
    providers: 'fixture', network: 'actual Arc Testnet + Circle Gateway'}, null, 2));
} catch (error) {console.error(JSON.stringify({error: error.code ?? 'arc_prepare_blocked', message: 'Inspect private saved state; do not reset or repeat an unknown send.'})); process.exitCode = 1;}
finally {service.close();}
