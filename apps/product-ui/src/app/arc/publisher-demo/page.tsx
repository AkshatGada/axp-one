import type {Metadata} from 'next';
import {PublisherDemo} from '@/components/publisher-demo/PublisherDemo';
export const metadata: Metadata={title:{absolute:'Arc publisher demo · axp.one'},description:'Try a labelled fixture AI answer with actual Sponsored insertion receipts and Arc Testnet nanopayments.'};
export default function Page(){return <PublisherDemo arcDemo />;}
