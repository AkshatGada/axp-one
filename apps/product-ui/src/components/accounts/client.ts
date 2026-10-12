import type {
  AccountHealth, AccountSession, AccountUser, AdvertiserInput, AdvertiserProfile,
  AIApp, AppInput, Credentials, Organization, OrganizationDetails,
  AppCredential, Campaign, CampaignInput, IssuedAppCredential,
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
  credentials_invalid: 'Enter a valid email and a password of 12–256 characters.',
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
  campaign_version_conflict: 'This campaign changed since you reviewed it. Reload the campaign list and review the latest saved version before approving again. Nothing was approved by this request.',
  invalid_expected_version: 'Approval requires the positive integer version you reviewed. Reload the campaign list before approving.',
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
export function isConfigured(health: AccountHealth): boolean {
  return health.configured.origin && health.configured.provider && health.configured.store;
}

/** Same-origin, cookie-only transport. No retries of unsafe requests. */
export class AccountsClient {
  private csrf: string | null = null;
  private sessionEpoch = 0;
  private readonly transport: typeof fetch;
  constructor(transport: typeof fetch = (...args) => fetch(...args)) { this.transport = transport; }

  clearSession() { this.csrf = null; this.sessionEpoch++; }

  private async request<T>(path: string, body?: object, authenticated = false, sessionBound = authenticated): Promise<T> {
    if ((authenticated || sessionBound) && !this.csrf) throw new AccountApiError(401, 'session_required');
    const epoch = this.sessionEpoch;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await this.transport(`/api/accounts${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        credentials: 'same-origin', cache: 'no-store', redirect: 'error',
        headers: {
          Accept: 'application/json',
          ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
          ...(authenticated ? { 'x-axp-csrf': this.csrf! } : {}),
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
    const result = await this.request<{ signedOut: true }>('/auth/signout', {}, Boolean(this.csrf));
    if (result.signedOut !== true) throw new AccountApiError(502, 'invalid_response');
    this.clearSession();
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
