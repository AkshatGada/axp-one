'use client';

import { useId, type FormEvent, type ReactNode } from 'react';
import { Ld } from '@axp/design-system/ledger';
import { categories, origins, validateWebsite } from './forms';
import type { AdvertiserInput, AdvertiserProfile, AIApp, AppInput, Credentials, PayoutNetwork } from './types';

export type RunAction = (label: string, action: () => Promise<void>, success?: string) => Promise<void>;
function text(form: FormData, key: string) { return String(form.get(key) ?? '').trim(); }

export function AccountForm({ label, busy, children, onSubmit, submit = 'Save', hint }: {
  label: string; busy: boolean; children: ReactNode;
  onSubmit: (data: FormData, form: HTMLFormElement) => Promise<void>;
  submit?: string; hint?: string;
}) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const form = event.currentTarget;
    void onSubmit(new FormData(form), form);
  }
  return <form aria-label={label} onSubmit={handleSubmit} aria-busy={busy}>
    <fieldset className="account-fields" disabled={busy}>
      <legend className="account-sr-only">{label}</legend>
      {children}
      {hint && <p className="ld-secondary">{hint}</p>}
      <div className="ld-row"><Ld.Button type="submit" disabled={busy}>{submit}</Ld.Button></div>
    </fieldset>
  </form>;
}

export function Input({ label, name, value = '', required = true, type = 'text', autoComplete = 'off', maxLength = 200, hint }: {
  label: string; name: string; value?: string; required?: boolean;
  type?: string; autoComplete?: string; maxLength?: number; hint?: string;
}) {
  const id = useId();
  return <div className="ld-field">
    <label className="ld-field-l" htmlFor={id}>{label}</label>
    <input id={id} className="ld-input" name={name} type={type} defaultValue={value}
      required={required} maxLength={maxLength} autoComplete={autoComplete}
      aria-describedby={hint ? `${id}-hint` : undefined} />
    {hint && <span id={`${id}-hint`} className="ld-field-h">{hint}</span>}
  </div>;
}

export function Textarea({ label, name, value = '', hint, maxLength = 4000 }: {
  label: string; name: string; value?: string; hint?: string; maxLength?: number;
}) {
  const id = useId();
  return <div className="ld-field">
    <label className="ld-field-l" htmlFor={id}>{label}</label>
    <textarea className="ld-textarea" id={id} name={name} defaultValue={value} maxLength={maxLength}
      aria-describedby={hint ? `${id}-hint` : undefined} />
    {hint && <span className="ld-field-h" id={`${id}-hint`}>{hint}</span>}
  </div>;
}

export function AuthForm({ mode, busy, run, authenticate }: {
  mode: 'signup' | 'signin'; busy: boolean; run: RunAction;
  authenticate: (input: Credentials) => Promise<void>;
}) {
  const signup = mode === 'signup';
  const passwordId = useId();
  return <AccountForm label={signup ? 'Create account' : 'Sign in'} busy={busy}
    submit={signup ? 'Create account' : 'Sign in'}
    onSubmit={(data, form) => {
      const input = { email: text(data, 'email'), password: String(data.get('password') ?? '') };
      // Keep passwords out of React state and clear the DOM field immediately.
      const field = form.elements.namedItem('password');
      if (field instanceof HTMLInputElement) field.value = '';
      return run(signup ? 'Creating account' : 'Signing in', () => authenticate(input),
        signup ? 'Check your email for a confirmation link. Open it, then select Confirm email. You are not signed in yet.' : 'Signed in.');
    }}>
    <Input label="Email" name="email" type="email" autoComplete="username" maxLength={254} />
    <div className="ld-field">
      <label className="ld-field-l" htmlFor={passwordId}>Password</label>
      <input className="ld-input" id={passwordId} name="password" type="password" required
        minLength={12} maxLength={256}
        autoComplete={signup ? 'new-password' : 'current-password'}
        aria-describedby={signup ? `${passwordId}-hint` : undefined} />
      {signup && <span className="ld-field-h" id={`${passwordId}-hint`}>12–256 characters. Email confirmation is required.</span>}
    </div>
  </AccountForm>;
}

export function AdvertiserForm({ profile, busy, run, save }: {
  profile: AdvertiserProfile | null; busy: boolean; run: RunAction;
  save: (input: AdvertiserInput) => Promise<void>;
}) {
  return <AccountForm label="Advertiser profile" busy={busy} submit={profile ? 'Save advertiser profile' : 'Create advertiser profile'}
    onSubmit={data => run('Saving advertiser profile', async () => {
      const description = text(data, 'description');
      if (/[\u0000-\u001f\u007f]/u.test(description)) throw new Error('Business descriptions must be a single paragraph without line breaks or control characters.');
      await save({ name: text(data, 'name'), website: validateWebsite(text(data, 'website')), description });
    }, 'Advertiser profile saved. Campaign serving and funding remain unavailable.')}>
    <Input label="Business name" name="name" value={profile?.name} autoComplete="organization" maxLength={120} />
    <Input label="Business website" name="website" type="url" value={profile?.website} maxLength={2048}
      hint="HTTPS; HTTP is accepted only for loopback development." />
    <Textarea label="Business description" name="description" value={profile?.description} maxLength={2000} hint="Up to 2,000 characters; line breaks are not supported." />
  </AccountForm>;
}

export function AppForm({ app, busy, run, save }: {
  app: AIApp | undefined; busy: boolean; run: RunAction;
  save: (input: AppInput) => Promise<void>;
}) {
  const payoutId = useId();
  return <AccountForm label={app ? 'Edit AI app' : 'Create AI app'} busy={busy}
    submit={app ? 'Save AI app' : 'Create AI app'}
    onSubmit={data => run('Saving AI app', async () => {
      const network = text(data, 'network');
      const address = text(data, 'address');
      if (network && !['solana-devnet', 'tempo-testnet'].includes(network)) throw new Error('Select a supported payout declaration network.');
      if (network && !address) throw new Error('Enter an address for the payout declaration, or select No payout declaration.');
      if (!network && address) throw new Error('Select a network for this address, or clear the address to save without a declaration.');
      if (network === 'solana-devnet' && !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        throw new Error('Enter a Solana address using 32–44 base58 characters.');
      }
      if (network === 'tempo-testnet' && !/^0x[0-9a-fA-F]{40}$/.test(address)) throw new Error('Enter a Tempo address: 0x followed by 40 hexadecimal characters.');
      await save({ name: text(data, 'name'), website: validateWebsite(text(data, 'website')),
        allowedOrigins: origins(text(data, 'allowedOrigins')),
        blockedCategories: categories(text(data, 'blockedCategories')),
        payout: network ? { network: network as PayoutNetwork, address } : null });
    }, 'AI-app profile saved. No credential was issued and no payout was enabled.')}>
    <Input label="AI-app name" name="name" value={app?.name} maxLength={120} />
    <Input label="AI-app website" name="website" type="url" value={app?.website} maxLength={2048}
      hint="HTTPS, or a loopback HTTP URL during development." />
    <Textarea label="Allowed origins" name="allowedOrigins" value={app?.allowedOrigins.join('\n')}
      hint="One origin per line, e.g. https://app.example.com or http://localhost:3000. No paths or wildcards." />
    <Textarea label="Prohibited ad categories" name="blockedCategories" value={app?.blockedCategories.join('\n')}
      hint="One category per line (up to 32, 80 characters each). Saved declarations, not proof of live enforcement." />
    <div className="ld-field">
      <label className="ld-field-l" htmlFor={payoutId}>Payout declaration network</label>
      <select className="ld-select" id={payoutId} name="network" defaultValue={app?.payout?.network ?? ''}
        aria-describedby={`${payoutId}-hint`}>
        <option value="">No payout declaration</option>
        <option value="solana-devnet">Solana Devnet</option>
        <option value="tempo-testnet">Tempo Testnet</option>
      </select>
      <span className="ld-field-h" id={`${payoutId}-hint`}>Declaration only. No wallet connection, ownership verification, native funding or payout routing.</span>
    </div>
    <Input label="Payout address (optional)" name="address" required={false} value={app?.payout?.address} maxLength={128} />
  </AccountForm>;
}
