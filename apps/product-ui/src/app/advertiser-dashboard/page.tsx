import type { Metadata } from 'next';
import { AdvertiserDashboard } from '@/components/advertiser-dashboard/AdvertiserDashboard';
import './dashboard.css';
export const metadata: Metadata = { title: 'Advertiser dashboard', description: 'Create and operate contextual Sponsored campaigns with synthetic test credits.' };
export default function Page() { return <AdvertiserDashboard />; }
