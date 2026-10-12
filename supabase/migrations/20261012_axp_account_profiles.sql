-- Additive AXP declarations only. No sessions, credentials or financial state.
-- Apply once as the Supabase SQL-editor migration owner, not an API role.
begin;

-- The only elevated helper is read-only and accepts no caller-supplied identity.
-- A signed JWT's email may be stale; use the confirmed Auth row instead. Do not
-- grant authenticated SELECT on auth.users. The public operation stays INVOKER.
create function public.axp_account_identity() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  verified_email text;
begin
  if actor is null or auth.role() is distinct from 'authenticated' then
    raise exception using errcode = 'PT401', message = 'unauthorized';
  end if;
  select u.email into verified_email from auth.users u
    where u.id = actor and u.email_confirmed_at is not null;
  if verified_email is null then
    raise exception using errcode = 'PT401', message = 'unauthorized';
  end if;
  return jsonb_build_object('id', actor, 'email', verified_email);
end;
$$;

create function public.axp_account_exact(value jsonb, fields text[]) returns void
language plpgsql immutable security invoker set search_path = '' as $$
begin
  if jsonb_typeof(value) is distinct from 'object' then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  if exists (select 1 from jsonb_object_keys(value) k where not (k = any(fields))) then
    raise exception using errcode = 'PT400', message = 'unknown_field';
  end if;
  if not (value ?& fields) then
    raise exception using errcode = 'PT400', message = 'missing_field';
  end if;
end;
$$;

create function public.axp_account_text(value jsonb, maximum integer, allow_empty boolean default false)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare
  raw text;
  result text;
  units integer := 0;
  i integer;
  -- ECMAScript trim whitespace (C0 controls are rejected before trimming).
  whitespace text := ' ' || chr(160) || chr(5760) || chr(8192) || chr(8193) ||
    chr(8194) || chr(8195) || chr(8196) || chr(8197) || chr(8198) || chr(8199) ||
    chr(8200) || chr(8201) || chr(8202) || chr(8232) || chr(8233) || chr(8239) ||
    chr(8287) || chr(12288) || chr(65279);
begin
  if jsonb_typeof(value) is distinct from 'string' then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  raw := value #>> '{}';
  if raw ~ '[\x01-\x1f\x7f]' or char_length(raw) > maximum then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  -- Match store.mjs's UTF-16 bounds, including non-BMP characters.
  for i in 1..char_length(raw) loop
    units := units + case when ascii(substr(raw, i, 1)) > 65535 then 2 else 1 end;
  end loop;
  result := btrim(raw, whitespace);
  if units > maximum or (not allow_empty and result = '') then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  return result;
end;
$$;

create function public.axp_account_url(value jsonb, origin_only boolean default false)
returns text language plpgsql immutable security invoker set search_path = '' as $$
declare
  raw text := public.axp_account_text(value, 2048);
  parts text[];
  authority text[];
  scheme text;
  host text;
  port text;
  suffix text;
begin
  if raw <> value #>> '{}' or raw ~ '[[:space:]\\*@]' then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  parts := regexp_match(raw, '^(https?)://([^/?#]+)(.*)$', 'i');
  if parts is null then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  scheme := lower(parts[1]);
  authority := regexp_match(parts[2], '^(\[[0-9a-fA-F:.]+\]|[a-zA-Z0-9_.-]+)(:([0-9]{1,5}))?$');
  if authority is null then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  host := lower(authority[1]);
  port := authority[3];
  if port is not null and port::integer > 65535 then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  if left(host, 1) = '[' then
    begin
      if family(substr(host, 2, length(host) - 2)::inet) <> 6 then
        raise exception using errcode = 'PT400', message = 'invalid_url';
      end if;
    exception when invalid_text_representation then
      raise exception using errcode = 'PT400', message = 'invalid_url';
    end;
  elsif host !~ '^[a-z0-9_]([a-z0-9_.-]*[a-z0-9_.])?$' or host like '%..%' then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  if scheme = 'http' and host not in ('localhost', '127.0.0.1', '[::1]') then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  suffix := parts[3];
  if origin_only and suffix not in ('', '/') then
    raise exception using errcode = 'PT400', message = 'invalid_url';
  end if;
  if port is not null then
    port := (port::integer)::text;
    if (scheme = 'https' and port = '443') or (scheme = 'http' and port = '80') then port := null; end if;
  end if;
  if not origin_only and (suffix = '' or left(suffix, 1) in ('?', '#')) then suffix := '/' || suffix; end if;
  return scheme || '://' || host || coalesce(':' || port, '') || case when origin_only then '' else suffix end;
end;
$$;
-- SQL rejects credentials, wildcards, non-HTTPS/non-loopback-HTTP, paths in
-- origins, whitespace and oversized URLs. WHATWG IDNA / dot-segment / percent
-- encoding normalization remains the JS adapter's responsibility. SQL accepts
-- a conservative ASCII-host subset (punycode is fine); URLs grant no authority.

create function public.axp_account_list(value jsonb, origins boolean) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare
  item jsonb;
  normalized text;
  result jsonb := '[]';
begin
  if jsonb_typeof(value) is distinct from 'array' then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  if jsonb_array_length(value) > 32 then
    raise exception using errcode = 'PT400', message = 'invalid_input';
  end if;
  for item in select v from jsonb_array_elements(value) v loop
    normalized := case when origins then public.axp_account_url(item, true)
      else public.axp_account_text(item, 80) end;
    if result @> jsonb_build_array(normalized) then
      raise exception using errcode = 'PT400', message = 'invalid_input';
    end if;
    result := result || jsonb_build_array(normalized);
  end loop;
  return result;
end;
$$;

create function public.axp_account_payout(value jsonb) returns jsonb
language plpgsql immutable security invoker set search_path = '' as $$
declare
  address text;
  alphabet constant text := '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  number numeric := 0;
  digit integer;
  bytes integer := 0;
  i integer;
begin
  if value = 'null'::jsonb then return value; end if;
  perform public.axp_account_exact(value, array['network', 'address']);
  address := public.axp_account_text(value->'address', 64);
  if address <> value->>'address' then
    raise exception using errcode = 'PT400', message = 'invalid_payout';
  end if;
  if value->>'network' = 'tempo-testnet' then
    if address !~ '^0x[0-9a-fA-F]{40}$' then
      raise exception using errcode = 'PT400', message = 'invalid_payout';
    end if;
  elsif value->>'network' = 'solana-devnet' then
    if length(address) < 32 or length(address) > 44 then
      raise exception using errcode = 'PT400', message = 'invalid_payout';
    end if;
    for i in 1..length(address) loop
      digit := strpos(alphabet, substr(address, i, 1)) - 1;
      if digit < 0 then raise exception using errcode = 'PT400', message = 'invalid_payout'; end if;
      number := number * 58 + digit;
    end loop;
    while number > 0 loop
      bytes := bytes + 1;
      number := trunc(number / 256);
    end loop;
    if bytes + length(address) - length(ltrim(address, '1')) <> 32 then
      raise exception using errcode = 'PT400', message = 'invalid_payout';
    end if;
  else
    raise exception using errcode = 'PT400', message = 'invalid_payout';
  end if;
  return jsonb_build_object('network', value->>'network', 'address', address);
end;
$$;

create table public.axp_account_profiles (
  id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  email text not null default '',
  display_name text not null default ''
);
create table public.axp_account_orgs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.axp_account_profiles(id) on delete cascade,
  name text not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);
create index axp_account_orgs_owner on public.axp_account_orgs(owner_id, created_at, id);
create table public.axp_account_advertisers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.axp_account_orgs(id) on delete cascade,
  name text not null,
  website text not null,
  description text not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);
create table public.axp_account_apps (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.axp_account_orgs(id) on delete cascade,
  name text not null,
  website text not null,
  allowed_origins jsonb not null,
  blocked_categories jsonb not null,
  payout jsonb not null,
  created_at bigint not null default 0,
  updated_at bigint not null default 0
);
create index axp_account_apps_org on public.axp_account_apps(organization_id, created_at, id);

-- Enforce validations/quota on REST table writes as well as the RPC. Column
-- grants deny explicit identity/email/clock assignment; this guard also makes
-- identity/bindings immutable if a future grant is accidentally broadened.
create function public.axp_account_guard() returns trigger
language plpgsql security invoker set search_path = '' as $$
declare
  identity jsonb := public.axp_account_identity();
  actor uuid := (identity->>'id')::uuid;
  clock_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  if tg_table_name = 'axp_account_profiles' then
    if new.id is distinct from actor or (tg_op = 'UPDATE' and new.id is distinct from old.id) then
      raise exception using errcode = 'PT404', message = 'not_found';
    end if;
    new.email := public.axp_account_text(identity->'email', 254);
    if new.email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception using errcode = 'PT400', message = 'invalid_input';
    end if;
    new.display_name := public.axp_account_text(to_jsonb(new.display_name), 120, true);
    return new;
  end if;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_at is distinct from old.created_at then
      raise exception using errcode = 'PT400', message = 'invalid_input';
    end if;
    if tg_table_name = 'axp_account_orgs' then
      if new.owner_id is distinct from old.owner_id then
        raise exception using errcode = 'PT404', message = 'not_found';
      end if;
    elsif new.organization_id is distinct from old.organization_id then
      raise exception using errcode = 'PT404', message = 'not_found';
    end if;
  else
    new.created_at := clock_ms;
  end if;
  new.updated_at := clock_ms;
  new.name := public.axp_account_text(to_jsonb(new.name), 120);
  if tg_table_name = 'axp_account_orgs' then
    if new.owner_id is distinct from actor then
      raise exception using errcode = 'PT404', message = 'not_found';
    end if;
    if tg_op = 'INSERT' then
      -- Serialize ALL org inserts for an owner, including direct REST writes.
      perform 1 from public.axp_account_profiles where id = actor for update;
      if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
      if (select count(*) from public.axp_account_orgs where owner_id = actor) >= 20 then
        raise exception using errcode = 'PT409', message = 'limit_exceeded';
      end if;
    end if;
  else
    -- Binding checked before FK errors, so foreign/missing orgs look identical.
    perform 1 from public.axp_account_orgs where id = new.organization_id and owner_id = actor for update;
    if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
    new.website := public.axp_account_url(to_jsonb(new.website));
    if tg_table_name = 'axp_account_advertisers' then
      new.description := public.axp_account_text(to_jsonb(new.description), 2000, true);
    else
      new.allowed_origins := public.axp_account_list(new.allowed_origins, true);
      new.blocked_categories := public.axp_account_list(new.blocked_categories, false);
      new.payout := public.axp_account_payout(new.payout);
      if tg_op = 'INSERT' and (select count(*) from public.axp_account_apps where organization_id = new.organization_id) >= 50 then
        raise exception using errcode = 'PT409', message = 'limit_exceeded';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger axp_account_profiles_guard before insert or update on public.axp_account_profiles
  for each row execute function public.axp_account_guard();
create trigger axp_account_orgs_guard before insert or update on public.axp_account_orgs
  for each row execute function public.axp_account_guard();
create trigger axp_account_advertisers_guard before insert or update on public.axp_account_advertisers
  for each row execute function public.axp_account_guard();
create trigger axp_account_apps_guard before insert or update on public.axp_account_apps
  for each row execute function public.axp_account_guard();

alter table public.axp_account_profiles enable row level security;
alter table public.axp_account_orgs enable row level security;
alter table public.axp_account_advertisers enable row level security;
alter table public.axp_account_apps enable row level security;
create policy axp_account_profiles_owner on public.axp_account_profiles to authenticated
  using (id = ((select public.axp_account_identity())->>'id')::uuid)
  with check (id = ((select public.axp_account_identity())->>'id')::uuid);
create policy axp_account_orgs_owner on public.axp_account_orgs to authenticated
  using (owner_id = ((select public.axp_account_identity())->>'id')::uuid)
  with check (owner_id = ((select public.axp_account_identity())->>'id')::uuid);
create policy axp_account_advertisers_owner on public.axp_account_advertisers to authenticated
  using (exists (select 1 from public.axp_account_orgs o where o.id = organization_id))
  with check (exists (select 1 from public.axp_account_orgs o where o.id = organization_id));
create policy axp_account_apps_owner on public.axp_account_apps to authenticated
  using (exists (select 1 from public.axp_account_orgs o where o.id = organization_id))
  with check (exists (select 1 from public.axp_account_orgs o where o.id = organization_id));

-- Explicit DTO projections: no owner_id leaks; camelCase and millisecond clocks.
create function public.axp_account_org_dto(row_value public.axp_account_orgs) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id', row_value.id, 'name', row_value.name, 'role', 'owner',
    'createdAt', row_value.created_at, 'updatedAt', row_value.updated_at);
$$;
create function public.axp_account_advertiser_dto(row_value public.axp_account_advertisers) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id', row_value.id, 'organizationId', row_value.organization_id,
    'name', row_value.name, 'website', row_value.website, 'description', row_value.description,
    'createdAt', row_value.created_at, 'updatedAt', row_value.updated_at);
$$;
create function public.axp_account_app_dto(row_value public.axp_account_apps) returns jsonb
language sql immutable security invoker set search_path = '' as $$
  select jsonb_build_object('id', row_value.id, 'organizationId', row_value.organization_id,
    'name', row_value.name, 'website', row_value.website, 'allowedOrigins', row_value.allowed_origins,
    'blockedCategories', row_value.blocked_categories, 'payout', row_value.payout,
    'createdAt', row_value.created_at, 'updatedAt', row_value.updated_at);
$$;

create function public.axp_account_operation(operation text, payload jsonb default '{}'::jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  identity jsonb := public.axp_account_identity();
  actor uuid := (identity->>'id')::uuid;
  profile public.axp_account_profiles;
  org public.axp_account_orgs;
  advertiser public.axp_account_advertisers;
  app public.axp_account_apps;
  org_id uuid;
  app_id uuid;
  input jsonb;
  result jsonb;
begin
  case operation
    when 'ensureUser', 'user', 'organizations' then perform public.axp_account_exact(payload, array[]::text[]);
    when 'updateProfile' then perform public.axp_account_exact(payload, array['displayName']);
    when 'createOrganization' then perform public.axp_account_exact(payload, array['name']);
    when 'organization', 'details' then perform public.axp_account_exact(payload, array['orgId']);
    when 'saveAdvertiser' then perform public.axp_account_exact(payload, array['orgId', 'input']);
    when 'saveApp' then perform public.axp_account_exact(payload, array['orgId', 'input', 'appId']);
    else raise exception using errcode = 'PT400', message = 'invalid_input';
  end case;

  if operation = 'ensureUser' then
    -- INSERT only the permitted column. UPDATE preserves concurrent displayName
    -- edits; the trigger refreshes email from Auth on both paths.
    insert into public.axp_account_profiles as existing(display_name) values ('')
      on conflict (id) do update set display_name = existing.display_name
      returning * into profile;
  else
    select * into profile from public.axp_account_profiles where id = actor;
    if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
  end if;
  if operation = 'updateProfile' then
    update public.axp_account_profiles set display_name = public.axp_account_text(payload->'displayName', 120, true)
      where id = actor returning * into profile;
  end if;
  if operation in ('ensureUser', 'user', 'updateProfile') then
    return jsonb_build_object('id', profile.id, 'email', profile.email, 'displayName', profile.display_name);
  elsif operation = 'organizations' then
    select coalesce(jsonb_agg(public.axp_account_org_dto(o) order by o.created_at, o.id), '[]'::jsonb)
      into result from public.axp_account_orgs o where o.owner_id = actor;
    return result;
  elsif operation = 'createOrganization' then
    insert into public.axp_account_orgs(name) values (public.axp_account_text(payload->'name', 120)) returning * into org;
    return public.axp_account_org_dto(org);
  end if;

  begin
    if jsonb_typeof(payload->'orgId') is distinct from 'string' or
      (payload->>'orgId') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception using errcode = 'PT404', message = 'not_found';
    end if;
    org_id := (payload->>'orgId')::uuid;
  exception when invalid_text_representation then
    raise exception using errcode = 'PT404', message = 'not_found';
  end;
  select * into org from public.axp_account_orgs where id = org_id and owner_id = actor;
  if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
  if operation = 'organization' then return public.axp_account_org_dto(org); end if;
  if operation = 'details' then
    select public.axp_account_advertiser_dto(a) into result from public.axp_account_advertisers a where a.organization_id = org_id;
    return jsonb_build_object('organization', public.axp_account_org_dto(org), 'advertiser', result,
      'apps', (select coalesce(jsonb_agg(public.axp_account_app_dto(a) order by a.created_at, a.id), '[]'::jsonb)
        from public.axp_account_apps a where a.organization_id = org_id));
  end if;

  input := payload->'input';
  if operation = 'saveAdvertiser' then
    perform public.axp_account_exact(input, array['name', 'website', 'description']);
    insert into public.axp_account_advertisers(organization_id, name, website, description)
      values (org_id, public.axp_account_text(input->'name', 120), public.axp_account_url(input->'website'),
        public.axp_account_text(input->'description', 2000, true))
      on conflict (organization_id) do update set name = excluded.name, website = excluded.website,
        description = excluded.description returning * into advertiser;
    return public.axp_account_advertiser_dto(advertiser);
  end if;

  if payload->'appId' <> 'null'::jsonb then
    if jsonb_typeof(payload->'appId') is distinct from 'string' or
      (payload->>'appId') !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' then
      raise exception using errcode = 'PT404', message = 'not_found';
    end if;
    app_id := (payload->>'appId')::uuid;
    select * into app from public.axp_account_apps where id = app_id and organization_id = org_id;
    if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
  end if;
  perform public.axp_account_exact(input, array['name', 'website', 'allowedOrigins', 'blockedCategories', 'payout']);
  if app_id is null then
    insert into public.axp_account_apps(organization_id, name, website, allowed_origins, blocked_categories, payout)
      values (org_id, public.axp_account_text(input->'name', 120), public.axp_account_url(input->'website'),
        public.axp_account_list(input->'allowedOrigins', true), public.axp_account_list(input->'blockedCategories', false),
        public.axp_account_payout(input->'payout')) returning * into app;
  else
    update public.axp_account_apps set name = public.axp_account_text(input->'name', 120),
      website = public.axp_account_url(input->'website'), allowed_origins = public.axp_account_list(input->'allowedOrigins', true),
      blocked_categories = public.axp_account_list(input->'blockedCategories', false), payout = public.axp_account_payout(input->'payout')
      where id = app_id and organization_id = org_id returning * into app;
    if not found then raise exception using errcode = 'PT404', message = 'not_found'; end if;
  end if;
  return public.axp_account_app_dto(app);
exception
  -- Do not expose PostgreSQL diagnostics or private input through PostgREST.
  when sqlstate 'PT400' or sqlstate 'PT401' or sqlstate 'PT404' or sqlstate 'PT409' then raise;
  when others then raise exception using errcode = 'PT503', message = 'store_unavailable';
end;
$$;

-- Supabase default privileges can grant broad table/function access: revoke on
-- each new object explicitly. No DELETE operation exists in the frozen store.
revoke all on public.axp_account_profiles, public.axp_account_orgs,
  public.axp_account_advertisers, public.axp_account_apps from public, anon, authenticated;
grant select on public.axp_account_profiles, public.axp_account_orgs,
  public.axp_account_advertisers, public.axp_account_apps to authenticated;
grant insert(display_name), update(display_name) on public.axp_account_profiles to authenticated;
grant insert(name), update(name) on public.axp_account_orgs to authenticated;
grant insert(organization_id, name, website, description), update(name, website, description)
  on public.axp_account_advertisers to authenticated;
grant insert(organization_id, name, website, allowed_origins, blocked_categories, payout),
  update(name, website, allowed_origins, blocked_categories, payout) on public.axp_account_apps to authenticated;

revoke all on function public.axp_account_identity(), public.axp_account_exact(jsonb, text[]),
  public.axp_account_text(jsonb, integer, boolean), public.axp_account_url(jsonb, boolean),
  public.axp_account_list(jsonb, boolean), public.axp_account_payout(jsonb), public.axp_account_guard(),
  public.axp_account_org_dto(public.axp_account_orgs),
  public.axp_account_advertiser_dto(public.axp_account_advertisers),
  public.axp_account_app_dto(public.axp_account_apps), public.axp_account_operation(text, jsonb)
  from public, anon, authenticated;
grant execute on function public.axp_account_identity(), public.axp_account_exact(jsonb, text[]),
  public.axp_account_text(jsonb, integer, boolean), public.axp_account_url(jsonb, boolean),
  public.axp_account_list(jsonb, boolean), public.axp_account_payout(jsonb),
  public.axp_account_org_dto(public.axp_account_orgs),
  public.axp_account_advertiser_dto(public.axp_account_advertisers),
  public.axp_account_app_dto(public.axp_account_apps), public.axp_account_operation(text, jsonb)
  to authenticated;

commit;
