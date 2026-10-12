export const accountViews = ['overview', 'advertiser', 'app', 'wallet', 'settings'] as const;
export type AccountView = typeof accountViews[number];

const sections: Readonly<Record<string, AccountView>> = {
  'advertiser-profile': 'advertiser', 'owned-campaigns': 'advertiser',
  'campaign-editor': 'advertiser', 'campaign-preview': 'advertiser',
  'campaign-approve': 'advertiser', 'campaign-serving': 'advertiser', 'campaign-activity': 'advertiser',
  'ai-apps': 'app', 'app-credentials': 'app', 'app-integrate': 'app', 'app-readiness': 'app', 'app-report': 'app',
  'own-wallet-funding': 'wallet',
  'personal-profile': 'settings', 'organizations': 'settings', 'account-readiness': 'settings',
};

// A saved section link must mount its owning view before the browser can scroll
// to it. Unknown fragments neither redirect nor change an already selected view.
export function accountViewForFragment(fragment: string): AccountView | null {
  if (!fragment.startsWith('#')) return null;
  const name = fragment.slice(1);
  if ((accountViews as readonly string[]).includes(name)) return name as AccountView;
  return Object.hasOwn(sections, name) ? sections[name] : null;
}
