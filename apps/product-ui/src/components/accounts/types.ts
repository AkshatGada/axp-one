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
/** Separate from the legacy campaign DTO; approval alone never enrolls inventory. */
export interface CampaignEnrollment {
  campaignId: string;
  organizationId: string;
  version: number;
  approvedContentHash: string | null;
  enabled: boolean;
  financialMode: 'synthetic';
  updatedAt: number;
}
export interface CampaignServingInput { expectedVersion: number; enabled: boolean }
export interface AccountReportSummary {
  acceptedBaseUnits: string;
  reservedBaseUnits: string;
  deliveryCount: number;
}
/** Allowlisted receipt identity only, never questions, capabilities or private campaign inputs. */
export interface AccountReportDelivery {
  awardId: string;
  opportunityId: string;
  campaignId: string;
  campaignVersionId: string;
  appId: string;
  amountBaseUnits: string;
  receiptHash: string;
  acceptedAt: number;
  settlementNetwork: PayoutNetwork;
}
export interface AccountReport {
  financialMode: 'synthetic';
  /** Compatibility summary, not a cross-currency total. Use per-network summaries in the UI. */
  summary: AccountReportSummary;
  bySettlementNetwork: Partial<Record<PayoutNetwork, AccountReportSummary>>;
  /** At most 100 records; summaries are not recomputed from this bounded window. */
  deliveries: AccountReportDelivery[];
}
export interface CampaignReport extends AccountReport {
  schemaVersion: 'account-campaign-report.v1';
  campaignId: string;
}
export interface AppReport extends AccountReport {
  schemaVersion: 'account-app-report.v1';
  appId: string;
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
