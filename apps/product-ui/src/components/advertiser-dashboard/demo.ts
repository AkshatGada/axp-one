import { decimal, type Draft } from './model.ts';
/** Visible, editable fictional suggestions. These never save or launch by themselves. */
export const DEMO_ADVERTISER: Draft = {
  name: 'HarborKey launch', brandName: 'HarborKey', websiteURL: 'https://harborkey.example/',
  productDescription: 'HarborKey is a hardware wallet for Ethereum and Solana self-custody, with offline key storage and a physical signing device.',
  approvedText: 'Keep your keys offline with HarborKey. A hardware wallet for Ethereum and Solana self-custody.',
  contextHints: ['Consider comparisons of hardware wallets for Ethereum and Solana self-custody with offline key storage. Skip mobile-only software wallets.'],
  declaredCapabilities: ['crypto_storage', 'hardware_wallet', 'offline_key_storage', 'ethereum', 'solana'],
  maxBidBaseUnits: '4000', budgetCapBaseUnits: '16000', depositBaseUnits: '20000',
};
export function demoStepValues(suggestion: Draft = DEMO_ADVERTISER): Array<Record<string, string>> {
  return [
    {name: suggestion.name, brandName: suggestion.brandName, websiteURL: suggestion.websiteURL, productDescription: suggestion.productDescription},
    {contextHints: suggestion.contextHints.join('\n')},
    {approvedText: suggestion.approvedText},
    {maxBidBaseUnits: decimal(suggestion.maxBidBaseUnits), budgetCapBaseUnits: decimal(suggestion.budgetCapBaseUnits), depositBaseUnits: decimal(suggestion.depositBaseUnits)},
  ];
}
export const DEMO_STEP_VALUES = demoStepValues();
export function missingDemoValues(step: number, current: Record<string, string>, suggestion: Draft = DEMO_ADVERTISER): Record<string, string> {
  return Object.fromEntries(Object.entries(demoStepValues(suggestion)[step] ?? {}).filter(([key]) => !current[key]?.trim()));
}
export function isDemoAutofillKey(input: { enabled: boolean; key: string; shiftKey: boolean; step: number; name: string; value: string; type: string }): boolean {
  return input.enabled && input.key === 'Tab' && !input.shiftKey && !input.value.trim()
    && ['text', 'url', 'textarea'].includes(input.type) && input.name in (DEMO_STEP_VALUES[input.step] ?? {});
}
