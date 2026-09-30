import { SyntheticPaymentAdapter } from '../../packages/payments/index.mjs';

const fixtureClock = 2000000000;
const adapter = new SyntheticPaymentAdapter({ now: () => fixtureClock });
const channelId = 'synthetic:channel-01';
const opened = adapter.open({ channelId, mode: 'synthetic', runId: 'c06-fixture-v1', advertiserId: 'adv-01',
  campaignVersionId: 'campaign-01', payer: 'synthetic:payer-01', payee: 'synthetic:pub-01', depositBaseUnits: '1000' });
const authorizations = ['100', '250'].map((amountBaseUnits, index) => adapter.authorizeCumulative({
  channelId, chargeId: `charge-00${index + 1}`, sequence: String(index + 1), amountBaseUnits, accepted: true,
}));
const closePlan = adapter.prepareClose({ channelId });
const settlement = adapter.confirmClose({ channelId, planId: closePlan.id });
process.stdout.write(`${JSON.stringify({ schemaVersion: 'axp.c06-smoke.v1', mode: 'synthetic',
  fixtureClockUnixSeconds: fixtureClock, sdkExecuted: false, walletKeyReads: 0, broadcasts: 0,
  opened, authorizations, closePlan, settlement, channel: adapter.getChannel(channelId) }, null, 2)}\n`);
