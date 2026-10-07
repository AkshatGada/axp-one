import type { Metadata } from 'next';
import { AdvertiserDashboard } from '@/components/advertiser-dashboard/AdvertiserDashboard';
import './dashboard.css';
export const metadata: Metadata = { title: {absolute: 'Advertiser dashboard · axp.one'}, description: 'Create, approve and fund contextual Sponsored campaigns with Solana Devnet payment channels.' };
export default function Page() { return <AdvertiserDashboard />; }
