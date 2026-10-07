import type { Metadata } from 'next';
import { ActionText, Wordmark } from '@axp/design-system/prospectus';
import NetworkRun from '@/components/network/NetworkRun';
import record from '@/data/network-scale.json';
import s from './network.module.css';

export const metadata: Metadata = {
  title: 'The measured network · axp.one',
  description: 'A recorded network run: advertiser decisions, Sponsored deliveries, cumulative off-chain vouchers and Solana Devnet settlement.',
};

export default function NetworkPage() {
  return <>
    <header className={s.header}><a href="/" aria-label="axp.one home"><Wordmark /></a><span>The network</span><ActionText href="/">Back to the exchange</ActionText></header>
    <main id="main" className={s.main}><NetworkRun record={record} /></main>
  </>;
}
