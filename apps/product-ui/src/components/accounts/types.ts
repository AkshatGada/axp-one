/** Public DTOs only. Provider credentials and opaque cookies never enter these types. */
export interface Capabilities {
  profiles: boolean;
  campaignServing: boolean;
  nativeFunding: boolean;
  campaignDrafts?: boolean;
  appCredentials?: boolean;
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

export interface CampaignInput {
  name: string;
  productDescription: string;
  approvedText: string;
  contextHints: string[];
  declaredCapabilities: string[];
  maxBidBaseUnits: string;
  budgetCapBaseUnits: string;
  settlementNetwork: PayoutNetwork;
}
export interface Campaign {
  id: string;
  organizationId: string;
  advertiserId: string;
  version: number;
  status: 'draft' | 'approved';
  input: CampaignInput;
  approvedContentHash: string | null;
  createdAt: number;
  updatedAt: number;
  servingStatus: 'not_connected';
}
/** Public credential metadata only: no persisted key or hash. */
export interface AppCredential {
  id: string;
  organizationId: string;
  appId: string;
  publisherId: string;
  label: string;
  scopes: string[];
  createdAt: number;
  expiresAt: number;
  revokedAt: number | null;
}
/** A mutation result, never a list item or persisted client state. */
export interface IssuedAppCredential { credential: AppCredential; apiKey: string }
