import type { Metadata } from 'next';
import { AccountConsole } from '@/components/accounts/AccountConsole';
import './account.css';

export const metadata: Metadata = {
  title: { absolute: 'Account · axp.one' },
  description: 'Manage your AXP identity, organizations, advertiser profiles and AI-app declarations.',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
};

// No server session or searchParams dependency: this route can be statically exported.
export default function AccountPage() { return <AccountConsole />; }
