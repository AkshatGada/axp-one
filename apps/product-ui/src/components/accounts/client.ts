import type {
  AccountHealth, AccountSession, AccountUser, AdvertiserInput, AdvertiserProfile,
  AIApp, AppInput, Credentials, Organization, OrganizationDetails,
  AppCredential, Campaign, CampaignInput, IssuedAppCredential,
  CampaignEnrollment, CampaignServingInput, CampaignReport, AppReport, AccountReport, AccountReportSummary, AccountReportDelivery, PayoutNetwork, AccountActivity, AppIntegration,
} from './types.ts';
import { campaignPayload, credentialLabel, publisherScopes } from './resourceForms.ts';

const messages: Record<string, string> = {
  invalid_credentials: 'Email or password was not accepted.',
  email_not_confirmed: 'Confirm your email before signing in.',
  confirmation_invalid: 'This confirmation link is invalid or expired. Request a new sign-up email.',
  invalid_token: 'This confirmation link is invalid or expired.',
  otp_expired: 'This confirmation link has expired.',
  user_already_exists: 'An account may already exist. Try signing in.',
  validation_error: 'Check the field values and try again.',
  invalid_input: 'Check the field values and try again.',
  input_invalid: 'Check the field values and try again.',
  credentials_invalid: 'Enter a valid email and a password of 12 to 256 characters.',
  auth_rejected: 'Authentication was not accepted. Check your credentials or confirmation link.',
  confirmed_email_required: 'Confirm your email before signing in.',
  auth_rate_limited: 'Too many authentication requests. Wait before trying again.',
  auth_provider_unavailable: 'The identity provider is unavailable. Try again later.',
  accounts_configuration_required: 'The account service is not configured on this server.',
  profile_database_unavailable: 'The profile database is unavailable. Your profiles have not been moved to a local fallback.',
  profile_database_migration_required: 'The AXP profile database migration has not been applied.',
  profile_database_rate_limited: 'The profile database is busy. Wait before trying again.',
  origin_invalid: 'This page origin is not allowed by the account service.',
  invalid_url: 'Check website URLs and allowed origins. Use HTTPS or loopback HTTP; origins cannot contain paths or wildcards.',
  invalid_payout: 'Check the network and payout address. This is a declaration only.',
  limit_exceeded: 'The account resource limit has been reached.',
  not_found: 'This organization, campaign, app or credential is no longer available to your account.',
  advertiser_required: 'Create an advertiser profile for this organization before creating campaigns.',
  advertiser_profile_required: 'Create an advertiser profile for this organization before creating campaigns.',
  spend_limit_exceeded: 'Use integer base units: bid at most 4,000, cap at most 100,000, and bid no greater than cap.',
  private_content: 'Remove private contact details or credentials from campaign content.',
  credential_limit_exceeded: 'This app has 10 active credentials. Revoke an unused key before issuing another.',
  credential_not_active: 'This credential is revoked or expired. Reload metadata and issue a new key if needed.',
  campaign_version_conflict: 'This campaign changed since you reviewed it. Reload the campaign list and review the latest saved version before approving or changing serving again. Nothing was approved or changed for serving by this request.',
  invalid_expected_version: 'This action requires the positive integer campaign version you reviewed. Reload the campaign list before continuing.',
  campaign_approval_required: 'Approve the current saved campaign version before funding or enabling serving.',
  campaign_not_approved: 'Approve the current saved campaign version before enabling serving.',
  campaign_destination_invalid: 'Use an HTTPS advertiser website before enabling a campaign. Loopback URLs are profile-only development declarations.',
  campaign_network_locked: 'This campaign already has shared-serving history on another network. Create a separate campaign for a different currency.',
  cap_below_obligations: 'The new campaign cap is below existing accepted charges and outstanding reservations. Increase the cap before enabling this version.',
  account_network_unavailable: 'Shared account serving is unavailable. Refresh readiness before trying again.',
  verified_wallet_required: 'Verify the campaign funding wallet and the AI app payout wallet before freezing a channel.',
  own_wallet_network_unavailable: 'Own-wallet channels currently support Solana Devnet only.',
  account_payment_broadcast_disabled: 'Transaction broadcast is disabled on this server. No transaction was submitted.',
  financial_repository_unavailable: 'The private financial database is unavailable. No fallback wallet or ledger is used.',
  channel_state_conflict: 'The channel cannot perform this action in its current state. Reload its status.',
  reconcile_existing_attempt: 'An existing signed attempt must be reconciled. Do not sign a replacement.',
  unsigned_plan_expired: 'The unsigned request expired. Prepare it again and review the refreshed wallet request.',
  close_not_drained: 'Wait for outstanding placements and authorize all accepted charges before closing.',
  wallet_challenge_expired: 'The wallet verification request expired. Request a new proof.',
  wallet_challenge_used: 'This verification request has already been consumed.',
  channel_binding_exists: 'This campaign already has a channel for this app. Reuse and reconcile that channel.',
  app_payout_route_conflict: 'Existing app channels use a different payout wallet. They cannot be redirected.',
  payment_compatibility_unavailable: 'Native payment compatibility could not be verified. No funding was attempted.',
  aggregate_fee_cap_exceeded: 'The campaign-wide fee and rent allowance would be exceeded.',
  deposit_below_campaign_cap: 'The deposit must cover the campaign charge cap.',
  account_resources_unavailable: 'Account resources are not installed on this server. Profiles remain separate.',
  account_serving_not_connected: 'Account SDK configuration is available, but serving and recovery are not connected.',
  resource_repository_required: 'Account resources are not installed on this server. Profiles remain separate.',
  session_changed: 'Your account session changed. Refresh your account before continuing.',
  rate_limited: 'Too many requests. Wait a moment before trying again.',
  busy: 'The account service is busy. Try again in a moment.',
  csrf_invalid: 'Your session needs refreshing. Use Refresh account before saving again.',
  invalid_csrf: 'Your session needs refreshing. Use Refresh account before saving again.',
  forbidden_origin: 'This page origin is not allowed by the account service.',
  not_configured: 'Accounts are not configured on this server.',
  accounts_disabled: 'Accounts are disabled on this server.',
};
export class AccountApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  constructor(status: number, code: string) {
    super(messages[code] ?? (status === 401 ? 'Your session has expired. Sign in again.' :
      status === 429 ? messages.rate_limited :
        status === 403 ? 'This request was not permitted. Refresh your account and check your access.' :
          'The account request failed. Check your connection or configuration and try again.'));
    this.name = 'AccountApiError';
    this.status = status;
    this.code = code;
  }
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasCapabilities(value: unknown): boolean {
  return record(value) && ['profiles', 'campaignServing', 'nativeFunding']
    .every(key => typeof value[key] === 'boolean') && ['campaignDrafts', 'appCredentials']
    .every(key => value[key] === undefined || typeof value[key] === 'boolean');
}
const timestamp = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && value <= 8640000000000000;
function invalidResponse(): never { throw new AccountApiError(502, 'invalid_response'); }
function campaignDTO(value: unknown, organizationId: string, campaignId?: string): Campaign {
  if (!record(value) || typeof value.id !== 'string' || !value.id || (campaignId && value.id !== campaignId) ||
      value.organizationId !== organizationId || typeof value.advertiserId !== 'string' || !value.advertiserId ||
      !Number.isSafeInteger(value.version) || Number(value.version) < 1 ||
      !['draft', 'approved'].includes(String(value.status)) || value.servingStatus !== 'not_connected' ||
      !timestamp(value.createdAt) || !timestamp(value.updatedAt) ||
      (value.status === 'draft' ? value.approvedContentHash !== null : typeof value.approvedContentHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.approvedContentHash)) || !record(value.input)) invalidResponse();
  let input: CampaignInput;
  try { input = campaignPayload(value.input as unknown as CampaignInput); } catch { invalidResponse(); }
  return { id: value.id, organizationId, advertiserId: value.advertiserId, version: Number(value.version),
    status: value.status as Campaign['status'], input, approvedContentHash: value.approvedContentHash as string | null,
    createdAt: Number(value.createdAt), updatedAt: Number(value.updatedAt), servingStatus: 'not_connected' };
}
function credentialDTO(value: unknown, organizationId: string, appId: string, keyId?: string): AppCredential {
  if (!record(value) || typeof value.id !== 'string' || !value.id || (keyId && value.id !== keyId) ||
      value.organizationId !== organizationId || value.appId !== appId || value.publisherId !== `app:${appId}` ||
      typeof value.label !== 'string' || !value.label.trim() || value.label.length > 120 ||
      !Array.isArray(value.scopes) || value.scopes.length !== publisherScopes.length ||
      !publisherScopes.every(scope => (value.scopes as unknown[]).includes(scope)) ||
      !timestamp(value.createdAt) || !timestamp(value.expiresAt) || Number(value.expiresAt) <= Number(value.createdAt) ||
      (value.revokedAt !== null && !timestamp(value.revokedAt)) ||
      ['apiKey', 'keyHash', 'key_hash', 'hash', 'token'].some(key => key in value)) invalidResponse();
  return { id: value.id, organizationId, appId, publisherId: `app:${appId}`, label: value.label,
    scopes: [...value.scopes] as string[], createdAt: Number(value.createdAt), expiresAt: Number(value.expiresAt),
    revokedAt: value.revokedAt as number | null };
}
function enrollmentDTO(value: unknown, organizationId: string, campaignId: string): CampaignEnrollment {
  if (!record(value) || value.organizationId !== organizationId || value.campaignId !== campaignId ||
      !Number.isSafeInteger(value.version) || Number(value.version) < 1 || typeof value.enabled !== 'boolean' ||
      value.financialMode !== 'synthetic' || !timestamp(value.updatedAt) ||
      (value.approvedContentHash !== null && (typeof value.approvedContentHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.approvedContentHash))) ||
      (value.enabled && value.approvedContentHash === null)) invalidResponse();
  return { campaignId, organizationId, version: Number(value.version), approvedContentHash: value.approvedContentHash as string | null,
    enabled: value.enabled, financialMode: 'synthetic', updatedAt: Number(value.updatedAt) };
}
const baseUnits = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9][0-9]{0,29})$/.test(value);
const resourceId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 256 && !/[\u0000-\u001f\u007f]/u.test(value);
function reportSummaryDTO(value: unknown): AccountReportSummary {
  if (!record(value) || !baseUnits(value.acceptedBaseUnits) || !baseUnits(value.reservedBaseUnits) ||
      !Number.isSafeInteger(value.deliveryCount) || Number(value.deliveryCount) < 0) invalidResponse();
  return { acceptedBaseUnits: value.acceptedBaseUnits, reservedBaseUnits: value.reservedBaseUnits, deliveryCount: Number(value.deliveryCount) };
}
function reportDTO(value: unknown, kind: 'campaign' | 'app', id: string): AccountReport {
  if (!record(value) || value.schemaVersion !== `account-${kind}-report.v1` || value[`${kind}Id`] !== id ||
      !['synthetic','devnet'].includes(String(value.financialMode)) || !record(value.bySettlementNetwork) ||
      !Array.isArray(value.deliveries) || value.deliveries.length > 100) invalidResponse();
  const summary = reportSummaryDTO(value.summary);
  const bySettlementNetwork: AccountReport['bySettlementNetwork'] = {};
  for (const [network, totals] of Object.entries(value.bySettlementNetwork)) {
    if (!['solana-devnet', 'tempo-testnet'].includes(network)) invalidResponse();
    bySettlementNetwork[network as PayoutNetwork] = reportSummaryDTO(totals);
  }
  const deliveries: AccountReportDelivery[] = value.deliveries.map((entry: unknown) => {
    if (!record(entry) || !['awardId', 'opportunityId', 'campaignId', 'campaignVersionId', 'appId'].every(key => resourceId(entry[key])) ||
        entry[`${kind}Id`] !== id || !baseUnits(entry.amountBaseUnits) || entry.amountBaseUnits === '0' ||
        typeof entry.receiptHash !== 'string' || !/^[a-f0-9]{64}$/.test(entry.receiptHash) || !timestamp(entry.acceptedAt) ||
        !['solana-devnet', 'tempo-testnet'].includes(String(entry.settlementNetwork)) || !bySettlementNetwork[entry.settlementNetwork as PayoutNetwork]) invalidResponse();
    return { awardId: String(entry.awardId), opportunityId: String(entry.opportunityId), campaignId: String(entry.campaignId),
      campaignVersionId: String(entry.campaignVersionId), appId: String(entry.appId), amountBaseUnits: entry.amountBaseUnits,
      receiptHash: entry.receiptHash, acceptedAt: Number(entry.acceptedAt), settlementNetwork: entry.settlementNetwork as PayoutNetwork };
  });
  if (new Set(deliveries.map(delivery => delivery.awardId)).size !== deliveries.length) invalidResponse();
  for (const [network, totals] of Object.entries(bySettlementNetwork)) {
    if (totals.deliveryCount < deliveries.filter(delivery => delivery.settlementNetwork === network).length) invalidResponse();
  }
  // Explicit projection also drops optional delivered creative metadata; never retain a raw report.
  let activity: AccountActivity[] | undefined;
  if (value.activity !== undefined || value.activityTotal !== undefined) {
    if (!Array.isArray(value.activity) || value.activity.length > 100 || !Number.isSafeInteger(value.activityTotal) || Number(value.activityTotal) < value.activity.length) invalidResponse();
    activity = value.activity.map((entry: unknown) => {
      if (!record(entry) || !resourceId(entry.opportunityId) || !resourceId(entry.appId) ||
          (entry.campaignId !== null && !resourceId(entry.campaignId)) || (entry.campaignVersionId !== null && !resourceId(entry.campaignVersionId)) ||
          entry[`${kind}Id`] !== id || !['solana-devnet','tempo-testnet'].includes(String(entry.settlementNetwork)) ||
          !['won','lost','skipped','unavailable','abstained','excluded','no_fill'].includes(String(entry.disposition)) ||
          !['bid','skip','abstain','not_called','not_reported'].includes(String(entry.decision)) ||
          (entry.execution !== null && !['actual-api-model','fixture','unavailable'].includes(String(entry.execution))) ||
          !Array.isArray(entry.reasonCodes) || entry.reasonCodes.length > 16 || entry.reasonCodes.some(code => typeof code !== 'string' || !/^[a-z_0-9]{1,100}$/.test(code)) ||
          (entry.bidBaseUnits !== null && !baseUnits(entry.bidBaseUnits)) || (entry.awardId !== null && !resourceId(entry.awardId)) ||
          !['not_awarded','accepted','failed','expired','reserved'].includes(String(entry.deliveryStatus))) invalidResponse();
      return { opportunityId: entry.opportunityId, appId: entry.appId, campaignId: entry.campaignId, campaignVersionId: entry.campaignVersionId,
        settlementNetwork: entry.settlementNetwork, disposition: entry.disposition, decision: entry.decision, execution: entry.execution,
        reasonCodes: [...entry.reasonCodes], bidBaseUnits: entry.bidBaseUnits, awardId: entry.awardId, deliveryStatus: entry.deliveryStatus } as AccountActivity;
    });
  }
  return { financialMode: value.financialMode as AccountReport['financialMode'], summary, bySettlementNetwork, deliveries,
    ...(activity ? {activity, activityTotal: Number(value.activityTotal)} : {}) };
}
export function isConfigured(health: AccountHealth): boolean {
  return health.configured.origin && health.configured.provider && health.configured.store;
}

/** Same-origin, cookie-only transport. No retries of unsafe requests. */
export class AccountsClient {
  private csrf: string | null = null;
  private sessionEpoch = 0;
  private requestTail: Promise<void> | null = null;
  private readonly transport: typeof fetch;
  constructor(transport: typeof fetch = (...args) => fetch(...args)) { this.transport = transport; }

  clearSession() { this.csrf = null; this.sessionEpoch++; }

  /** Session/CSRF-bound financial transport; no SDK key, wallet key or retries. */
  financeRequest(path: string, body?: object): Promise<unknown> {
    if (!/^\/organizations\/[^/]+\//.test(path)) throw new AccountApiError(400, 'invalid_input');
    return this.request(path, body, body !== undefined, true);
  }

  private async request<T>(path: string, body?: object, authenticated = false, sessionBound = authenticated): Promise<T> {
    if ((authenticated || sessionBound) && !this.csrf) throw new AccountApiError(401, 'session_required');
    const epoch = this.sessionEpoch;
    const csrf = this.csrf;
    // Account panels share a fenced backend workspace. Order this client's calls
    // rather than racing its lease or retrying a possibly completed mutation.
    const execute = () => {
      if (sessionBound && epoch !== this.sessionEpoch) return Promise.reject<T>(new AccountApiError(401, 'session_changed'));
      return this.send<T>(path, body, authenticated, sessionBound, epoch, csrf);
    };
    const result = this.requestTail ? this.requestTail.then(execute) : execute();
    const tail = result.then(() => undefined, () => undefined);
    this.requestTail = tail;
    void tail.then(() => { if (this.requestTail === tail) this.requestTail = null; });
    return result;
  }

  private async send<T>(path: string, body: object | undefined, authenticated: boolean, sessionBound: boolean, epoch: number, csrf: string | null): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.transport(`/api/accounts${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authenticated ? { 'x-axp-csrf': csrf! } : {}),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      // Never display raw server bodies: they may contain private diagnostics.
      const data: unknown = await response.json().catch(() => null);
      if (sessionBound && epoch !== this.sessionEpoch) throw new AccountApiError(401, 'session_changed');
      if (!response.ok) {
        if (response.status === 401) this.clearSession();
        const error = record(data) ? data.error : null;
        const code = record(error) && typeof error.code === 'string' ? error.code :
          typeof error === 'string' ? error : record(data) && typeof data.code === 'string' ? data.code : 'request_failed';
        throw new AccountApiError(response.status, code);
      }
      if (!record(data)) throw new AccountApiError(502, 'invalid_response');
      return data as T;
    } catch (error) {
      if (error instanceof AccountApiError) throw error;
      throw new AccountApiError(0, 'connection_failed');
    } finally { clearTimeout(timeout); }
  }

  async health(): Promise<AccountHealth> {
    const data = await this.request<AccountHealth>('/health');
    const configured: unknown = data.configured;
    if (typeof data.enabled !== 'boolean' || !record(configured) ||
        !['origin', 'provider', 'store'].every(key => typeof configured[key] === 'boolean') ||
        data.provider !== 'supabase' || (data.profileStore !== undefined && !['supabase', 'sqlite-fixture'].includes(data.profileStore)) || !hasCapabilities(data.capabilities)) {
      throw new AccountApiError(502, 'invalid_response');
    }
    return data;
  }
  async session(): Promise<AccountSession> {
    this.clearSession();
    const epoch = this.sessionEpoch;
    const data = await this.request<AccountSession>('/session');
    if (epoch !== this.sessionEpoch) throw new AccountApiError(401, 'session_changed');
    if (data.authenticated === false) return { authenticated: false };
    if (data.authenticated !== true || !record(data.user) || typeof data.user.id !== 'string' ||
        typeof data.user.email !== 'string' || typeof data.user.displayName !== 'string' ||
        typeof data.csrf !== 'string' || !data.csrf || !Array.isArray(data.organizations) ||
        !data.organizations.every(org => record(org) && typeof org.id === 'string' &&
          typeof org.name === 'string' && org.role === 'owner') || !hasCapabilities(data.capabilities)) {
      throw new AccountApiError(502, 'invalid_response');
    }
    this.csrf = data.csrf;
    return data;
  }
  async signup(input: Credentials) {
    const result = await this.request<{ confirmationRequired: true }>('/auth/signup', input);
    if (result.confirmationRequired !== true) throw new AccountApiError(502, 'invalid_response');
    return result;
  }
  async signin(input: Credentials) {
    const result = await this.request<{ signedIn: true }>('/auth/signin', input);
    if (result.signedIn !== true) throw new AccountApiError(502, 'invalid_response');
    return result;
  }
  async confirm(tokenHash: string) {
    const result = await this.request<{ signedIn: true }>('/auth/confirm', { tokenHash });
    if (result.signedIn !== true) throw new AccountApiError(502, 'invalid_response');
    return result;
  }
  async signout() {
    const pending = this.request<{ signedOut: true }>('/auth/signout', {}, Boolean(this.csrf), false);
    // Invalidate queued owner requests immediately, using only the captured CSRF
    // for this explicit sign-out. A failed sign-out must not retain local authority.
    this.clearSession();
    const result = await pending;
    if (result.signedOut !== true) throw new AccountApiError(502, 'invalid_response');
    return result;
  }
  profile(displayName: string) {
    return this.request<{ user: AccountUser }>('/profile', { displayName }, true);
  }
  createOrganization(name: string) {
    return this.request<{ organization: Organization }>('/organizations', { name }, true);
  }
  organization(id: string) {
    return this.request<OrganizationDetails>(`/organizations/${encodeURIComponent(id)}`, undefined, false, true);
  }
  advertiser(id: string, input: AdvertiserInput) {
    return this.request<{ advertiser: AdvertiserProfile }>(`/organizations/${encodeURIComponent(id)}/advertiser`, input, true);
  }
  app(id: string, input: AppInput, appId?: string) {
    return this.request<{ app: AIApp }>(`/organizations/${encodeURIComponent(id)}/apps${appId ? `/${encodeURIComponent(appId)}` : ''}`, input, true);
  }
  async campaigns(orgId: string): Promise<{ campaigns: Campaign[] }> {
    const result = await this.request<{ campaigns: unknown[] }>(`/organizations/${encodeURIComponent(orgId)}/campaigns`, undefined, false, true);
    if (!Array.isArray(result.campaigns)) invalidResponse();
    return { campaigns: result.campaigns.map(value => campaignDTO(value, orgId)) };
  }
  async campaign(orgId: string, campaignId: string): Promise<{ campaign: Campaign }> {
    const result = await this.request<{ campaign: unknown }>(`/organizations/${encodeURIComponent(orgId)}/campaigns/${encodeURIComponent(campaignId)}`, undefined, false, true);
    return { campaign: campaignDTO(result.campaign, orgId, campaignId) };
  }
  async saveCampaign(orgId: string, input: CampaignInput, campaignId?: string): Promise<{ campaign: Campaign }> {
    const result = await this.request<{ campaign: unknown }>(`/organizations/${encodeURIComponent(orgId)}/campaigns${campaignId ? `/${encodeURIComponent(campaignId)}` : ''}`, campaignPayload(input), true);
    return { campaign: campaignDTO(result.campaign, orgId, campaignId) };
  }
  async approveCampaign(orgId: string, campaignId: string, expectedVersion: number): Promise<{ campaign: Campaign }> {
    if (!Number.isSafeInteger(expectedVersion) || expectedVersion < 1) throw new AccountApiError(400, 'invalid_expected_version');
    const result = await this.request<{ campaign: unknown }>(`/organizations/${encodeURIComponent(orgId)}/campaigns/${encodeURIComponent(campaignId)}/approve`, { expectedVersion }, true);
    const campaign = campaignDTO(result.campaign, orgId, campaignId);
    if (campaign.status !== 'approved' || campaign.version !== expectedVersion) invalidResponse();
    return { campaign };
  }
  async appCredentials(orgId: string, appId: string): Promise<{ credentials: AppCredential[] }> {
    const result = await this.request<{ credentials: unknown[] }>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/credentials`, undefined, false, true);
    if (!Array.isArray(result.credentials)) invalidResponse();
    return { credentials: result.credentials.map(value => credentialDTO(value, orgId, appId)) };
  }
  async campaignServing(orgId: string, campaignId: string): Promise<{ enrollment: CampaignEnrollment | null }> {
    const result = await this.request<{ enrollment: unknown }>(`/organizations/${encodeURIComponent(orgId)}/campaigns/${encodeURIComponent(campaignId)}/serving`, undefined, false, true);
    return { enrollment: result.enrollment === null ? null : enrollmentDTO(result.enrollment, orgId, campaignId) };
  }
  async setCampaignServing(orgId: string, campaignId: string, input: CampaignServingInput): Promise<{ enrollment: CampaignEnrollment }> {
    if (!input || !Number.isSafeInteger(input.expectedVersion) || input.expectedVersion < 1) throw new AccountApiError(400, 'invalid_expected_version');
    if (typeof input.enabled !== 'boolean') throw new AccountApiError(400, 'invalid_input');
    const { expectedVersion, enabled } = input;
    const result = await this.request<{ enrollment: unknown }>(`/organizations/${encodeURIComponent(orgId)}/campaigns/${encodeURIComponent(campaignId)}/serving`, { expectedVersion, enabled }, true);
    const enrollment = enrollmentDTO(result.enrollment, orgId, campaignId);
    if (enrollment.version !== expectedVersion || enrollment.enabled !== enabled) invalidResponse();
    return { enrollment };
  }
  async campaignReport(orgId: string, campaignId: string): Promise<CampaignReport> {
    const result = await this.request<unknown>(`/organizations/${encodeURIComponent(orgId)}/campaigns/${encodeURIComponent(campaignId)}/report`, undefined, false, true);
    return { ...reportDTO(result, 'campaign', campaignId), schemaVersion: 'account-campaign-report.v1', campaignId };
  }
  async appReport(orgId: string, appId: string): Promise<AppReport> {
    const result = await this.request<unknown>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/report`, undefined, false, true);
    return { ...reportDTO(result, 'app', appId), schemaVersion: 'account-app-report.v1', appId };
  }
  async appIntegration(orgId: string, appId: string): Promise<AppIntegration> {
    const value = await this.request<unknown>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/integration`, undefined, false, true);
    const gateNames = ['credential','restrictions','catalogue','inventory','provider','funding','broadcasts'] as const;
    if (!record(value) || value.schemaVersion !== 'account-app-integration.v1' || value.appId !== appId || value.apiBasePath !== '/api/accounts/sdk' ||
        !['synthetic','devnet'].includes(String(value.financialMode)) || !['actual-api-model','fixture','unavailable'].includes(String(value.execution)) ||
        !Number.isSafeInteger(value.activeCredentialCount) || Number(value.activeCredentialCount) < 0 || Number(value.activeCredentialCount) > 10 ||
        !record(value.gates) || gateNames.some(name => typeof (value.gates as Record<string, unknown>)[name] !== 'boolean') ||
        typeof value.ready !== 'boolean' || typeof value.recoverySupported !== 'boolean' || typeof value.broadcastEnabled !== 'boolean') invalidResponse();
    const gates = Object.fromEntries(gateNames.map(name => [name, (value.gates as Record<string, boolean>)[name]])) as AppIntegration['gates'];
    if (value.ready !== Object.values(gates).every(Boolean) || gates.credential !== (Number(value.activeCredentialCount) > 0)) invalidResponse();
    return { schemaVersion: 'account-app-integration.v1', appId, apiBasePath: '/api/accounts/sdk', financialMode: value.financialMode as AppIntegration['financialMode'],
      activeCredentialCount: Number(value.activeCredentialCount), ready: value.ready, recoverySupported: value.recoverySupported,
      broadcastEnabled: value.broadcastEnabled, execution: value.execution as AppIntegration['execution'], gates };
  }
  async issueAppCredential(orgId: string, appId: string, label: string): Promise<IssuedAppCredential> {
    const result = await this.request<IssuedAppCredential>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/credentials`, { label: credentialLabel(label) }, true);
    return this.issuedCredential(result, orgId, appId);
  }
  async revokeAppCredential(orgId: string, appId: string, keyId: string): Promise<{ credential: AppCredential }> {
    const result = await this.request<{ credential: unknown }>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(keyId)}/revoke`, {}, true);
    const credential = credentialDTO(result.credential, orgId, appId, keyId);
    if (credential.revokedAt === null) invalidResponse();
    return { credential };
  }
  async rotateAppCredential(orgId: string, appId: string, keyId: string, label: string): Promise<IssuedAppCredential> {
    const result = await this.request<IssuedAppCredential>(`/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}/credentials/${encodeURIComponent(keyId)}/rotate`, { label: credentialLabel(label) }, true);
    const issued = this.issuedCredential(result, orgId, appId);
    if (issued.credential.id === keyId) invalidResponse();
    return issued;
  }
  private issuedCredential(result: IssuedAppCredential, orgId: string, appId: string): IssuedAppCredential {
    const credential = credentialDTO(result.credential, orgId, appId);
    if (typeof result.apiKey !== 'string' || !/^axp_app_[a-f0-9]{64}$/.test(result.apiKey) || credential.revokedAt !== null) invalidResponse();
    return { credential, apiKey: result.apiKey };
  }
}
