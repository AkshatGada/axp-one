'use client';
// Two products share this site and must never be mistaken for each other:
// the public shared demo (fictional example campaigns, no sign in) and the
// person's own account. These pieces name the mode on every surface.
import { useEffect, useState } from 'react';
import { Ld } from '@axp/design-system/ledger';

/** One name per destination, used on every surface. */
export const destinations = {
  demoDashboard: { href: '/advertiser-dashboard/', label: 'Demo dashboard' },
  exampleChat: { href: '/publisher-demo/', label: 'Example chat' },
  sdkGuide: { href: '/publisher-demo/integration/', label: 'SDK guide' },
  account: { href: '/account/', label: 'Your account' },
  yourCampaigns: { href: '/account/#advertiser', label: 'Your campaigns' },
  yourApps: { href: '/account/#app', label: 'Your AI apps' },
} as const;

export type Presence = { state: 'unknown' | 'signed-out' | 'signed-in'; name?: string };

/**
 * Whether the visitor has an account session, for wording only. One read of the
 * existing session route. Every failure (401, no account service, network) is
 * treated as signed out; demo data is never presented as account data.
 */
export function useAccountPresence(): Presence {
  const [presence, setPresence] = useState<Presence>({ state: 'unknown' });
  useEffect(() => {
    let active = true;
    fetch('/api/accounts/session', { credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' } })
      .then(response => response.ok ? response.json() : null)
      .then(value => {
        if (!active) return;
        const user = value?.authenticated === true && value.user && typeof value.user === 'object' ? value.user : null;
        const name = user ? [user.displayName, user.email].find(entry => typeof entry === 'string' && entry.trim()) : undefined;
        setPresence(user ? { state: 'signed-in', name: typeof name === 'string' ? name.slice(0, 80) : undefined } : { state: 'signed-out' });
      })
      .catch(() => { if (active) setPresence({ state: 'signed-out' }); });
    return () => { active = false; };
  }, []);
  return presence;
}

export function DemoContext() {
  if(process.env.NEXT_PUBLIC_AXP_HSP_DEMO==='1')return <Ld.Context kind="demo" label="Isolated HSP demo" detail="Local operator · QA payments" />;
  return <Ld.Context kind="demo" label="Shared demo" detail="Public example data" />;
}

/** The sentence that stops demo campaigns being mistaken for the visitor's own, with the way out. */
export function DemoNotice({ presence, subject = 'campaigns' }: { presence: Presence; subject?: string }) {
  if(process.env.NEXT_PUBLIC_AXP_HSP_DEMO==='1')return <Ld.Notice tone="demo" title="Isolated hackathon workspace">These fictional campaigns are separate from production accounts and payment channels.</Ld.Notice>;
  const signedIn = presence.state === 'signed-in';
  return <Ld.Notice tone="demo" title={`You are viewing the shared demo. These ${subject} are public examples, not yours.`}
    actions={signedIn
      ? <Ld.Button variant="secondary" href={destinations.yourCampaigns.href}>Go to your campaigns →</Ld.Button>
      : <><Ld.Button variant="secondary" href={destinations.account.href}>Sign in</Ld.Button><Ld.Button variant="ghost" href={"/account/#create"}>Create your account</Ld.Button></>}>
    {signedIn
      ? `Anyone can see and change them. ${presence.name ? `You are signed in as ${presence.name}. ` : ''}Your own campaigns are in your account.`
      : 'Anyone can see and change them. Sign in to create campaigns only you can see.'}
  </Ld.Notice>;
}

/** Top bar link to the account, worded for the visitor's state. */
export function AccountLink({ presence }: { presence: Presence }) {
  return presence.state === 'signed-in'
    ? <Ld.Button variant="secondary" href="/account/">Your account</Ld.Button>
    : <Ld.Button variant="secondary" href="/account/">Sign in</Ld.Button>;
}
