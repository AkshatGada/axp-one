import type {
  AccountHealth, AccountSession, AccountUser, AdvertiserInput, AdvertiserProfile,
  AIApp, AppInput, Credentials, Organization, OrganizationDetails,
} from './types.ts';

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
  origin_invalid: 'This page origin is not allowed by the account service.',
  invalid_url: 'Check website URLs and allowed origins. Use HTTPS or loopback HTTP; origins cannot contain paths or wildcards.',
  invalid_payout: 'Check the network and payout address. This is a declaration only.',
  limit_exceeded: 'The account resource limit has been reached.',
  not_found: 'This organization or app is no longer available to your account.',
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
  return record(value) && ['profiles', 'campaignServing', 'nativeFunding', 'appCredentials']
    .every(key => typeof value[key] === 'boolean');
}
export function isConfigured(health: AccountHealth): boolean {
  return health.configured.origin && health.configured.provider && health.configured.store;
}

/** Same-origin, cookie-only transport. No retries of unsafe requests. */
export class AccountsClient {
  private csrf: string | null = null;
  private readonly transport: typeof fetch;
  constructor(transport: typeof fetch = (...args) => fetch(...args)) { this.transport = transport; }

  clearSession() { this.csrf = null; }

  private async request<T>(path: string, body?: object, authenticated = false): Promise<T> {
    if (authenticated && !this.csrf) throw new AccountApiError(401, 'session_required');
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
        data.provider !== 'supabase' || !hasCapabilities(data.capabilities)) {
      throw new AccountApiError(502, 'invalid_response');
    }
    return data;
  }
  async session(): Promise<AccountSession> {
    this.clearSession();
    const data = await this.request<AccountSession>('/session');
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
    return this.request<OrganizationDetails>(`/organizations/${encodeURIComponent(id)}`);
  }
  advertiser(id: string, input: AdvertiserInput) {
    return this.request<{ advertiser: AdvertiserProfile }>(`/organizations/${encodeURIComponent(id)}/advertiser`, input, true);
  }
  app(id: string, input: AppInput, appId?: string) {
    return this.request<{ app: AIApp }>(`/organizations/${encodeURIComponent(id)}/apps${appId ? `/${encodeURIComponent(appId)}` : ''}`, input, true);
  }
}
