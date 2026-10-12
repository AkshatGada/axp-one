/** Public DTOs only. Provider credentials and opaque cookies never enter these types. */
export interface Capabilities {
  profiles: boolean;
  campaignServing: boolean;
  nativeFunding: boolean;
  appCredentials: boolean;
}
export interface AccountHealth {
  enabled: boolean;
  provider: 'supabase';
  profileStore?: 'supabase' | 'sqlite-fixture';
  configured: { origin: boolean; provider: boolean; store: boolean };
  capabilities: Capabilities;
}
export interface AccountUser { id: string; email: string; displayName: string }
export interface Organization {
  id: string;
  name: string;
  role: 'owner';
  createdAt: number;
  updatedAt: number;
}
export type AccountSession = { authenticated: false } | {
  authenticated: true;
  user: AccountUser;
  csrf: string;
  organizations: Organization[];
  capabilities: Capabilities;
};
export interface AdvertiserInput { name: string; website: string; description: string }
export interface AdvertiserProfile extends AdvertiserInput {
  id: string;
  organizationId: string;
  createdAt: number;
  updatedAt: number;
}
export type PayoutNetwork = 'solana-devnet' | 'tempo-testnet';
export interface AppInput {
  name: string;
  website: string;
  allowedOrigins: string[];
  blockedCategories: string[];
  payout: { network: PayoutNetwork; address: string } | null;
}
export interface AIApp extends AppInput {
  id: string;
  organizationId: string;
  createdAt: number;
  updatedAt: number;
}
export interface OrganizationDetails {
  organization: Organization;
  advertiser: AdvertiserProfile | null;
  apps: AIApp[];
}
export interface Credentials { email: string; password: string }
