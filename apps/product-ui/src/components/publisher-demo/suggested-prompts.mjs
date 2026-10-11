const defaults = [
  {label: 'Compare hardware wallets', question: 'Compare hardware wallets for Ethereum and Solana with offline key storage.', match: /hardware wallets?/i},
  {label: 'Explore developer tools', question: 'Recommend a developer tool to debug and build a TypeScript API.', match: /developer|typescript|debug|\bAPI\b/i},
];

export function suggestedPrompts(sampleQuestions = []) {
  return defaults.map(({label, question, match}) => ({label, question: sampleQuestions.find(value => match.test(value)) ?? question}));
}
