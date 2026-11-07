import type {Metadata} from 'next';
import {AdvertiserDashboard} from '@/components/advertiser-dashboard/AdvertiserDashboard';
import '../../advertiser-dashboard/dashboard.css';
export const metadata: Metadata={title:{absolute:'Arc advertiser demo · axp.one'},description:'Interactive Arc Testnet campaigns backed by AXP’s durable receipt ledger and Circle Gateway Nanopayments.'};
export default function Page(){return <AdvertiserDashboard arcDemo />;}
