# Accounts contracts v1

## Identity and transport

Supabase URL: the dedicated AXP project's configured `AXP_SUPABASE_URL`.
Server config: `AXP_ACCOUNTS_ENABLED=1`, `AXP_SUPABASE_URL`,
`AXP_SUPABASE_PUBLISHABLE_KEY`, `AXP_ACCOUNTS_ORIGIN` (exact HTTPS origin,
loopback HTTP allowed locally). Existing private durable store and `AXP_STATE_KEY`
protect hosted snapshots; account state is separate from demo financial state.

All routes below start `/api/accounts`. JSON only, no-store. Unsafe requests must
have exact configured Origin. Authenticated writes also require `x-axp-csrf`
from `/session`. Cookie is opaque, HttpOnly, SameSite=Lax, Path=/; Secure on HTTPS.
Public responses never contain provider access/refresh tokens or session hashes.
Unknown fields and client-supplied identity/ownership fields are rejected.

The account browser client serializes its requests through complete response-body
consumption, so independently mounted panels do not race the backend workspace
lease. This is client-local ordering, not a replacement for server-side fencing
or multi-client coordination. Failures release the queue without automatic
retries. Owner requests capture their session epoch and CSRF; a changed session
rejects queued owner actions before transport and discards stale responses.
Sign-out invalidates local authority immediately while submitting only its
captured sign-out CSRF. The shared demo and publisher SDK transports are unchanged.

- `GET /health` → `{enabled, provider:"supabase", configured, capabilities}`.
- `POST /auth/signup` `{email,password}` → `{confirmationRequired:true}`.
- `POST /auth/signin` `{email,password}` → `{signedIn:true}` + session cookie.
- `POST /auth/confirm` `{tokenHash}` → `{signedIn:true}` + session cookie.
  Provider email confirmation link opens `/account/?token_hash=...&type=email`;
  the browser removes URL credentials immediately, then waits for an explicit
  confirmation click before posting the native 56-hex hash from memory.
- `GET /session` → `{authenticated:false}` or
  `{authenticated:true,user:{id,email,displayName},csrf,organizations,capabilities}`.
- `POST /auth/signout` `{}` → `{signedOut:true}`; invalidate local session even
  if provider revocation is unavailable. CSRF required when authenticated.
- `POST /profile` `{displayName}` → `{user}`.
- `POST /organizations` `{name}` → `{organization}`.
- `GET /organizations/:id` → `{organization,advertiser,apps}`.
- `POST /organizations/:id/advertiser` `{name,website,description}` → `{advertiser}`.
- `POST /organizations/:id/apps` → `{app}`; fields below.
- `POST /organizations/:id/apps/:appId` → `{app}`; same fields below.

App fields: `{name,website,allowedOrigins:string[],blockedCategories:string[],
payout:{network:"solana-devnet"|"tempo-testnet",address:string}|null}`.
Websites HTTPS (loopback HTTP accepted for app development). Origin lists contain
origins only, no paths/wildcards. No payment/credential authority derived from these
declarations. The profile-only configuration reports profile capabilities;
campaign serving, app credentials and financial capabilities depend on the
separately configured account-network services. Inspect actual capability and
readiness responses rather than deriving them from a saved profile.

## Profile database and session persistence

Real-provider runtime profiles are stored in dedicated AXP Supabase PostgreSQL.
`AXP_ACCOUNTS_PROFILE_STORE=supabase` is the default. The request-scoped repository
binds only the verified provider identity/access token, then invokes
`axp_account_operation` with that user's JWT. Database RLS independently enforces
ownership. No browser-supplied identity or service-role/admin key is accepted.
The API awaits every store operation; the legacy synchronous SQLite store remains
only for explicit offline fixtures. Vercel refuses the fixture profile mode.

Opaque sessions remain in the existing encrypted durable backend snapshot. A
minimal local identity reference supports its FK, never profile reads or updates.
These private sessions are not stored in public Supabase tables. Campaigns and
credentials use their own account-resource RPCs; private financial records use
the backend-only finance RPC. The exchange ledger and shared demonstration retain
separate state. See [finance architecture](FINANCE_CLOUD_ACCEPTANCE.md).

Health additionally returns `profileStore: "supabase" | "sqlite-fixture"` when
configured. This identifies configuration, not standalone proof of DB reachability;
an authenticated session read verifies the actual profile RPC path.

## Store interface (async-capable; synchronous SQLite only for offline fixtures)

`createAccountStore({dir,now=Date.now})` returns:

- `ensureUser({id,email})` (provider-verified only) → public `{id,email,displayName}`.
- `user(userId)`, `updateProfile(userId,{displayName})` → public user.
- `organizations(userId)` → owner organization list.
- `createOrganization(userId,{name})` → `{id,name,role:"owner",createdAt,updatedAt}`.
- `organization(userId,orgId)` → same; nonexistent/foreign both `not_found`404.
- `details(userId,orgId)` → `{organization,advertiser,apps}`.
- `saveAdvertiser(userId,orgId,input)` → advertiser with server IDs/org binding.
- `saveApp(userId,orgId,input,appId=null)` → app with server IDs/org binding.
- `putSession({hash,userId,accessToken,refreshToken,expiresAt,absoluteExpiresAt,csrf})`.
- `session(hash)` → private record or null. `deleteSession(hash)`.
- `close()`.

Store validates exact fields, lengths, URLs, address shape, owner membership;
transactions protect multi-row operations; no untrusted table/key construction.
Errors `{code,status}` with stable safe codes. Sessions expire after at most seven
days absolute; provider access refresh serialized through durable snapshot lease.

## Readiness boundary

The `/api/product` namespace serves the shared demonstration. Account-owned
publishers integrate through `/api/accounts/sdk`, using their own server-side
app key. Account identity, app credentials and wallet-control proofs have distinct
authority; none substitutes for another. Account creation alone does not activate
campaign serving or fund a channel.

### Connected-journey additions

Owner-only `GET /organizations/:orgId/apps/:appId/integration` projects readiness
from the same SDK configuration, plus active credential metadata and the server's
broadcast gate. It takes no SDK secret, creates no opportunity and invokes no
model/payment transport. Foreign resources return the same 404 as missing ones.
Readiness is a point-in-time check, not a promise of inventory or a winning bid.

Reports retain their v1 money/receipt fields and add optional `activity` (latest
100 saved entries) and `activityTotal` (all matching entries). Campaign activity
projects only that campaign's decision/bid/exclusion and delivery state. App
activity projects its own opportunity result and winning delivery, not competitors'
private inputs. Source provenance distinguishes fixtures, actual execution and
unavailable calls. Missing decisions are never invented skips. Reports contain no
question text, targeting hints, credentials or delivery tokens. They derive from
saved outcomes; no second accounting ledger is added.

Acceptance order: setup/readiness → private reports → connected synthetic HTTP
and browser journey. Participant-wallet funding and hosted model execution remain
separate acceptance, with broadcasts disabled throughout this build slice.
