-- Run in the Supabase SQL editor as the migration owner AFTER the migration.
-- Execute the entire file together. Everything, including two fresh synthetic
-- auth.users rows, temporary test helpers and all declarations, is rolled back.
-- No existing Auth identity is selected for mutation; no real customer is used.
begin;
set local statement_timeout = '30s';
set local lock_timeout = '5s';

create temporary table axp_account_acceptance_state (key text primary key, value jsonb not null) on commit drop;
grant select, insert, update on axp_account_acceptance_state to authenticated;
-- GRANT does not resolve the pg_temp alias; use this connection's actual schema.
do $$begin
  execute format('grant usage on schema %I to authenticated, anon',
    (select nspname from pg_namespace where oid = pg_my_temp_schema()));
end;$$;

create function pg_temp.axp_assert(ok boolean, label text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  if ok is not true then raise exception 'acceptance_failed: %', label; end if;
end;
$$;
create function pg_temp.axp_expect(query text, code text, state text) returns void
language plpgsql security invoker set search_path = '' as $$
begin
  begin
    execute query;
  exception when others then
    if sqlstate = state and (code is null or sqlerrm = code) then return; end if;
    raise exception 'unexpected_error: %, % (expected %, %)', sqlstate, sqlerrm, state, code;
  end;
  raise exception 'acceptance_failed: expected % / %', state, code;
end;
$$;

insert into axp_account_acceptance_state values
  ('user_a', to_jsonb(gen_random_uuid())), ('user_b', to_jsonb(gen_random_uuid()));
insert into auth.users(id, aud, role, email, email_confirmed_at, created_at, updated_at)
  select (value #>> '{}')::uuid, 'authenticated', 'authenticated',
    'axp-sql-fixture-' || (value #>> '{}') || '@example.invalid', now(), now(), now()
  from axp_account_acceptance_state where key in ('user_a', 'user_b');

-- Catalog checks complement behavioral assertions; do not rely on owner bypass.
do $$
declare
  relation text;
  column_name text;
begin
  perform pg_temp.axp_assert((select not prosecdef and proconfig @> array['search_path=""']
    from pg_proc where oid = 'public.axp_account_operation(text,jsonb)'::regprocedure), 'invoker/fixed path');
  perform pg_temp.axp_assert(has_function_privilege('authenticated', 'public.axp_account_operation(text,jsonb)', 'EXECUTE'), 'authenticated RPC');
  perform pg_temp.axp_assert(not has_function_privilege('anon', 'public.axp_account_operation(text,jsonb)', 'EXECUTE'), 'anonymous RPC denied');
  perform pg_temp.axp_assert(not has_table_privilege('authenticated', 'auth.users', 'SELECT'), 'no broad Auth read');
  foreach relation in array array['axp_account_profiles', 'axp_account_orgs', 'axp_account_advertisers', 'axp_account_apps'] loop
    perform pg_temp.axp_assert((select relrowsecurity from pg_class where oid = ('public.' || relation)::regclass), relation || ' RLS');
    perform pg_temp.axp_assert(has_table_privilege('authenticated', 'public.' || relation, 'SELECT'), relation || ' read');
    perform pg_temp.axp_assert(not has_table_privilege('anon', 'public.' || relation, 'SELECT,INSERT,UPDATE,DELETE'), relation || ' anonymous denied');
    perform pg_temp.axp_assert(not has_table_privilege('authenticated', 'public.' || relation, 'DELETE,TRUNCATE,TRIGGER'), relation || ' no delete/DDL');
    perform pg_temp.axp_assert(not has_column_privilege('authenticated', 'public.' || relation, 'id', 'INSERT,UPDATE'), relation || ' protected ID');
    if relation = 'axp_account_profiles' then
      perform pg_temp.axp_assert(not has_column_privilege('authenticated', 'public.' || relation, 'email', 'INSERT,UPDATE'), 'protected email');
    elsif relation = 'axp_account_orgs' then
      perform pg_temp.axp_assert(not has_column_privilege('authenticated', 'public.' || relation, 'owner_id', 'INSERT,UPDATE'), 'protected owner');
    else
      perform pg_temp.axp_assert(not has_column_privilege('authenticated', 'public.' || relation, 'organization_id', 'UPDATE'), relation || ' immutable binding');
    end if;
    if relation <> 'axp_account_profiles' then
      foreach column_name in array array['created_at', 'updated_at'] loop
        perform pg_temp.axp_assert(not has_column_privilege('authenticated', 'public.' || relation, column_name, 'INSERT,UPDATE'), relation || ' protected clocks');
      end loop;
    end if;
  end loop;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claims', jsonb_build_object('sub', (select value #>> '{}' from axp_account_acceptance_state where key = 'user_a'),
  'role', 'authenticated', 'email', 'not-authoritative@example.invalid')::text, true);

do $$
declare
  person jsonb;
  org jsonb;
  second_org jsonb;
  advertiser jsonb;
  updated jsonb;
  app jsonb;
  details jsonb;
  input jsonb := '{"name":"Fixture app","website":"https://app.example.invalid","allowedOrigins":["https://APP.example.invalid:443/","http://localhost:3430"],"blockedCategories":["gambling"],"payout":{"network":"tempo-testnet","address":"0x0000000000000000000000000000000000000000"}}';
begin
  perform pg_temp.axp_assert(current_user = 'authenticated', 'real authenticated execution');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('user', '{}')$q$, 'not_found', 'PT404');
  person := public.axp_account_operation('ensureUser', '{}');
  perform pg_temp.axp_assert(person = jsonb_build_object('id', auth.uid(), 'email', 'axp-sql-fixture-' || auth.uid() || '@example.invalid', 'displayName', ''), 'identity DTO / authoritative email');
  person := public.axp_account_operation('updateProfile', '{"displayName":"  Fixture owner  "}');
  perform pg_temp.axp_assert(person->>'displayName' = 'Fixture owner', 'profile update');
  perform pg_temp.axp_assert(public.axp_account_operation('ensureUser', '{}') = person, 'repeated ensure preserves displayName');
  perform pg_temp.axp_assert(public.axp_account_operation('user', '{}') = person, 'profile read');
  perform pg_temp.axp_assert(public.axp_account_operation('organizations', '{}') = '[]'::jsonb, 'empty organization list');

  org := public.axp_account_operation('createOrganization', '{"name":"  Fixture org A  "}');
  second_org := public.axp_account_operation('createOrganization', '{"name":"Fixture other org A"}');
  insert into axp_account_acceptance_state values ('org_a', org->'id'), ('org_a2', second_org->'id');
  perform public.axp_account_exact(org, array['id', 'name', 'role', 'createdAt', 'updatedAt']);
  perform pg_temp.axp_assert(org->>'name' = 'Fixture org A' and org->>'role' = 'owner' and
    jsonb_typeof(org->'createdAt') = 'number' and (org->>'createdAt')::bigint > 0, 'organization DTO');
  perform pg_temp.axp_assert(public.axp_account_operation('organization', jsonb_build_object('orgId', org->'id')) = org, 'organization read');
  perform pg_temp.axp_assert(jsonb_array_length(public.axp_account_operation('organizations', '{}')) = 2, 'organization list');
  details := public.axp_account_operation('details', jsonb_build_object('orgId', org->'id'));
  perform pg_temp.axp_assert(details->'advertiser' = 'null'::jsonb and details->'apps' = '[]'::jsonb, 'empty details');

  advertiser := public.axp_account_operation('saveAdvertiser', jsonb_build_object('orgId', org->'id',
    'input', jsonb_build_object('name', 'Fixture brand', 'website', 'https://brand.example.invalid', 'description', 'Declared only')));
  updated := public.axp_account_operation('saveAdvertiser', jsonb_build_object('orgId', org->'id',
    'input', jsonb_build_object('name', 'Updated brand', 'website', 'https://brand.example.invalid/', 'description', '')));
  perform public.axp_account_exact(updated, array['id', 'organizationId', 'name', 'website', 'description', 'createdAt', 'updatedAt']);
  perform pg_temp.axp_assert(updated->'id' = advertiser->'id' and updated->'createdAt' = advertiser->'createdAt' and
    updated->'organizationId' = org->'id' and updated->>'name' = 'Updated brand', 'advertiser stable binding/upsert');

  app := public.axp_account_operation('saveApp', jsonb_build_object('orgId', org->'id', 'input', input, 'appId', null));
  insert into axp_account_acceptance_state values ('app_a', app->'id');
  perform public.axp_account_exact(app, array['id', 'organizationId', 'name', 'website', 'allowedOrigins', 'blockedCategories', 'payout', 'createdAt', 'updatedAt']);
  perform pg_temp.axp_assert(app->'allowedOrigins' = '["https://app.example.invalid","http://localhost:3430"]'::jsonb and
    app->>'website' = 'https://app.example.invalid/', 'URL/origin normalization');
  input := input || '{"name":"Updated app","payout":{"network":"solana-devnet","address":"11111111111111111111111111111111"}}'::jsonb;
  updated := public.axp_account_operation('saveApp', jsonb_build_object('orgId', org->'id', 'input', input, 'appId', app->'id'));
  perform pg_temp.axp_assert(updated->'id' = app->'id' and updated->'createdAt' = app->'createdAt' and
    updated->'organizationId' = org->'id' and updated->>'name' = 'Updated app', 'app update/stable binding');
  details := public.axp_account_operation('details', jsonb_build_object('orgId', org->'id'));
  perform pg_temp.axp_assert(details->'apps' = jsonb_build_array(updated) and details->'advertiser' is distinct from 'null'::jsonb, 'details composition');
  perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', 'saveApp',
    jsonb_build_object('orgId', second_org->'id', 'input', input, 'appId', app->'id')), 'not_found', 'PT404');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('details', '{"orgId":"not-a-uuid"}')$q$, 'not_found', 'PT404');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('organization', '{"orgId":null}')$q$, 'not_found', 'PT404');

  -- Unknown/missing fields and identity-forgery inputs rejected by the RPC.
  perform pg_temp.axp_expect($q$select public.axp_account_operation('ensureUser', '{"id":"forged","email":"forged@example.invalid"}')$q$, 'unknown_field', 'PT400');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('updateProfile', '{}')$q$, 'missing_field', 'PT400');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('createOrganization', '{"name":42}')$q$, 'invalid_input', 'PT400');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('user', '[]')$q$, 'invalid_input', 'PT400');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('unknown', '{}')$q$, 'invalid_input', 'PT400');
end;
$$;

-- Direct table access cannot forge identity/email/bindings/clocks or bypass
-- validators. These are actual statements under authenticated, not just ACL reads.
select pg_temp.axp_expect($q$insert into public.axp_account_profiles(id, email, display_name) values (gen_random_uuid(), 'forged@example.invalid', '')$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_profiles set id = gen_random_uuid()$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_profiles set email = 'forged@example.invalid'$q$, null, '42501');
select pg_temp.axp_expect($q$insert into public.axp_account_orgs(owner_id, name) values (gen_random_uuid(), 'forged')$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_orgs set owner_id = gen_random_uuid()$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_apps set organization_id = gen_random_uuid()$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_advertisers set organization_id = gen_random_uuid()$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_apps set id = gen_random_uuid()$q$, null, '42501');
select pg_temp.axp_expect($q$update public.axp_account_orgs set created_at = 1$q$, null, '42501');
select pg_temp.axp_expect($q$delete from public.axp_account_orgs$q$, null, '42501');
select pg_temp.axp_expect($q$insert into public.axp_account_orgs(name) values ('')$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_profiles set display_name = repeat('x',121)$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_profiles set display_name = repeat(chr(128512),61)$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set website = 'http://public.example.invalid'$q$, 'invalid_url', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set website = 'https://user:pass@app.example.invalid'$q$, 'invalid_url', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set allowed_origins = '["https://app.example.invalid/path"]'$q$, 'invalid_url', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set allowed_origins = '["https://app.example.invalid/#"]'$q$, 'invalid_url', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set allowed_origins = '["https://*.example.invalid"]'$q$, 'invalid_url', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set allowed_origins = '["https://app.example.invalid","https://APP.example.invalid:443/"]'$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set blocked_categories = '["same"," same "]'$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set blocked_categories = '{}'::jsonb$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set blocked_categories = (select jsonb_agg('x'||g) from generate_series(1,33) g)$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set blocked_categories = jsonb_build_array(repeat('x',81))$q$, 'invalid_input', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set payout = '{"network":"mainnet","address":"0x0000000000000000000000000000000000000000"}'$q$, 'invalid_payout', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set payout = '{"network":"tempo-testnet","address":"0x123"}'$q$, 'invalid_payout', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set payout = '{"network":"solana-devnet","address":"111111111111111111111111111111111"}'$q$, 'invalid_payout', 'PT400');
select pg_temp.axp_expect($q$update public.axp_account_apps set payout = '{"network":"tempo-testnet","address":"0x0000000000000000000000000000000000000000","verified":true}'$q$, 'unknown_field', 'PT400');

-- Quotas cover RPC and direct inserts. Existing record updates remain possible
-- at the cap. Parent FOR UPDATE locks serialize competing insert transactions;
-- this single-session rollback acceptance does not claim a concurrency load test.
do $$
declare
  org_id uuid := (select (value #>> '{}')::uuid from axp_account_acceptance_state where key = 'org_a');
  i integer;
  app_id uuid := (select (value #>> '{}')::uuid from axp_account_acceptance_state where key = 'app_a');
begin
  for i in 3..20 loop perform public.axp_account_operation('createOrganization', jsonb_build_object('name', 'Fixture org ' || i)); end loop;
  perform pg_temp.axp_assert(jsonb_array_length(public.axp_account_operation('organizations', '{}')) = 20, '20 org cap boundary');
  perform pg_temp.axp_expect($q$select public.axp_account_operation('createOrganization', '{"name":"over cap"}')$q$, 'limit_exceeded', 'PT409');
  perform pg_temp.axp_expect($q$insert into public.axp_account_orgs(name) values ('direct over cap')$q$, 'limit_exceeded', 'PT409');
  for i in 2..50 loop
    insert into public.axp_account_apps(organization_id, name, website, allowed_origins, blocked_categories, payout)
      values (org_id, 'Fixture app ' || i, 'https://app.example.invalid/', '[]', '[]', 'null');
  end loop;
  perform pg_temp.axp_expect(format('insert into public.axp_account_apps(organization_id,name,website,allowed_origins,blocked_categories,payout) values (%L,%L,%L,%L,%L,%L)',
    org_id, 'over cap', 'https://app.example.invalid/', '[]', '[]', 'null'), 'limit_exceeded', 'PT409');
  perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', 'saveApp',
    jsonb_build_object('orgId', org_id, 'appId', null, 'input', jsonb_build_object('name','over cap', 'website','https://app.example.invalid/',
      'allowedOrigins','[]'::jsonb, 'blockedCategories','[]'::jsonb, 'payout',null))), 'limit_exceeded', 'PT409');
  perform public.axp_account_operation('saveApp', jsonb_build_object('orgId', org_id, 'appId', app_id,
    'input', jsonb_build_object('name','Updated at cap', 'website','http://[::1]:3430/',
      'allowedOrigins','["http://[::1]:3430"]'::jsonb, 'blockedCategories','[]'::jsonb, 'payout',null)));
  perform pg_temp.axp_assert((select count(*) = 50 from public.axp_account_apps where organization_id = org_id), '50 app cap boundary');
end;
$$;

-- Owner B sees none of A, and cross-owner requests return the same safe 404 as
-- nonexistent IDs. Test both mutation paths, including direct REST table inserts.
select set_config('request.jwt.claims', jsonb_build_object('sub', (select value #>> '{}' from axp_account_acceptance_state where key = 'user_b'),
  'role', 'authenticated', 'email', 'untrusted@example.invalid')::text, true);
do $$
declare
  org_a jsonb := (select value from axp_account_acceptance_state where key = 'org_a');
  org_b jsonb;
  app_b jsonb;
  input jsonb := '{"name":"B app","website":"https://b.example.invalid/","allowedOrigins":[],"blockedCategories":[],"payout":null}';
  op text;
begin
  perform public.axp_account_operation('ensureUser', '{}');
  perform pg_temp.axp_assert((select count(*) = 1 from public.axp_account_profiles), 'profile isolation');
  perform pg_temp.axp_assert(public.axp_account_operation('organizations', '{}') = '[]'::jsonb, 'organization isolation');
  perform pg_temp.axp_assert((select count(*) = 0 from public.axp_account_advertisers) and
    (select count(*) = 0 from public.axp_account_apps), 'child isolation');
  foreach op in array array['organization', 'details'] loop
    perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', op, jsonb_build_object('orgId', org_a)), 'not_found', 'PT404');
    perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', op, jsonb_build_object('orgId', gen_random_uuid())), 'not_found', 'PT404');
  end loop;
  perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', 'saveAdvertiser',
    jsonb_build_object('orgId', org_a, 'input', jsonb_build_object('name','B brand','website','https://b.example.invalid/','description',''))), 'not_found', 'PT404');
  perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', 'saveApp',
    jsonb_build_object('orgId', org_a, 'input', input, 'appId',null)), 'not_found', 'PT404');
  perform pg_temp.axp_expect(format('insert into public.axp_account_apps(organization_id,name,website,allowed_origins,blocked_categories,payout) values (%L,%L,%L,%L,%L,%L)',
    org_a #>> '{}', 'foreign insert', 'https://b.example.invalid/', '[]', '[]', 'null'), 'not_found', 'PT404');
  perform pg_temp.axp_expect(format('insert into public.axp_account_advertisers(organization_id,name,website,description) values (%L,%L,%L,%L)',
    org_a #>> '{}', 'foreign brand', 'https://b.example.invalid/', ''), 'not_found', 'PT404');
  update public.axp_account_orgs set name = 'foreign overwrite' where id = (org_a #>> '{}')::uuid;
  perform pg_temp.axp_assert(not found, 'foreign org update hidden');
  update public.axp_account_apps set name = 'foreign overwrite';
  perform pg_temp.axp_assert(not found, 'foreign app update hidden');
  org_b := public.axp_account_operation('createOrganization', '{"name":"Fixture org B"}');
  app_b := public.axp_account_operation('saveApp', jsonb_build_object('orgId', org_b->'id', 'input', input, 'appId', null));
  perform pg_temp.axp_assert(app_b->'organizationId' = org_b->'id', 'second owner CRUD');
  perform pg_temp.axp_expect(format('select public.axp_account_operation(%L,%L::jsonb)', 'saveApp',
    jsonb_build_object('orgId', org_b->'id', 'input', input, 'appId', (select value from axp_account_acceptance_state where key = 'app_a'))), 'not_found', 'PT404');
end;
$$;

-- Confirmation is checked in SQL even with an authenticated-role JWT. Only
-- mutate the second fresh synthetic identity, as migration owner, then restore.
reset role;
update auth.users set email_confirmed_at = null
  where id = (select (value #>> '{}')::uuid from axp_account_acceptance_state where key = 'user_b');
set local role authenticated;
select pg_temp.axp_expect($q$select public.axp_account_operation('ensureUser', '{}')$q$, 'unauthorized', 'PT401');
select pg_temp.axp_expect($q$select * from public.axp_account_profiles$q$, 'unauthorized', 'PT401');
select pg_temp.axp_expect($q$insert into public.axp_account_orgs(name) values ('unconfirmed')$q$, 'unauthorized', 'PT401');
select set_config('request.jwt.claims', '{"role":"authenticated"}', true);
select pg_temp.axp_expect($q$select public.axp_account_operation('user', '{}')$q$, 'unauthorized', 'PT401');

reset role;
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);
select pg_temp.axp_expect($q$select public.axp_account_operation('ensureUser', '{}')$q$, null, '42501');
select pg_temp.axp_expect($q$select public.axp_account_identity()$q$, null, '42501');
select pg_temp.axp_expect($q$select * from public.axp_account_profiles$q$, null, '42501');
select pg_temp.axp_expect($q$select * from public.axp_account_orgs$q$, null, '42501');
select pg_temp.axp_expect($q$select * from public.axp_account_advertisers$q$, null, '42501');
select pg_temp.axp_expect($q$select * from public.axp_account_apps$q$, null, '42501');
select pg_temp.axp_expect($q$insert into public.axp_account_profiles(display_name) values ('anonymous')$q$, null, '42501');

reset role;
-- Exactly the two fixture identities were used. ROLLBACK also restores the
-- temporary confirmation change, and removes every fixture profile/org/app.
select pg_temp.axp_assert((select count(*) = 2 from auth.users where id in
  (select (value #>> '{}')::uuid from axp_account_acceptance_state where key in ('user_a','user_b'))), 'two synthetic users only');
rollback;
-- No COMMIT, cleanup DELETE or real-user mutation is permitted in this script.
