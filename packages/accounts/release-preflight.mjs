// Configuration inspection only: deliberately no imports of runtime/store services.
export const EXPECTED_ACCOUNT_PROJECT = 'qcejmyhaakoedjaqmcub';
export const ACCOUNT_HEALTH_PATH = '/api/accounts/health';
const ACCOUNT_WORKSPACES = Object.freeze({
  sessions: 'axp-accounts-v1',
  synthetic: 'axp-account-network-v1',
  native: 'axp-account-network-native-v1',
});
const present = value => typeof value === 'string' && value.trim().length > 0;
const opaqueKey = (value, prefix) => typeof value === 'string' &&
  new RegExp(`^${prefix}[A-Za-z0-9_-]{16,}$`, 'u').test(value);

function exactHTTPSOrigin(value) {
  try {
    const url = new URL(value);
    return typeof value === 'string' && url.protocol === 'https:' && url.origin === value &&
      !url.username && !url.password && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch { return false; }
}

function validStateKey(value) {
  if (typeof value !== 'string') return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length === 32 && bytes.toString('base64') === value;
}

function durableStore(config) {
  // Match createKVFromConfig's selection order without constructing a backend.
  const mode = config.AXP_RUN_STORE;
  const blob = config.BLOB_READ_WRITE_TOKEN;
  const url = config.KV_REST_API_URL || config.UPSTASH_REDIS_REST_URL;
  const token = config.KV_REST_API_TOKEN || config.UPSTASH_REDIS_REST_TOKEN;
  if (mode && !['blob', 'upstash', 'file'].includes(mode)) return 'invalid';
  if (mode === 'file') return 'file';
  if (mode === 'upstash' || (!mode && !blob && url && token)) {
    return exactHTTPSOrigin(url) && present(token) ? 'upstash' : 'invalid';
  }
  if (blob && mode !== 'upstash') {
    // The existing adapter addresses the store's PRIVATE Blob hostname.
    return /^vercel_blob_rw_[A-Za-z0-9-]+_[A-Za-z0-9_-]+$/u.test(blob) &&
      (!config.VERCEL_BLOB_API_URL || config.VERCEL_BLOB_API_URL === 'https://vercel.com/api/blob')
      ? 'blob' : 'invalid';
  }
  return 'missing';
}

/** No I/O, environment loading, service initialization or credential output. */
export function checkAccountsReleaseConfig({config = {}, expectedOrigin} = {}) {
  const checks = [];
  const check = (id, ok) => checks.push({id, ok: ok === true});
  const mode = config.AXP_ACCOUNT_FINANCIAL_MODE ?? 'synthetic';
  const store = durableStore(config);
  check('expected_origin', exactHTTPSOrigin(expectedOrigin) &&
    !['https://axp.one', 'https://www.axp.one'].includes(expectedOrigin));
  check('account_origin_exact', exactHTTPSOrigin(config.AXP_ACCOUNTS_ORIGIN) &&
    config.AXP_ACCOUNTS_ORIGIN === expectedOrigin);
  const projectURL = `https://${EXPECTED_ACCOUNT_PROJECT}.supabase.co`;
  check('dedicated_supabase_project', config.AXP_SUPABASE_URL === projectURL ||
    config.AXP_SUPABASE_URL === `${projectURL}/`);
  check('supabase_publishable_key', opaqueKey(config.AXP_SUPABASE_PUBLISHABLE_KEY, 'sb_publishable_'));
  check('supabase_catalogue_secret', opaqueKey(config.AXP_NETWORK_SUPABASE_SECRET_KEY, 'sb_secret_'));
  check('supabase_profile_store', config.AXP_ACCOUNTS_PROFILE_STORE === 'supabase');
  check('accounts_enabled', config.AXP_ACCOUNTS_ENABLED === '1');
  check('account_serving_enabled', config.AXP_ACCOUNT_SERVING_ENABLED === '1');
  check('account_financial_mode', ['synthetic', 'devnet'].includes(mode));
  check('account_payments_configuration', ['0', '1', undefined].includes(config.AXP_ACCOUNT_PAYMENTS_ENABLED) &&
    (mode !== 'devnet' || config.AXP_ACCOUNT_PAYMENTS_ENABLED === '1'));
  check('broadcasts_explicitly_disabled', config.AXP_ACCOUNT_PAYMENT_BROADCAST_ENABLED === '0');
  check('hosted_preview', config.VERCEL === '1' && config.VERCEL_ENV === 'preview');
  check('shared_demo_disabled', config.AXP_PRODUCT_ENABLED !== '1');
  check('browser_fixture_disabled', config.AXP_ACCOUNT_BROWSER_FIXTURE !== '1');
  check('private_durable_store_configuration', ['blob', 'upstash'].includes(store));
  check('state_encryption_key', validStateKey(config.AXP_STATE_KEY));
  // Account IDs are hard-coded by hosted.mjs/network-hosted.mjs, not env knobs.
  // Check the demo's configurable identity against ALL account namespaces.
  const demoID = config.AXP_PRODUCT_WORKSPACE_ID ?? 'demo';
  check('separate_workspace_identities', !Object.values(ACCOUNT_WORKSPACES).includes(demoID));
  return {
    schemaVersion: 'axp.accounts-release-preflight.v1',
    scope: 'isolated-account-preview-non-spending',
    ok: checks.every(item => item.ok),
    checks,
    expectedProject: EXPECTED_ACCOUNT_PROJECT,
    storage: ['blob', 'upstash', 'file', 'missing'].includes(store) ? store : 'invalid',
    workspaces: {
      sessions: ACCOUNT_WORKSPACES.sessions,
      serving: mode === 'devnet' ? ACCOUNT_WORKSPACES.native : ACCOUNT_WORKSPACES.synthetic,
      kind: 'accounts',
    },
  };
}

/** Optional single unauthenticated GET; failures never include remote data/errors. */
export async function runAccountsReleasePreflight({config = {}, expectedOrigin,
  health = false, fetchImpl = globalThis.fetch, timeoutMs = 5000} = {}) {
  const report = checkAccountsReleaseConfig({config, expectedOrigin});
  report.health = {status: health ? 'blocked' : 'not_requested'};
  if (!health || !report.ok) return report;
  const check = (id, ok) => report.checks.push({id, ok: ok === true});
  if (typeof fetchImpl !== 'function' || !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) {
    check('health_request_configuration', false);
    report.ok = false;
    return report;
  }
  try {
    const response = await fetchImpl(`${expectedOrigin}${ACCOUNT_HEALTH_PATH}`, {
      method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store',
      headers: {accept: 'application/json'}, signal: AbortSignal.timeout(timeoutMs),
    });
    // Do not consume error pages, redirects or their potentially sensitive bodies.
    if (!response.ok || response.status !== 200 || response.redirected) throw Error();
    const body = await response.json();
    const serving = body?.serving;
    check('health_accounts_ready', body?.enabled === true && body?.provider === 'supabase' &&
      body?.profileStore === 'supabase' && body?.configured?.origin === true &&
      body?.configured?.provider === true && body?.configured?.store === true);
    check('health_resources_ready', body?.capabilities?.profiles === true &&
      body?.capabilities?.campaignDrafts === true && body?.capabilities?.appCredentials === true);
    check('health_catalogue_ready', serving?.ready === true && body?.capabilities?.campaignServing === true);
    check('health_financial_mode', serving?.financialMode === (config.AXP_ACCOUNT_FINANCIAL_MODE ?? 'synthetic'));
    check('health_broadcasts_disabled', serving?.broadcastEnabled === false && body?.capabilities?.nativeFunding === false);
    if (config.AXP_ACCOUNT_PAYMENTS_ENABLED === '1') {
      check('health_finance_schema_ready', serving?.walletBindings === true && body?.capabilities?.walletBindings === true);
    }
    report.health = {
      status: 'checked',
      catalogue: serving?.ready === true ? 'ready' : 'unavailable',
      financeSchema: config.AXP_ACCOUNT_PAYMENTS_ENABLED === '1'
        ? (serving?.ready === true && serving?.walletBindings === true ? 'ready' : 'unavailable') : 'not_checked',
      profileSchema: 'not_checked',
    };
  } catch {
    check('health_response_available', false);
    report.health = {status: 'unavailable'};
  }
  report.ok = report.checks.every(item => item.ok);
  return report;
}
